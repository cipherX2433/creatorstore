#!/usr/bin/env python3
import requests
import json
import uuid
import time
import sys

BASE_URL = "http://localhost:3000/api"

class TestEarningsLedger:
    def __init__(self):
        self.session_creator_a = requests.Session()
        self.session_creator_b = requests.Session()
        self.session_customer = requests.Session()
        self.creator_a_email = f"creator_ledger_a_{uuid.uuid4().hex[:6]}@test.com"
        self.creator_b_email = f"creator_ledger_b_{uuid.uuid4().hex[:6]}@test.com"
        self.customer_email = f"customer_ledger_{uuid.uuid4().hex[:6]}@test.com"
        self.product_a_id = None
        self.order_a_id = None
        self.passed_count = 0
        self.failed_count = 0

    def log(self, test_name, condition, extra_info=""):
        if condition:
            print(f"✅ PASS: {test_name} {extra_info}")
            self.passed_count += 1
        else:
            print(f"❌ FAIL: {test_name} {extra_info}")
            self.failed_count += 1

    def run_all(self):
        print("=" * 80)
        print("RUNNING CREATORZERO CREATOR EARNINGS LEDGER TEST SUITE (PHASE 2)")
        print("=" * 80)

        # 1. Setup Creator A and Creator B
        self.setup_creators()

        # 2. Test Initial Summary (Empty Ledger)
        self.test_initial_summary()

        # 3. Create Product & Execute Customer Purchase
        self.test_customer_purchase_and_ledger_creation()

        # 4. Verify Earnings Summary Calculations
        self.test_earnings_summary_calculations()

        # 5. Verify Paginated Earnings Ledger API
        self.test_earnings_ledger_api()

        # 6. Execute Refund & Verify Ledger Deduction
        self.test_refund_ledger_deduction()

        # 7. Verify Creator Isolation
        self.test_creator_isolation()

        print("=" * 80)
        print(f"EARNINGS LEDGER TEST SUITE SUMMARY: {self.passed_count} PASSED, {self.failed_count} FAILED")
        print("=" * 80)
        return self.failed_count == 0

    def setup_creators(self):
        # Signup Creator A
        res_a = self.session_creator_a.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_a_email,
            "password": "Password123!",
            "name": "Ledger Creator A"
        })
        self.session_creator_a.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Ledger Creator A",
            "phone": "+919876543210",
            "accountNumber": "98765432104521",
            "ifscCode": "SBIN0001234"
        })

        # Signup Creator B
        res_b = self.session_creator_b.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_b_email,
            "password": "Password123!",
            "name": "Ledger Creator B"
        })
        self.session_creator_b.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Ledger Creator B",
            "phone": "+919876543211",
            "accountNumber": "98765432104522",
            "ifscCode": "SBIN0001234"
        })

        # Create & Publish Product for Creator A (Price: ₹999)
        res_prod = self.session_creator_a.post(f"{BASE_URL}/products", json={
            "title": "Mastering System Design Ebook",
            "type": "DIGITAL_DOWNLOAD",
            "price": 999,
            "currency": "INR"
        })
        print("DEBUG RES_PROD:", res_prod.status_code, res_prod.text)
        prod_data = res_prod.json()
        self.product_a_id = prod_data.get("product", {}).get("id") or prod_data.get("id")

        self.session_creator_a.post(
            f"{BASE_URL}/products/{self.product_a_id}/file",
            files={"file": ("system_design.pdf", b"%PDF-1.4 Mock PDF Content", "application/pdf")}
        )
        self.session_creator_a.post(f"{BASE_URL}/products/{self.product_a_id}/publish")
        self.log("1. Creator Setup & Product Publication", bool(self.product_a_id))

    def test_initial_summary(self):
        res = self.session_creator_a.get(f"{BASE_URL}/earnings/summary")
        data = res.json()
        valid = (
            res.status_code == 200 and
            data.get("totalSales") == 0 and
            data.get("netCreatorEarnings") == 0 and
            data.get("totalRefunds") == 0
        )
        self.log("2. Initial Summary Zero Balances", valid, f"(Summary: {data})")

    def test_customer_purchase_and_ledger_creation(self):
        # Create Order
        res_order = self.session_customer.post(f"{BASE_URL}/payments/create-order", json={
            "productId": self.product_a_id,
            "customerEmail": self.customer_email
        })
        order_data = res_order.json()
        self.order_a_id = order_data.get("orderId")
        rzp_order_id = order_data.get("razorpayOrderId")

        # Verify Payment (Triggers Order Finalization & Ledger Entry)
        res_verify = self.session_customer.post(f"{BASE_URL}/payments/verify", json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": f"pay_ledger_{uuid.uuid4().hex[:8]}",
            "razorpay_signature": "simulated_sig"
        })

        valid = (res_verify.status_code == 200 and res_verify.json().get("success") is True)
        self.log("3. Customer Purchase & Verification", valid)

    def test_earnings_summary_calculations(self):
        res = self.session_creator_a.get(f"{BASE_URL}/earnings/summary")
        data = res.json()
        valid = (
            res.status_code == 200 and
            data.get("totalSales") == 999 and
            data.get("netCreatorEarnings") == 999 and
            data.get("totalPlatformFees") == 0 and
            data.get("availableEarnings") == 999
        )
        self.log("4. Earnings Summary Calculation (100% Net Earnings)", valid, f"(Summary: {data})")

    def test_earnings_ledger_api(self):
        res = self.session_creator_a.get(f"{BASE_URL}/earnings/ledger")
        data = res.json()
        items = data.get("items") or data
        has_sale_entry = any(
            item.get("type") == "SALE" and item.get("grossAmount") == 999 and item.get("netAmount") == 999
            for item in items
        )
        self.log("5. Earnings Ledger API Listing", res.status_code == 200 and has_sale_entry, f"(Count: {len(items)})")

    def test_refund_ledger_deduction(self):
        # Refund Order
        res_refund = self.session_creator_a.post(f"{BASE_URL}/refunds", json={
            "orderId": self.order_a_id,
            "amount": 999,
            "reason": "Customer requested cancellation"
        })
        refund_success = (res_refund.status_code == 200 and res_refund.json().get("success") is True)

        # Check Updated Summary
        res_sum = self.session_creator_a.get(f"{BASE_URL}/earnings/summary")
        sum_data = res_sum.json()

        # Check Ledger Table for Refund Entry
        res_ledger = self.session_creator_a.get(f"{BASE_URL}/earnings/ledger")
        ledger_items = res_ledger.json().get("items") or res_ledger.json()

        has_refund_entry = any(item.get("type") == "REFUND" and item.get("refundAmount") == 999 for item in ledger_items)

        valid = (
            refund_success and
            sum_data.get("totalRefunds") == 999 and
            sum_data.get("netCreatorEarnings") == 0 and
            sum_data.get("availableEarnings") == 0 and
            has_refund_entry
        )
        self.log("6. Refund Execution & Net Balance Deduction", valid, f"(Updated Summary: {sum_data})")

    def test_creator_isolation(self):
        # Creator B queries earnings summary and ledger
        res_sum_b = self.session_creator_b.get(f"{BASE_URL}/earnings/summary")
        res_led_b = self.session_creator_b.get(f"{BASE_URL}/earnings/ledger")

        sum_b = res_sum_b.json()
        led_b = res_led_b.json().get("items") if isinstance(res_led_b.json(), dict) else res_led_b.json()
        print("DEBUG TEST 7:", res_sum_b.status_code, sum_b, res_led_b.status_code, led_b)

        valid = (
            res_sum_b.status_code == 200 and
            sum_b.get("totalSales") == 0 and
            sum_b.get("netCreatorEarnings") == 0 and
            len(led_b) == 0
        )
        self.log("7. Creator Earnings Isolation (Creator B has zero entries)", valid)

if __name__ == "__main__":
    tester = TestEarningsLedger()
    success = tester.run_all()
    sys.exit(0 if success else 1)
