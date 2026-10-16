#!/usr/bin/env python3
import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

class StoreLegalSettingsTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_leg_{uuid.uuid4().hex[:6]}@example.com"
        self.password = "Password123!"
        self.username = f"leg_store_{uuid.uuid4().hex[:6]}"
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
        print("RUNNING STORE & LEGAL SETTINGS TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_creator()
            self.test_2_get_default_store_settings()
            self.test_3_update_store_legal_and_branding_settings()
            self.test_4_get_public_store_policies()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING TEST EXECUTION: {e}")
            import traceback
            traceback.print_exc()

        print("\n" + "=" * 80)
        print(f"STORE & LEGAL SETTINGS TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_creator(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={"email": self.creator_email, "password": self.password, "name": "Legal Creator"})
        self.log("Signup Creator", res.status_code == 200)
        res = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)

    def test_2_get_default_store_settings(self):
        res = self.session.get(f"{BASE_URL}/creator/store/settings")
        data = res.json()
        settings = data.get("settings", {})
        self.log("GET Default Store Settings", res.status_code == 200 and "policies" in settings and "seo" in settings)

    def test_3_update_store_legal_and_branding_settings(self):
        res = self.session.patch(f"{BASE_URL}/creator/store/settings", json={
            "supportEmail": "support@mybrand.com",
            "socialLinks": {
                "twitter": "https://x.com/mybrand",
                "youtube": "https://youtube.com/@mybrand"
            },
            "policies": {
                "termsOfService": "All digital sales are subject to our standard terms.",
                "privacyPolicy": "We respect your data privacy.",
                "refundPolicy": "30-day money-back guarantee on digital courses."
            },
            "theme": {
                "accentColor": "#6366F1",
                "font": "Inter"
            },
            "seo": {
                "title": "My Brand Store - Premium Courses & Code",
                "description": "Learn top engineering skills from industry experts."
            }
        })
        data = res.json()
        settings = data.get("settings", {})
        self.log("Update Store Legal & Branding Settings", (
            res.status_code == 200 and
            settings.get("supportEmail") == "support@mybrand.com" and
            settings.get("policies", {}).get("refundPolicy") == "30-day money-back guarantee on digital courses." and
            settings.get("seo", {}).get("title") == "My Brand Store - Premium Courses & Code"
        ))

    def test_4_get_public_store_policies(self):
        res = requests.get(f"{BASE_URL}/store/policies?username={self.username}")
        data = res.json()
        policies = data.get("policies", {})
        self.log("GET Public Store Policies for Checkout & Footer", (
            res.status_code == 200 and
            policies.get("refundPolicy") == "30-day money-back guarantee on digital courses." and
            data.get("supportEmail") == "support@mybrand.com"
        ))

if __name__ == "__main__":
    runner = StoreLegalSettingsTestRunner()
    runner.run_all()
