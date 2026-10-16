#!/usr/bin/env python3
import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

class CommunityResourcesTestRunner:
    def __init__(self):
        self.session_creator = requests.Session()
        self.session_customer = requests.Session()
        self.creator_email = f"creator_comm_{uuid.uuid4().hex[:6]}@example.com"
        self.customer_email = f"cust_comm_{uuid.uuid4().hex[:6]}@example.com"
        self.password = "Password123!"
        self.username = f"comm_store_{uuid.uuid4().hex[:6]}"
        self.product_id = None
        self.community_id = None
        self.post_id = None
        self.resource_id = None
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
        print("RUNNING COMMUNITY RESOURCES & INTEGRATIONS TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_and_onboard()
            self.test_2_create_community_product()
            self.test_3_save_community_config()
            self.test_4_publish_community_product()
            self.test_5_create_community_resource()
            self.test_6_list_community_resources_creator()
            self.test_7_create_post_with_product_reference()
            self.test_8_pin_community_post()
            self.test_9_hide_community_post()
            self.test_10_delete_community_resource()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING TEST EXECUTION: {e}")
            import traceback
            traceback.print_exc()

        print("\n" + "=" * 80)
        print(f"COMMUNITY RESOURCES TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_and_onboard(self):
        res = self.session_creator.post(f"{BASE_URL}/auth/signup", json={"email": self.creator_email, "password": self.password, "name": "Community Leader"})
        self.log("Signup Creator", res.status_code == 200)
        res = self.session_creator.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)
        self.session_creator.post(f"{BASE_URL}/payouts/onboard", json={"legalName": "Community Leader", "businessType": "INDIVIDUAL", "accountNumber": "1001", "ifscCode": "HDFC0001234"})

    def test_2_create_community_product(self):
        res = self.session_creator.post(f"{BASE_URL}/products", json={
            "type": "COMMUNITY",
            "title": "DSA & System Design Builders",
            "shortDescription": "Exclusive developer community",
            "price": 0,
            "currency": "inr"
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        self.log("Create Community Product", res.status_code == 201 and self.product_id is not None)

    def test_3_save_community_config(self):
        res = self.session_creator.post(f"{BASE_URL}/community/config/{self.product_id}", json={
            "name": "DSA & System Design Builders",
            "slug": f"dsa-builders-{uuid.uuid4().hex[:4]}",
            "description": "Daily DSA roadmaps & system design notes",
            "coverImage": "https://example.com/cover.png",
            "categories": ["Roadmaps", "Notes", "Q&A"]
        })
        data = res.json()
        self.community_id = data.get("config", {}).get("id")
        self.log("Save Community Config", res.status_code == 200 and self.community_id is not None)

    def test_4_publish_community_product(self):
        res = self.session_creator.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Community Product", res.status_code == 200)

    def test_5_create_community_resource(self):
        res = self.session_creator.post(f"{BASE_URL}/community/{self.community_id}/resources", json={
            "title": "DSA Roadmap 2026 PDF",
            "description": "Complete step-by-step roadmap to master algorithms",
            "fileUrl": "https://example.com/dsa-roadmap.pdf",
            "category": "Roadmaps",
            "visibility": "MEMBERS_ONLY"
        })
        data = res.json()
        resource = data.get("resource", {})
        self.resource_id = resource.get("id")
        self.log("Create Community Resource", res.status_code in [200, 201] and self.resource_id is not None)

    def test_6_list_community_resources_creator(self):
        res = self.session_creator.get(f"{BASE_URL}/community/{self.community_id}/resources")
        resources = res.json().get("resources", [])
        self.log("List Community Resources", res.status_code == 200 and len(resources) >= 1)

    def test_7_create_post_with_product_reference(self):
        res = self.session_creator.post(f"{BASE_URL}/community/{self.community_id}/posts", json={
            "title": "New System Design Course Released!",
            "content": "Check out our brand new course on Distributed Systems.",
            "category": "Announcements",
            "referencedProduct": {
                "id": self.product_id,
                "type": "COURSE",
                "title": "System Design Masterclass",
                "slug": "system-design-masterclass"
            }
        })
        data = res.json()
        post = data.get("post", {})
        self.post_id = post.get("id")
        self.log("Create Post with Product Reference", res.status_code in [200, 201] and self.post_id is not None, f"Status: {res.status_code}, Text: {res.text}")


    def test_8_pin_community_post(self):
        res = self.session_creator.post(f"{BASE_URL}/community/{self.community_id}/posts/{self.post_id}/pin", json={"isPinned": True})
        self.log("Pin Post Moderation", res.status_code == 200, f"Status: {res.status_code}, Text: {res.text}")

    def test_9_hide_community_post(self):
        res = self.session_creator.post(f"{BASE_URL}/community/{self.community_id}/posts/{self.post_id}/hide", json={"isHidden": True})
        self.log("Hide Post Moderation", res.status_code == 200, f"Status: {res.status_code}, Text: {res.text}")


    def test_10_delete_community_resource(self):
        res = self.session_creator.delete(f"{BASE_URL}/community/{self.community_id}/resources/{self.resource_id}")
        self.log("Delete Community Resource", res.status_code == 200)

if __name__ == "__main__":
    runner = CommunityResourcesTestRunner()
    runner.run_all()
