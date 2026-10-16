#!/usr/bin/env python3
import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

class CommunityTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_comm_{uuid.uuid4().hex[:6]}@example.com"
        self.creator_password = "Password123!"
        self.customer_email = f"customer_comm_{uuid.uuid4().hex[:6]}@example.com"
        self.username = f"comm_store_{uuid.uuid4().hex[:6]}"
        self.product_id = None
        self.community_slug = f"builders-club-{uuid.uuid4().hex[:6]}"
        self.order_id = None
        self.razorpay_order_id = None
        self.post_id = None
        self.comment_id = None
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
        print("RUNNING CREATORZERO COMMUNITY (PRIVATE GROUP SPACE) TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_creator()
            self.test_2_create_community_product()
            self.test_3_publish_blocked_without_config()
            self.test_4_save_community_config()
            self.test_5_publish_community_product()
            self.test_6_public_community_landing_endpoint()
            self.test_7_private_feed_access_blocked_for_non_members()
            self.test_8_checkout_and_payment_grant_membership()
            self.test_9_idempotency_duplicate_payment()
            self.test_10_member_access_feed_success()
            self.test_11_member_create_post()
            self.test_12_admin_pinned_announcement()
            self.test_13_non_admin_announcement_blocked()
            self.test_14_member_create_comment_and_list()
            self.test_15_reaction_toggle_and_duplicate_prevention()
            self.test_16_member_directory_search()
            self.test_17_creator_moderation_suspend_member()
            self.test_18_suspended_member_api_blocked()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING SUITE EXECUTION: {e}")

        print("\n" + "=" * 80)
        print(f"COMMUNITY TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_creator(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_email,
            "password": self.creator_password,
            "name": "Community Test Creator"
        })
        self.log("Signup Creator", res.status_code == 200)

        res = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)

        res = self.session.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Community Test Creator",
            "businessType": "INDIVIDUAL",
            "accountNumber": "91827364502",
            "ifscCode": "HDFC0001234"
        })
        self.log("Onboard Payouts", res.status_code == 200)

    def test_2_create_community_product(self):
        res = self.session.post(f"{BASE_URL}/products", json={
            "type": "COMMUNITY",
            "title": "Builders Club Community",
            "shortDescription": "A private community for founders and builders",
            "price": 999,
            "currency": "inr"
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        self.log("Create Community Product", res.status_code == 201 and self.product_id is not None, f"ID: {self.product_id}")

    def test_3_publish_blocked_without_config(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Blocked Without Valid Config", res.status_code == 400, f"Response: {res.text}")

    def test_4_save_community_config(self):
        res = self.session.post(f"{BASE_URL}/community/config/{self.product_id}", json={
            "name": "Builders Club Community",
            "slug": self.community_slug,
            "shortDescription": "A private community for founders and builders",
            "description": "Join a private community of developers, founders and builders.",
            "category": "Technology",
            "tags": ["#developers", "#saas"],
            "coverImage": "https://images.unsplash.com/photo-1522071820081-009f0129c71c",
            "accessType": "ONE_TIME",
            "allowNewMembers": True,
            "rules": [
                {"id": "r1", "title": "Be respectful", "description": "Treat all members with respect."},
                {"id": "r2", "title": "No spam", "description": "Spam will be removed."}
            ],
            "benefits": ["Builder discussions", "Feedback", "Networking"]
        })
        self.log("Save Community Config", res.status_code == 200)

    def test_5_publish_community_product(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Community Product", res.status_code == 200)

    def test_6_public_community_landing_endpoint(self):
        res = requests.get(f"{BASE_URL}/community/public/{self.community_slug}")
        data = res.json()
        config = data.get("config", {})
        self.log("Public Community Landing Endpoint", res.status_code == 200 and config.get("name") == "Builders Club Community")

    def test_7_private_feed_access_blocked_for_non_members(self):
        # Request feed for non-member
        res = requests.get(f"{BASE_URL}/community/{self.product_id}/feed?email=random_unpaid_user@example.com")
        if res.status_code != 403:
            print("TEST 7 FAIL RESPONSE:", res.status_code, res.text)
        self.log("Private Feed Access Blocked (403 Forbidden)", res.status_code == 403, f"Status: {res.status_code}")

    def test_8_checkout_and_payment_grant_membership(self):
        res = requests.post(f"{BASE_URL}/checkout", json={
            "productId": self.product_id,
            "email": self.customer_email
        })
        data = res.json()
        self.order_id = data.get("orderId")
        self.razorpay_order_id = data.get("razorpayOrderId")

        # Verify payment
        res_ver = requests.post(f"{BASE_URL}/checkout/verify", json={
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": f"pay_test_{uuid.uuid4().hex[:6]}",
            "razorpay_signature": "mock_signature"
        })
        self.log("Checkout & Payment Grant Active Membership", res_ver.status_code == 200 and res_ver.json().get("success") == True)

    def test_9_idempotency_duplicate_payment(self):
        # Repeat verify call with same razorpay order
        res_ver = requests.post(f"{BASE_URL}/checkout/verify", json={
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": f"pay_test_{uuid.uuid4().hex[:6]}",
            "razorpay_signature": "mock_signature"
        })
        self.log("Payment Verification Idempotency", res_ver.status_code == 200)

    def test_10_member_access_feed_success(self):
        res = requests.get(f"{BASE_URL}/community/{self.product_id}/feed?email={self.customer_email}")
        data = res.json()
        self.log("Member Access Feed Success", res.status_code == 200 and "posts" in data)

    def test_11_member_create_post(self):
        res = requests.post(f"{BASE_URL}/community/{self.product_id}/posts?email={self.customer_email}", json={
            "content": "Excited to join the Builders Club! Currently building a Next.js micro-SaaS."
        })
        data = res.json()
        self.post_id = data.get("post", {}).get("id")
        self.log("Member Create Post", res.status_code == 200 and self.post_id is not None, f"Post ID: {self.post_id}")

    def test_12_admin_pinned_announcement(self):
        # Creator session creates pinned announcement
        res = self.session.post(f"{BASE_URL}/community/{self.product_id}/posts?email={self.creator_email}", json={
            "content": "📢 Welcome to Builders Club! Please introduce yourself below.",
            "isAnnouncement": True
        })
        data = res.json()
        announcement = data.get("post", {})
        self.log("Creator Create Pinned Announcement", res.status_code == 200 and announcement.get("isAnnouncement") == True)

    def test_13_non_admin_announcement_blocked(self):
        res = requests.post(f"{BASE_URL}/community/{self.product_id}/posts?email={self.customer_email}", json={
            "content": "Trying to make an announcement as regular member",
            "isAnnouncement": True
        })
        self.log("Regular Member Announcement Blocked (403)", res.status_code == 403)

    def test_14_member_create_comment_and_list(self):
        if not self.post_id:
            return
        res = requests.post(f"{BASE_URL}/community/posts/{self.post_id}/comments?email={self.customer_email}", json={
            "content": "Great update! What database are you using?"
        })
        data = res.json()
        self.comment_id = data.get("comment", {}).get("id")

        res_list = requests.get(f"{BASE_URL}/community/posts/{self.post_id}/comments?email={self.customer_email}")
        comments = res_list.json().get("comments", [])

        self.log("Member Create & List Comments", res.status_code == 200 and len(comments) >= 1)

    def test_15_reaction_toggle_and_duplicate_prevention(self):
        if not self.post_id:
            return
        # Toggle 1: Like
        res1 = requests.post(f"{BASE_URL}/community/posts/{self.post_id}/react?email={self.customer_email}")
        self.log("Toggle Reaction (Like)", res1.status_code == 200 and res1.json().get("reacted") == True)

        # Toggle 2: Unlike
        res2 = requests.post(f"{BASE_URL}/community/posts/{self.post_id}/react?email={self.customer_email}")
        self.log("Toggle Reaction (Unlike)", res2.status_code == 200 and res2.json().get("reacted") == False)

    def test_16_member_directory_search(self):
        res = requests.get(f"{BASE_URL}/community/{self.product_id}/members?email={self.customer_email}&search={self.customer_email[:5]}")
        data = res.json()
        members = data.get("items", [])
        self.log("Member Directory Search", res.status_code == 200 and len(members) >= 1)

    def test_17_creator_moderation_suspend_member(self):
        res = self.session.post(f"{BASE_URL}/community/creator/members/manage", json={
            "communityId": self.product_id,
            "targetEmail": self.customer_email,
            "role": "MEMBER",
            "status": "SUSPENDED"
        })
        if res.status_code != 200:
            print("TEST 17 FAIL:", res.status_code, res.text)
        self.log("Creator Moderation Suspend Member", res.status_code == 200 and res.json().get("membership", {}).get("status") == "SUSPENDED")

    def test_18_suspended_member_api_blocked(self):
        res = requests.get(f"{BASE_URL}/community/{self.product_id}/feed?email={self.customer_email}")
        self.log("Suspended Member API Blocked (403)", res.status_code == 403)

if __name__ == "__main__":
    runner = CommunityTestRunner()
    runner.run_all()
