#!/usr/bin/env python3
import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

class LimitedQuantityTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_lq_{uuid.uuid4().hex[:6]}@example.com"
        self.password = "Password123!"
        self.username = f"lq_store_{uuid.uuid4().hex[:6]}"
        self.product_id = None
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
        print("RUNNING LIMITED QUANTITY OFFERS TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_creator()
            self.test_2_create_limited_quantity_product()
            self.test_3_publish_product()
            self.test_4_public_product_quantity_display()
            self.test_5_purchase_first_slot()
            self.test_6_purchase_second_slot()
            self.test_7_purchase_final_slot_reaches_sold_out()
            self.test_8_excess_purchase_attempt_blocked()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING TEST EXECUTION: {e}")
            import traceback
            traceback.print_exc()

        print("\n" + "=" * 80)
        print(f"LIMITED QUANTITY TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_creator(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={"email": self.creator_email, "password": self.password, "name": "Limited Master"})
        self.log("Signup Creator", res.status_code == 200)
        res = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)
        self.session.post(f"{BASE_URL}/payouts/onboard", json={"legalName": "Limited Master", "businessType": "INDIVIDUAL", "accountNumber": "1001", "ifscCode": "HDFC0001234"})

    def test_2_create_limited_quantity_product(self):
        # Create product with quantityLimit = 3
        res = self.session.post(f"{BASE_URL}/products", json={
            "type": "DIGITAL_DOWNLOAD",
            "title": "VIP Masterclass Pass (Only 3 Seats)",
            "shortDescription": "Exclusive access pass",
            "price": 0,
            "currency": "inr",
            "isLimitedQuantity": True,
            "quantityLimit": 3
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        self.log("Create Limited Quantity Product (Limit: 3)", res.status_code == 201 and self.product_id is not None)

    def test_3_publish_product(self):
        # Upload mock binary file for download product
        self.session.post(f"{BASE_URL}/products/{self.product_id}/file", files={"file": ("pass.pdf", b"VIP PASS FILE", "application/pdf")})
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Product", res.status_code == 200)

    def test_4_public_product_quantity_display(self):
        res = requests.get(f"{BASE_URL}/checkout/product?productId={self.product_id}")
        data = res.json().get("product", {})
        self.log("Public Product Displays Quantity Metrics", (
            res.status_code == 200 and
            data.get("isLimitedQuantity") == True and
            data.get("quantityLimit") == 3 and
            data.get("quantityRemaining") == 3 and
            data.get("soldOut") == False
        ))

    def test_5_purchase_first_slot(self):
        res = requests.post(f"{BASE_URL}/checkout/process", json={
            "productId": self.product_id,
            "email": f"cust1_{uuid.uuid4().hex[:4]}@example.com"
        })
        self.log("Purchase First Slot (1/3)", res.status_code in [200, 201])

    def test_6_purchase_second_slot(self):
        res = requests.post(f"{BASE_URL}/checkout/process", json={
            "productId": self.product_id,
            "email": f"cust2_{uuid.uuid4().hex[:4]}@example.com"
        })
        self.log("Purchase Second Slot (2/3)", res.status_code in [200, 201])

        # Verify remaining is now 1
        check = requests.get(f"{BASE_URL}/checkout/product?productId={self.product_id}")
        self.log("Quantity Remaining Updated to 1", check.json().get("product", {}).get("quantityRemaining") == 1)

    def test_7_purchase_final_slot_reaches_sold_out(self):
        res = requests.post(f"{BASE_URL}/checkout/process", json={
            "productId": self.product_id,
            "email": f"cust3_{uuid.uuid4().hex[:4]}@example.com"
        })
        self.log("Purchase Final Slot (3/3)", res.status_code in [200, 201])

        # Verify status is now SOLD OUT
        check = requests.get(f"{BASE_URL}/checkout/product?productId={self.product_id}")
        data = check.json().get("product", {})
        self.log("Product Transitions to SOLD OUT", data.get("soldOut") == True and data.get("quantityRemaining") == 0)

    def test_8_excess_purchase_attempt_blocked(self):
        res = requests.post(f"{BASE_URL}/checkout/process", json={
            "productId": self.product_id,
            "email": f"cust_excess_{uuid.uuid4().hex[:4]}@example.com"
        })
        self.log("Excess Purchase Attempt Blocked with 409 Conflict", res.status_code == 409, f"Response: {res.text}")

if __name__ == "__main__":
    runner = LimitedQuantityTestRunner()
    runner.run_all()
