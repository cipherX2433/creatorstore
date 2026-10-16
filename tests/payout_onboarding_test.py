#!/usr/bin/env python3
import requests
import json
import uuid
import time
import sys

BASE_URL = "http://localhost:3000/api"

class TestPayoutOnboarding:
    def __init__(self):
        self.session_creator_a = requests.Session()
        self.session_creator_b = requests.Session()
        self.session_customer = requests.Session()
        self.creator_a_email = f"payout_a_{uuid.uuid4().hex[:6]}@test.com"
        self.creator_b_email = f"payout_b_{uuid.uuid4().hex[:6]}@test.com"
        self.customer_email = f"customer_payout_{uuid.uuid4().hex[:6]}@test.com"
        self.rzp_account_a_id = None
        self.product_id = None
        self.order_id = None
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
        print("RUNNING CREATORZERO PAYOUT ONBOARDING & ROUTE TEST SUITE (PHASE 3)")
        print("=" * 80)

        # 1. Creator Signup
        self.setup_creators()

        # 2. Test Payout Onboarding Submission & Linked Account Creation
        self.test_onboard_submission()

        # 3. Test Idempotency (Re-onboarding reuses same linked account)
        self.test_idempotent_onboarding()

        # 4. Test Resume Onboarding API
        self.test_resume_onboarding()

        # 5. Test Masked Bank Details Security
        self.test_masked_bank_details()

        # 6. Test Creator Isolation (Creator B cannot access Creator A's payout account)
        self.test_creator_isolation()

        # 7. Test Webhook Account Status Synchronization
        self.test_webhook_status_sync()

        # 8. Test Feature-Flagged Withdraw Protection
        self.test_withdraw_feature_flag()

        # 9. Test Admin Payout Accounts Listing
        self.test_admin_payout_accounts()

        # 10. Test Integration with Customer Purchase & Earnings Ledger
        self.test_customer_purchase_and_ledger()

        print("=" * 80)
        print(f"PHASE 3 PAYOUT TEST SUITE SUMMARY: {self.passed_count} PASSED, {self.failed_count} FAILED")
        print("=" * 80)
        return self.failed_count == 0

    def setup_creators(self):
        res_a = self.session_creator_a.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_a_email,
            "password": "Password123!",
            "name": "Phase 3 Creator A"
        })
        res_b = self.session_creator_b.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_b_email,
            "password": "Password123!",
            "name": "Phase 3 Creator B"
        })
        self.log("1. Creator Signup (A & B)", res_a.status_code == 200 and res_b.status_code == 200)

    def test_onboard_submission(self):
        res = self.session_creator_a.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Mohit Ranjan Technologies",
            "accountHolderName": "Mohit Ranjan",
            "email": self.creator_a_email,
            "phone": "+919876543210",
            "businessType": "individual",
            "accountNumber": "98765432104821",
            "ifscCode": "SBIN0001234",
            "step": 4
        })
        data = res.json()
        self.rzp_account_a_id = data.get("razorpayAccountId")
        valid = (
            res.status_code == 200 and
            data.get("success") is True and
            bool(self.rzp_account_a_id) and
            data.get("bankLast4") == "4821" and
            "••••" in data.get("bankIfscMasked", "")
        )
        self.log("2. Payout Onboarding Submission & Linked Account Generation", valid, f"(Account ID: {self.rzp_account_a_id})")

    def test_idempotent_onboarding(self):
        res = self.session_creator_a.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Mohit Ranjan Technologies Updated",
            "businessType": "individual",
            "accountNumber": "98765432104821",
            "ifscCode": "SBIN0001234"
        })
        data = res.json()
        second_acc_id = data.get("razorpayAccountId")
        valid = (res.status_code == 200 and second_acc_id == self.rzp_account_a_id)
        self.log("3. Idempotent Onboarding (Reuses Linked Account)", valid, f"(Original: {self.rzp_account_a_id}, Second: {second_acc_id})")

    def test_resume_onboarding(self):
        res = self.session_creator_a.get(f"{BASE_URL}/payouts/resume")
        data = res.json()
        profile = data.get("profile") or {}
        valid = (
            res.status_code == 200 and
            data.get("currentStep") == 4 and
            profile.get("legalName") == "Mohit Ranjan Technologies Updated" and
            profile.get("bankLast4") == "4821"
        )
        self.log("4. Resume Onboarding API State", valid)

    def test_masked_bank_details(self):
        res = self.session_creator_a.get(f"{BASE_URL}/payouts/status")
        data = res.json()
        valid = (
            res.status_code == 200 and
            data.get("bankLast4") == "4821" and
            "••••" in data.get("bankIfscMasked", "") and
            "98765432104821" not in json.dumps(data) # Full account number MUST NEVER be exposed
        )
        self.log("5. Masked Bank Credentials Security", valid)

    def test_creator_isolation(self):
        res_b_status = self.session_creator_b.get(f"{BASE_URL}/payouts/status")
        data_b = res_b_status.json()

        # Creator B attempts to resume - should have NOT_STARTED state
        res_b_resume = self.session_creator_b.get(f"{BASE_URL}/payouts/resume")
        resume_b = res_b_resume.json()

        valid = (
            res_b_status.status_code == 200 and
            data_b.get("razorpayAccountId") != self.rzp_account_a_id and
            resume_b.get("status") == "NOT_STARTED"
        )
        self.log("6. Creator Ownership Isolation (Creator B has distinct state)", valid)

    def test_webhook_status_sync(self):
        webhook_payload = {
            "entity": "event",
            "account_id": self.rzp_account_a_id,
            "event": "account.activated",
            "contains": ["account"],
            "payload": {
                "account": {
                    "entity": {
                        "id": self.rzp_account_a_id,
                        "status": "activated"
                    }
                }
            }
        }
        res = self.session_customer.post(
            f"{BASE_URL}/payments/webhook",
            data=json.dumps(webhook_payload),
            headers={"Content-Type": "application/json", "x-razorpay-signature": "valid"}
        )

        res_status = self.session_creator_a.get(f"{BASE_URL}/payouts/status")
        data_status = res_status.json()

        valid = (
            res.status_code == 200 and
            data_status.get("status") == "ACTIVE" and
            data_status.get("verificationStatus") == "VERIFIED"
        )
        self.log("7. Razorpay Route Webhook Status Synchronization", valid, f"(Status: {data_status.get('status')})")

    def test_withdraw_feature_flag(self):
        res = self.session_creator_a.post(f"{BASE_URL}/payouts/withdraw", json={"amount": 500})
        data = res.json()
        valid = (
            res.status_code == 200 and
            data.get("enabled") is False and
            "Phase 3" in data.get("message", "")
        )
        self.log("8. Feature-Flagged Withdraw Protection", valid, f"(Message: {data.get('message')})")

    def test_admin_payout_accounts(self):
        res = self.session_creator_a.get(f"{BASE_URL}/admin/payouts")
        data = res.json()
        accounts = data if isinstance(data, list) else data.get("accounts", [])
        has_a = any(acc.get("razorpayAccountId") == self.rzp_account_a_id for acc in accounts)
        valid = (res.status_code == 200 and has_a)
        self.log("9. Admin Creator Payout Accounts Listing", valid, f"(Total Accounts: {len(accounts)})")

    def test_customer_purchase_and_ledger(self):
        # Create product
        res_prod = self.session_creator_a.post(f"{BASE_URL}/products", json={
            "title": "React Performance Handbook",
            "type": "DIGITAL_DOWNLOAD",
            "price": 1499,
            "currency": "INR"
        })
        prod_data = res_prod.json()
        self.product_id = prod_data.get("product", {}).get("id") or prod_data.get("id")

        self.session_creator_a.post(
            f"{BASE_URL}/products/{self.product_id}/file",
            files={"file": ("react.pdf", b"%PDF-1.4 Mock PDF Content", "application/pdf")}
        )
        self.session_creator_a.post(f"{BASE_URL}/products/{self.product_id}/publish")

        # Purchase
        res_order = self.session_customer.post(f"{BASE_URL}/payments/create-order", json={
            "productId": self.product_id,
            "customerEmail": self.customer_email
        })
        order_data = res_order.json()
        self.order_id = order_data.get("orderId")

        res_verify = self.session_customer.post(f"{BASE_URL}/payments/verify", json={
            "razorpay_order_id": order_data.get("razorpayOrderId"),
            "razorpay_payment_id": f"pay_phase3_{uuid.uuid4().hex[:8]}",
            "razorpay_signature": "simulated_sig"
        })

        # Check Ledger Summary
        res_summary = self.session_creator_a.get(f"{BASE_URL}/earnings/summary")
        summary_data = res_summary.json()

        valid = (
            res_verify.status_code == 200 and
            summary_data.get("totalSales") == 1499 and
            summary_data.get("netCreatorEarnings") == 1499
        )
        self.log("10. Integration with Customer Purchase & Earnings Ledger", valid, f"(Summary: {summary_data})")

if __name__ == "__main__":
    tester = TestPayoutOnboarding()
    success = tester.run_all()
    sys.exit(0 if success else 1)
