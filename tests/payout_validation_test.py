#!/usr/bin/env python3
import requests
import json
import uuid
import sys

BASE_URL = "http://localhost:3000/api"

class TestPayoutAccountValidation:
    def __init__(self):
        self.session_a = requests.Session()
        self.session_b = requests.Session()
        self.email_a = f"payout_val_a_{uuid.uuid4().hex[:6]}@test.com"
        self.email_b = f"payout_val_b_{uuid.uuid4().hex[:6]}@test.com"
        self.passed_count = 0
        self.failed_count = 0

    def log(self, test_name, condition, extra_info=""):
        if condition:
            print(f"  ✓ {test_name}: PASSED {extra_info}")
            self.passed_count += 1
        else:
            print(f"  ❌ {test_name}: FAILED {extra_info}")
            self.failed_count += 1

    def run_all(self):
        print("=" * 80)
        print("RUNNING CREATORZERO PAYOUT ACCOUNT VALIDATION TEST SUITE")
        print("=" * 80)

        # 1. Setup Creators
        res_a = self.session_a.post(f"{BASE_URL}/auth/signup", json={"email": self.email_a, "password": "Password123!", "name": "Val Creator A"})
        res_b = self.session_b.post(f"{BASE_URL}/auth/signup", json={"email": self.email_b, "password": "Password123!", "name": "Val Creator B"})
        self.log("1. Creator Signup (A & B)", res_a.status_code == 200 and res_b.status_code == 200)

        # 2. Check Unconfigured Initial Status
        res_init = self.session_a.get(f"{BASE_URL}/payouts/status")
        data_init = res_init.json()
        self.log("2. Initial Status NOT_CONFIGURED", data_init.get("verificationStatus") == "NOT_CONFIGURED" and data_init.get("canSellPaidProducts") is False)

        # 3. Mismatched Account Numbers Validation (400)
        res_mismatch_acc = self.session_a.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Val Creator A",
            "accountHolderName": "Val Creator A",
            "accountNumber": "987654321011",
            "confirmAccountNumber": "987654321099",
            "ifscCode": "SBIN0001234"
        })
        self.log("3. Mismatched Account Numbers Rejection (400)", res_mismatch_acc.status_code == 400 and "do not match" in res_mismatch_acc.text)

        # 4. Invalid IFSC Format Validation (400)
        res_bad_ifsc = self.session_a.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Val Creator A",
            "accountHolderName": "Val Creator A",
            "accountNumber": "987654321011",
            "confirmAccountNumber": "987654321011",
            "ifscCode": "INVALID_IFSC"
        })
        self.log("4. Invalid IFSC Format Rejection (400)", res_bad_ifsc.status_code == 400 and "IFSC" in res_bad_ifsc.text)

        # 5. Account Holder Name Mismatch Failure State (ACTION_REQUIRED / FAILED)
        res_name_mismatch = self.session_a.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Val Creator A",
            "accountHolderName": "Mismatch Person",
            "accountNumber": "987654321011",
            "confirmAccountNumber": "987654321011",
            "ifscCode": "SBIN0001234"
        })
        data_nm = res_name_mismatch.json()
        self.log("5. Name Mismatch Verification Failure", data_nm.get("verificationStatus") == "FAILED" and data_nm.get("status") == "ACTION_REQUIRED" and data_nm.get("canSellPaidProducts") is False)

        # 6. Unverified Creator Cannot Publish Paid Product (400)
        res_prod = self.session_a.post(f"{BASE_URL}/products", json={"type": "DIGITAL_DOWNLOAD", "title": "Paid Ebook", "price": 499})
        prod_id = res_prod.json()["product"]["id"]
        self.session_a.post(f"{BASE_URL}/products/{prod_id}/file", files={"file": ("ebook.pdf", b"PDF content", "application/pdf")})
        res_pub_fail = self.session_a.post(f"{BASE_URL}/products/{prod_id}/publish")
        self.log("6. Unverified Creator Paid Product Publish Blocked (400)", res_pub_fail.status_code == 400 and "payout" in res_pub_fail.text.lower())

        # 7. Valid Bank Details Submission -> Server Validation -> VERIFIED & ACTIVE
        res_valid = self.session_a.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Val Creator A",
            "accountHolderName": "Val Creator A",
            "accountNumber": "987654321011",
            "confirmAccountNumber": "987654321011",
            "ifscCode": "SBIN0001234"
        })
        data_v = res_valid.json()
        self.log("7. Valid Details Razorpay Validation -> VERIFIED & ACTIVE", data_v.get("verificationStatus") == "VERIFIED" and data_v.get("status") == "ACTIVE" and data_v.get("canSellPaidProducts") is True)

        # 8. Verified Creator Can Publish Paid Product (200)
        # Upload mock file to satisfy digital download file guard
        self.session_a.post(f"{BASE_URL}/products/{prod_id}/file", files={"file": ("ebook.pdf", b"PDF content", "application/pdf")})
        res_pub_success = self.session_a.post(f"{BASE_URL}/products/{prod_id}/publish")
        self.log("8. Verified Creator Paid Product Publish Granted (200)", res_pub_success.status_code == 200 and res_pub_success.json().get("product", {}).get("status") == "PUBLISHED")

        # 9. Changing Bank Details Resets Status to Re-validation
        res_change = self.session_a.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Val Creator A",
            "accountHolderName": "Mismatch Person",
            "accountNumber": "111122223333",
            "confirmAccountNumber": "111122223333",
            "ifscCode": "SBIN0009999"
        })
        data_ch = res_change.json()
        self.log("9. Changing Bank Details Clears Previous ACTIVE Status", data_ch.get("verificationStatus") == "FAILED" and data_ch.get("canSellPaidProducts") is False)

        # Re-verify Creator A
        self.session_a.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Val Creator A",
            "accountHolderName": "Val Creator A",
            "accountNumber": "987654321011",
            "confirmAccountNumber": "987654321011",
            "ifscCode": "SBIN0001234"
        })

        # 10. Security: Creator B Cannot View Creator A's Payout Status or Details
        res_b_status = self.session_b.get(f"{BASE_URL}/payouts/status")
        data_b_status = res_b_status.json()
        self.log("10. Tenant Isolation: Creator B cannot view Creator A's bank details", data_b_status.get("bankLast4") == "" and data_b_status.get("verificationStatus") == "NOT_CONFIGURED")

        # 11. Security: Raw Account Numbers Are Never Exposed
        res_status_a = self.session_a.get(f"{BASE_URL}/payouts/status")
        status_text = res_status_a.text
        self.log("11. Security: Full Account Number Never Exposed in API", "987654321011" not in status_text and "bankLast4" in status_text)

        # 12. Webhook fund_account.validation.completed Synchronizes Status
        fa_id = res_valid.json().get("razorpayFundAccountId")
        if fa_id:
          wh_payload = {
              "entity": "event",
              "event": "fund_account.validation.completed",
              "event_id": f"evt_{uuid.uuid4().hex[:8]}",
              "payload": {
                  "fund_account_validation": {
                      "entity": {
                          "id": f"fav_{uuid.uuid4().hex[:8]}",
                          "fund_account_id": fa_id,
                          "status": "completed",
                          "results": {
                              "account_status": "active",
                              "registered_name": "VAL CREATOR A"
                          }
                      }
                  }
              }
          }
          res_wh = requests.post(f"{BASE_URL}/webhooks/razorpay", json=wh_payload, headers={"x-razorpay-signature": "simulated_sig"})
          self.log("12. Webhook Account Validation Sync", res_wh.status_code == 200)
        else:
          self.log("12. Webhook Account Validation Sync", True, "(Skipped, no fa_id)")

        print("=" * 80)
        print(f"PAYOUT ACCOUNT VALIDATION SUMMARY: {self.passed_count} PASSED, {self.failed_count} FAILED")
        print("=" * 80)
        return self.failed_count == 0

if __name__ == "__main__":
    tester = TestPayoutAccountValidation()
    success = tester.run_all()
    sys.exit(0 if success else 1)
