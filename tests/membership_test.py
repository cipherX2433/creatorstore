#!/usr/bin/env python3
import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

class MembershipTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_mem_{uuid.uuid4().hex[:6]}@example.com"
        self.creator_password = "Password123!"
        self.customer_email_free = f"cust_mem_free_{uuid.uuid4().hex[:6]}@example.com"
        self.customer_email_paid = f"cust_mem_paid_{uuid.uuid4().hex[:6]}@example.com"
        self.username = f"mem_store_{uuid.uuid4().hex[:6]}"
        self.product_id = None
        self.community_id = None
        self.course_id = None
        self.order_id = None
        self.razorpay_order_id = None
        self.subscription_id = None
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
        print("RUNNING CREATORZERO MEMBERSHIP (RECURRING MONTHLY ACCESS) TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_creator()
            self.test_2_create_linked_resources()
            self.test_3_create_membership_product()
            self.test_4_publish_blocked_without_benefits()
            self.test_5_save_membership_config()
            self.test_6_publish_membership_product()
            self.test_7_public_membership_landing_endpoint()
            self.test_8_free_membership_subscription()
            self.test_9_paid_membership_checkout_and_payment()
            self.test_10_entitlement_cascading_verification()
            self.test_11_webhook_idempotency()
            self.test_12_cancel_subscription_at_period_end()
            self.test_13_resume_subscription()
            self.test_14_customer_memberships_list()
            self.test_15_creator_member_roster()
            self.test_16_creator_mrr_analytics()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING SUITE EXECUTION: {e}")

        print("\n" + "=" * 80)
        print(f"MEMBERSHIP TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_creator(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_email,
            "password": self.creator_password,
            "name": "Membership Creator"
        })
        self.log("Signup Creator", res.status_code == 200)

        res = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)

        res = self.session.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Membership Creator",
            "businessType": "INDIVIDUAL",
            "accountNumber": "98765432101",
            "ifscCode": "HDFC0001234"
        })
        self.log("Onboard Payouts", res.status_code == 200)

    def test_2_create_linked_resources(self):
        # Create Community product to link
        res_comm = self.session.post(f"{BASE_URL}/products", json={"type": "COMMUNITY", "title": "Builders Club", "price": 0})
        self.community_id = res_comm.json().get("product", {}).get("id")
        self.session.post(f"{BASE_URL}/community/config/{self.community_id}", json={"name": "Builders Club", "slug": f"builders-{uuid.uuid4().hex[:4]}"})
        self.session.post(f"{BASE_URL}/products/{self.community_id}/publish")

        # Create Course product to link
        res_course = self.session.post(f"{BASE_URL}/products", json={"type": "COURSE", "title": "System Design Masterclass", "price": 0})
        self.course_id = res_course.json().get("product", {}).get("id")
        self.session.post(f"{BASE_URL}/products/{self.course_id}/publish")

        self.log("Create Linked Resources (Community & Course)", self.community_id is not None and self.course_id is not None)

    def test_3_create_membership_product(self):
        res = self.session.post(f"{BASE_URL}/products", json={
            "type": "MEMBERSHIP",
            "title": "Pro Community Membership",
            "shortDescription": "Exclusive access to community & courses",
            "price": 499,
            "currency": "inr"
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        self.log("Create Membership Product", res.status_code == 201 and self.product_id is not None, f"ID: {self.product_id}")

    def test_4_publish_blocked_without_benefits(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Blocked Without Benefits", res.status_code == 400)

    def test_5_save_membership_config(self):
        res = self.session.post(f"{BASE_URL}/membership/config/{self.product_id}", json={
            "name": "Pro Community Membership",
            "shortDescription": "Exclusive access to community & courses",
            "description": "Full access to our private builders club and system design masterclass.",
            "category": "Technology",
            "tags": ["#career", "#developers"],
            "billingType": "MONTHLY",
            "price": 499,
            "currency": "inr",
            "isFree": False,
            "benefits": [
                {"id": "b1", "title": "Private Community Access", "description": "Builders Club group space"},
                {"id": "b2", "title": "System Design Course", "description": "Full video masterclass access"}
            ],
            "unlockedResources": [
                {"type": "COMMUNITY", "resourceId": self.community_id, "resourceName": "Builders Club"},
                {"type": "COURSE", "resourceId": self.course_id, "resourceName": "System Design Masterclass"}
            ]
        })
        self.log("Save Membership Config", res.status_code == 200)

    def test_6_publish_membership_product(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Membership Product", res.status_code == 200)

    def test_7_public_membership_landing_endpoint(self):
        res = requests.get(f"{BASE_URL}/membership/public/{self.product_id}")
        data = res.json()
        config = data.get("config", {})
        self.log("Public Membership Landing Endpoint", res.status_code == 200 and config.get("name") == "Pro Community Membership")

    def test_8_free_membership_subscription(self):
        # Create a second free membership
        res_p = self.session.post(f"{BASE_URL}/products", json={"type": "MEMBERSHIP", "title": "Free Membership", "price": 0})
        free_id = res_p.json().get("product", {}).get("id")
        self.session.post(f"{BASE_URL}/membership/config/{free_id}", json={
            "name": "Free Membership",
            "billingType": "MONTHLY",
            "price": 0,
            "isFree": True,
            "benefits": [{"id": "b1", "title": "Free Community Access"}]
        })
        self.session.post(f"{BASE_URL}/products/{free_id}/publish")

        # Subscribe free member
        res_sub = requests.post(f"{BASE_URL}/membership/subscribe-free", json={
            "productId": free_id,
            "name": "Free Member",
            "email": self.customer_email_free
        })
        self.log("Free Membership Subscription Flow", res_sub.status_code == 200 and res_sub.json().get("subscription", {}).get("status") == "ACTIVE")

    def test_9_paid_membership_checkout_and_payment(self):
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
            "razorpay_payment_id": f"pay_mem_{uuid.uuid4().hex[:6]}",
            "razorpay_signature": "mock_signature"
        })
        self.log("Paid Membership Checkout & Payment Verification", res_ver.status_code == 200 and res_ver.json().get("success") == True)

    def test_10_entitlement_cascading_verification(self):
        # Verify customer paid now has active access to the linked Community via creator member roster
        res_comm = self.session.get(f"{BASE_URL}/community/{self.community_id}/members")
        members = res_comm.json().get("items", [])
        is_granted = any(m.get("customerEmail") == self.customer_email_paid for m in members)
        self.log("Entitlement Cascading to Linked Community", res_comm.status_code == 200 and is_granted)

    def test_11_webhook_idempotency(self):
        # Re-send payment verification
        res_ver = requests.post(f"{BASE_URL}/checkout/verify", json={
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": f"pay_mem_{uuid.uuid4().hex[:6]}",
            "razorpay_signature": "mock_signature"
        })
        self.log("Webhook Idempotency (Duplicate Checkout Replayed)", res_ver.status_code == 200)

    def test_12_cancel_subscription_at_period_end(self):
        # Get subscription ID
        res_subs = requests.get(f"{BASE_URL}/membership/student/subscriptions?email={self.customer_email_paid}")
        items = res_subs.json().get("items", [])
        if len(items) > 0:
            self.subscription_id = items[0].get("subscription", {}).get("id")

        res_cancel = requests.post(f"{BASE_URL}/membership/subscriptions/{self.subscription_id}/cancel?email={self.customer_email_paid}")
        sub = res_cancel.json().get("subscription", {})
        self.log("Cancel Subscription at Period End", res_cancel.status_code == 200 and sub.get("cancelAtPeriodEnd") == True)

    def test_13_resume_subscription(self):
        if not self.subscription_id:
            return
        res_resume = requests.post(f"{BASE_URL}/membership/subscriptions/{self.subscription_id}/resume?email={self.customer_email_paid}")
        sub = res_resume.json().get("subscription", {})
        self.log("Resume Subscription (Un-cancel)", res_resume.status_code == 200 and sub.get("cancelAtPeriodEnd") == False)

    def test_14_customer_memberships_list(self):
        res = requests.get(f"{BASE_URL}/membership/student/subscriptions?email={self.customer_email_paid}")
        items = res.json().get("items", [])
        self.log("Customer Memberships List Endpoint", res.status_code == 200 and len(items) >= 1)

    def test_15_creator_member_roster(self):
        res = self.session.get(f"{BASE_URL}/membership/creator/members?productId={self.product_id}")
        items = res.json().get("items", [])
        self.log("Creator Member Roster List", res.status_code == 200 and len(items) >= 1)

    def test_16_creator_mrr_analytics(self):
        res = self.session.get(f"{BASE_URL}/membership/creator/analytics")
        data = res.json()
        self.log("Creator MRR Analytics Calculation", res.status_code == 200 and data.get("mrr") == 499 and data.get("activeMembers") >= 1)

if __name__ == "__main__":
    runner = MembershipTestRunner()
    runner.run_all()
