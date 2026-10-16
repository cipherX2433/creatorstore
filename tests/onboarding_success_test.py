#!/usr/bin/env python3
import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

class OnboardingSuccessTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_onb_{uuid.uuid4().hex[:6]}@example.com"
        self.password = "Password123!"
        self.username = f"onb_store_{uuid.uuid4().hex[:6]}"
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
        print("RUNNING CREATOR ONBOARDING & SUCCESS CENTER TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_creator()
            self.test_2_get_initial_onboarding_status()
            self.test_3_complete_payout_step()
            self.test_4_create_product_auto_updates_checklist()
            self.test_5_get_success_center_playbooks()
            self.test_6_manually_complete_custom_step()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING TEST EXECUTION: {e}")
            import traceback
            traceback.print_exc()

        print("\n" + "=" * 80)
        print(f"ONBOARDING & SUCCESS CENTER TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_creator(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={"email": self.creator_email, "password": self.password, "name": "Success Creator"})
        self.log("Signup Creator", res.status_code == 200)

    def test_2_get_initial_onboarding_status(self):
        res = self.session.get(f"{BASE_URL}/creator/onboarding")
        data = res.json()
        checklist = data.get("checklist", [])
        pct = data.get("progressPercentage", 0)
        next_step = data.get("nextStep")
        self.log("GET Initial Onboarding Status", res.status_code == 200 and len(checklist) >= 5 and pct >= 0 and next_step is not None)

    def test_3_complete_payout_step(self):
        res = self.session.post(f"{BASE_URL}/payouts/onboard", json={"legalName": "Success Creator", "businessType": "INDIVIDUAL", "accountNumber": "100123456789", "ifscCode": "HDFC0001234"})
        check = self.session.get(f"{BASE_URL}/creator/onboarding")
        completed = check.json().get("completedSteps", [])
        self.log("Payout Onboarding Auto-Completes Step", res.status_code == 200 and "CONNECT_PAYOUT" in completed)


    def test_4_create_product_auto_updates_checklist(self):
        res = self.session.post(f"{BASE_URL}/products", json={
            "type": "DIGITAL_DOWNLOAD",
            "title": "My First E-Book",
            "price": 499,
            "currency": "inr"
        })
        self.product_id = res.json().get("product", {}).get("id")
        check = self.session.get(f"{BASE_URL}/creator/onboarding")
        completed = check.json().get("completedSteps", [])
        self.log("Product Creation Auto-Completes Step", "CREATE_PRODUCT" in completed)

    def test_5_get_success_center_playbooks(self):
        res = self.session.get(f"{BASE_URL}/creator/success-center")
        data = res.json()
        playbooks = data.get("playbooks", [])
        templates = data.get("templates", [])
        self.log("GET Success Center Resources & Playbooks", res.status_code == 200 and len(playbooks) >= 3 and len(templates) >= 2)

    def test_6_manually_complete_custom_step(self):
        res = self.session.post(f"{BASE_URL}/creator/onboarding/complete-step", json={"stepId": "SHARE_STORE"})
        data = res.json()
        completed = data.get("completedSteps", [])
        self.log("Manually Complete Onboarding Step", res.status_code == 200 and "SHARE_STORE" in completed)

if __name__ == "__main__":
    runner = OnboardingSuccessTestRunner()
    runner.run_all()
