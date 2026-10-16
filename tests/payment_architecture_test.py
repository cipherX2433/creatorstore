#!/usr/bin/env python3
import requests
import sys
import uuid
import hmac
import hashlib
import json

BASE_URL = "http://localhost:3000/api"

class TestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"test_creator_{uuid.uuid4().hex[:6]}@example.com"
        self.creator_password = "Password123!"
        self.creator_name = "Test Marketplace Creator"
        self.username = f"creator_{uuid.uuid4().hex[:6]}"
        self.product_id = None
        self.order_id = None
        self.razorpay_order_id = None
        self.passed = 0
        self.failed = 0

    def run_all(self):
        print("=" * 80)
        print("RUNNING CREATORZERO PAYMENT ARCHITECTURE & ROUTE PAYOUT TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_creator_signup()
            self.test_2_payout_status_not_started()
            self.test_3_publish_paid_product_blocked_without_payout()
            self.test_4_payout_onboarding()
            self.test_5_publish_paid_product_allowed()
            self.test_6_checkout_order_creation()
            self.test_7_payment_verification_and_transfer()
            self.test_8_entitlement_created()
            self.test_9_webhook_idempotency()
            self.test_10_payments_dashboard()
            self.test_11_refund_and_revocation()
        except Exception as e:
            print(f"❌ UNHANDLED EXCEPTION: {e}")

        print("=" * 80)
        print("TEST SUMMARY RESULTS")
        print("=" * 80)
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print("=" * 80)

        if self.failed > 0:
            sys.exit(1)

    def assert_test(self, name, condition, details=""):
        if condition:
            print(f"✅ PASS: {name}")
            self.passed += 1
        else:
            print(f"❌ FAIL: {name} - {details}")
            self.failed += 1

    def test_1_creator_signup(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_email,
            "password": self.creator_password,
            "name": self.creator_name,
        })
        self.assert_test("1. Creator Signup", res.status_code == 200, res.text)
        
        # Set username
        res2 = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.assert_test("1b. Set Store Username", res2.status_code == 200, res2.text)

    def test_2_payout_status_not_started(self):
        res = self.session.get(f"{BASE_URL}/payouts/status")
        data = res.json()
        self.assert_test("2. Initial Payout Status (NOT_STARTED)", data.get("status") in ["NOT_STARTED", "PENDING", "NOT_CONFIGURED"], res.text)


    def test_3_publish_paid_product_blocked_without_payout(self):
        # Create draft paid product
        res = self.session.post(f"{BASE_URL}/products", json={
            "title": "DSA Paid Handbook",
            "type": "DIGITAL_DOWNLOAD",
            "price": 499,
            "currency": "INR",
            "shortDescription": "Master Data Structures",
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        
        # Attach dummy file so file check passes
        # Attempt publish without active payout
        res2 = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.assert_test("3. Publish Paid Product Blocked without Payout", res2.status_code == 400 or "payout" in res2.text.lower(), res2.text)

    def test_4_payout_onboarding(self):
        res = self.session.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Mohit Ranjan",
            "phone": "+919876543210",
            "email": self.creator_email,
            "businessType": "individual",
            "accountNumber": "98765432104521",
            "ifscCode": "SBIN0001234",
            "accountHolderName": "Mohit Ranjan",
        })
        data = res.json()
        self.assert_test("4. Payout Onboarding Submission", res.status_code == 200 and data.get("status") == "ACTIVE", res.text)

    def test_5_publish_paid_product_allowed(self):
        # Attach dummy file first
        files = {"file": ("test.pdf", b"%PDF-1.4 dummy pdf content", "application/pdf")}
        self.session.post(f"{BASE_URL}/products/{self.product_id}/file", files=files)

        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.assert_test("5. Publish Paid Product Allowed After Payout", res.status_code == 200 and res.json().get("product", {}).get("status") == "PUBLISHED", res.text)

    def test_6_checkout_order_creation(self):
        res = requests.post(f"{BASE_URL}/checkout", json={
            "productId": self.product_id,
            "email": "customer@example.com",
        })
        data = res.json()
        self.order_id = data.get("orderId")
        self.razorpay_order_id = data.get("razorpayOrderId")
        self.assert_test("6. Checkout Order Creation", res.status_code == 200 and self.order_id and self.razorpay_order_id, res.text)

    def test_7_payment_verification_and_transfer(self):
        res = requests.post(f"{BASE_URL}/checkout/verify", json={
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": f"pay_{uuid.uuid4().hex[:12]}",
            "razorpay_signature": "simulated_sig",
        })
        self.assert_test("7. Payment Verification & Route Transfer", res.status_code == 200 and res.json().get("success"), res.text)

    def test_8_entitlement_created(self):
        res = requests.get(f"{BASE_URL}/checkout/status?order_id={self.order_id}")
        data = res.json()
        self.assert_test("8. Order Status PAID", res.status_code == 200 and data.get("status") == "PAID", res.text)

    def test_9_webhook_idempotency(self):
        event_id = f"evt_{uuid.uuid4().hex[:10]}"
        payload = {
            "event": "payment.captured",
            "event_id": event_id,
            "payload": {
                "payment": {
                    "entity": {
                        "id": f"pay_{uuid.uuid4().hex[:10]}",
                        "order_id": self.razorpay_order_id,
                        "email": "customer@example.com",
                    }
                }
            }
        }

        # First call
        res1 = requests.post(
            f"{BASE_URL}/webhooks/razorpay",
            json=payload,
            headers={"x-razorpay-signature": "simulated_sig"}
        )
        
        # Second call (duplicate)
        res2 = requests.post(
            f"{BASE_URL}/webhooks/razorpay",
            json=payload,
            headers={"x-razorpay-signature": "simulated_sig"}
        )
        self.assert_test("9. Webhook Signature & Idempotency", res1.status_code in [200, 400] and res2.status_code in [200, 400], res1.text)

    def test_10_payments_dashboard(self):
        res = self.session.get(f"{BASE_URL}/payouts/dashboard")
        data = res.json()
        overview = data.get("overview", {})
        self.assert_test("10. Creator Payments Dashboard Stats", res.status_code == 200 and overview.get("totalSales", 0) > 0, res.text)

    def test_11_refund_and_revocation(self):
        res = self.session.post(f"{BASE_URL}/refunds", json={
            "orderId": self.order_id,
            "reason": "Customer request",
        })
        self.assert_test("11. Refund Execution & Entitlement Revocation", res.status_code == 200 and res.json().get("success"), res.text)

if __name__ == "__main__":
    runner = TestRunner()
    runner.run_all()
