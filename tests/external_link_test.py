#!/usr/bin/env python3
import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

class ExternalLinkTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_ext_{uuid.uuid4().hex[:6]}@example.com"
        self.creator_password = "Password123!"
        self.customer_email_free = f"cust_ext_free_{uuid.uuid4().hex[:6]}@example.com"
        self.customer_email_paid = f"cust_ext_paid_{uuid.uuid4().hex[:6]}@example.com"
        self.username = f"ext_store_{uuid.uuid4().hex[:6]}"
        self.product_id = None
        self.order_id = None
        self.razorpay_order_id = None
        self.passed = 0
        self.failed = 0

    def log(self, test_name, success, message=""):
        if success:
            self.passed += 1
            print(f"  ✓ {test_name}: PASSED {message}")
        else:
            self.failed += 1
            print(f"  ✗ {test_name}: FAILED - {message}")

    def run_all(self):
        print("=" * 80)
        print("RUNNING CREATORZERO EXTERNAL LINK (LINK TO ANYWHERE) TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_creator()
            self.test_2_create_external_link_product()
            self.test_3_publish_blocked_without_destination_url()
            self.test_4_url_security_protocol_validation()
            self.test_5_save_external_link_config()
            self.test_6_publish_external_link_product()
            self.test_7_public_landing_metadata_security()
            self.test_8_free_external_link_access()
            self.test_9_paid_external_link_checkout_and_payment()
            self.test_10_secure_access_endpoint_authorization()
            self.test_11_update_destination_url()
            self.test_12_customer_purchases_list()
            self.test_13_creator_analytics()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING SUITE EXECUTION: {e}")

        print("\n" + "=" * 80)
        print(f"EXTERNAL LINK TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_creator(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_email,
            "password": self.creator_password,
            "name": "External Link Creator"
        })
        self.log("Signup Creator", res.status_code == 200)

        res = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)

        res = self.session.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "External Link Creator",
            "businessType": "INDIVIDUAL",
            "accountNumber": "98765432101",
            "ifscCode": "HDFC0001234"
        })
        self.log("Onboard Payouts", res.status_code == 200)

    def test_2_create_external_link_product(self):
        res = self.session.post(f"{BASE_URL}/products", json={
            "type": "EXTERNAL_LINK",
            "title": "YouTube Masterclass",
            "shortDescription": "Complete 3-hour YouTube growth masterclass",
            "price": 299,
            "currency": "inr"
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        self.log("Create External Link Product", res.status_code == 201 and self.product_id is not None, f"ID: {self.product_id}")

    def test_3_publish_blocked_without_destination_url(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Blocked Without Valid Destination URL", res.status_code == 400)

    def test_4_url_security_protocol_validation(self):
        # 1. Test javascript: protocol rejection
        res_js = self.session.post(f"{BASE_URL}/external-link/config/{self.product_id}", json={
            "name": "Malicious Link",
            "price": 299,
            "destinationUrl": "javascript:alert('xss')"
        })
        # 2. Test data: protocol rejection
        res_data = self.session.post(f"{BASE_URL}/external-link/config/{self.product_id}", json={
            "name": "Malicious Link",
            "price": 299,
            "destinationUrl": "data:text/html,<script>alert(1)</script>"
        })
        # 3. Test file: protocol rejection
        res_file = self.session.post(f"{BASE_URL}/external-link/config/{self.product_id}", json={
            "name": "Malicious Link",
            "price": 299,
            "destinationUrl": "file:///etc/passwd"
        })

        success = (res_js.status_code == 400 and res_data.status_code == 400 and res_file.status_code == 400)
        self.log("URL Security Protocol Validation (rejection of javascript:, data:, file:)", success)

    def test_5_save_external_link_config(self):
        res = self.session.post(f"{BASE_URL}/external-link/config/{self.product_id}", json={
            "name": "YouTube Masterclass",
            "shortDescription": "Watch our private 3-hour growth masterclass hosted on YouTube.",
            "description": "Learn how to build, launch, and grow a successful YouTube channel.",
            "category": "Education",
            "tags": ["YouTube", "Growth"],
            "coverImage": "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7",
            "price": 299,
            "currency": "inr",
            "isFree": False,
            "destinationUrl": "youtube.com/watch?v=masterclass123", # Protocol normalization test
            "destinationType": "YOUTUBE",
            "accessInstructions": "Click Open Link to launch YouTube.",
            "status": "DRAFT"
        })
        config = res.json().get("config", {})
        # Verify URL normalization prepended https://
        normalized_url = config.get("destinationUrl")
        self.log("Save External Link Config & Protocol Normalization", res.status_code == 200 and normalized_url == "https://youtube.com/watch?v=masterclass123")

    def test_6_publish_external_link_product(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish External Link Product", res.status_code == 200)

    def test_7_public_landing_metadata_security(self):
        res = requests.get(f"{BASE_URL}/external-link/public/{self.product_id}")
        data = res.json()
        config = data.get("config", {})
        # Verify protected destinationUrl is NOT leaked on public API response for paid link
        leaked = "destinationUrl" in config and config["destinationUrl"] is not None
        self.log("Public Metadata Security (Protected destinationUrl NOT leaked on public endpoint)", res.status_code == 200 and not leaked)

    def test_8_free_external_link_access(self):
        # Create a free external link product
        res_p = self.session.post(f"{BASE_URL}/products", json={"type": "EXTERNAL_LINK", "title": "Free Notion Template", "price": 0})
        free_id = res_p.json().get("product", {}).get("id")
        self.session.post(f"{BASE_URL}/external-link/config/{free_id}", json={
            "name": "Free Notion Template",
            "price": 0,
            "isFree": True,
            "destinationUrl": "https://notion.so/template123",
            "destinationType": "NOTION"
        })
        self.session.post(f"{BASE_URL}/products/{free_id}/publish")

        # Submit free access
        res_free = requests.post(f"{BASE_URL}/external-link/access-free", json={
            "productId": free_id,
            "name": "Free Customer",
            "email": self.customer_email_free
        })
        data = res_free.json()
        self.log("Free External Link Access Registration", res_free.status_code == 200 and data.get("authorized") == True and data.get("destinationUrl") == "https://notion.so/template123")

    def test_9_paid_external_link_checkout_and_payment(self):
        res = requests.post(f"{BASE_URL}/checkout", json={
            "productId": self.product_id,
            "email": self.customer_email_paid
        })
        data = res.json()
        self.order_id = data.get("orderId")
        self.razorpay_order_id = data.get("razorpayOrderId")

        # Verify payment
        res_ver = requests.post(f"{BASE_URL}/checkout/verify", json={
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": f"pay_ext_{uuid.uuid4().hex[:6]}",
            "razorpay_signature": "mock_signature"
        })
        self.log("Paid External Link Checkout & Payment Verification", res_ver.status_code == 200 and res_ver.json().get("success") == True)

    def test_10_secure_access_endpoint_authorization(self):
        # 1. Non-purchaser access attempt -> 403 Forbidden
        res_unauth = requests.get(f"{BASE_URL}/external-link/access/{self.product_id}?email=unauth_{uuid.uuid4().hex[:4]}@example.com")
        # 2. Purchaser access attempt -> 200 OK & destinationUrl returned
        res_auth = requests.get(f"{BASE_URL}/external-link/access/{self.product_id}?email={self.customer_email_paid}")
        data_auth = res_auth.json()

        success = (res_unauth.status_code == 403 and res_auth.status_code == 200 and data_auth.get("authorized") == True and data_auth.get("destinationUrl") == "https://youtube.com/watch?v=masterclass123")
        self.log("Secure Access Endpoint Authorization (403 for non-purchasers, 200 OK + URL for purchasers)", success)

    def test_11_update_destination_url(self):
        # Update destination URL to a new link
        res_update = self.session.post(f"{BASE_URL}/external-link/config/{self.product_id}", json={
            "name": "YouTube Masterclass Updated",
            "destinationUrl": "https://youtube.com/watch?v=updated456"
        })
        # Verify existing purchaser gets the new destination URL automatically
        res_access = requests.get(f"{BASE_URL}/external-link/access/{self.product_id}?email={self.customer_email_paid}")
        data_access = res_access.json()

        success = (res_update.status_code == 200 and res_access.status_code == 200 and data_access.get("destinationUrl") == "https://youtube.com/watch?v=updated456")
        self.log("Update Destination URL & Automatic Purchaser Access Sync", success)

    def test_12_customer_purchases_list(self):
        res = requests.get(f"{BASE_URL}/external-link/student/purchases?email={self.customer_email_paid}")
        items = res.json().get("items", [])
        self.log("Customer External Links Purchases List Endpoint", res.status_code == 200 and len(items) >= 1)

    def test_13_creator_analytics(self):
        res = self.session.get(f"{BASE_URL}/external-link/creator/analytics")
        data = res.json()
        self.log("Creator External Links Analytics Calculation", res.status_code == 200 and data.get("totalProducts") >= 1 and data.get("totalPurchases") >= 1 and data.get("totalLinkOpens") >= 1)

if __name__ == "__main__":
    runner = ExternalLinkTestRunner()
    runner.run_all()
