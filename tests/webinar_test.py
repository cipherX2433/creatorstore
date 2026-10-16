#!/usr/bin/env python3
import requests
import sys
import uuid
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000/api"

class WebinarTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_webinar_{uuid.uuid4().hex[:6]}@example.com"
        self.creator_password = "Password123!"
        self.customer_email_free = f"customer_free_{uuid.uuid4().hex[:6]}@example.com"
        self.customer_email_paid = f"customer_paid_{uuid.uuid4().hex[:6]}@example.com"
        self.username = f"webinar_store_{uuid.uuid4().hex[:6]}"
        self.product_id = None
        self.product_id_capacity = None
        self.order_id = None
        self.razorpay_order_id = None
        self.registration_id = None
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
        print("RUNNING CREATORZERO WEBINAR (LIVE ONLINE EVENT) TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_creator()
            self.test_2_create_webinar_product()
            self.test_3_publish_blocked_without_config()
            self.test_4_past_date_validation_guard()
            self.test_5_save_webinar_config()
            self.test_6_publish_webinar_product()
            self.test_7_public_webinar_landing_endpoint()
            self.test_8_free_webinar_registration()
            self.test_9_paid_webinar_checkout_and_payment()
            self.test_10_capacity_limit_enforcement()
            self.test_11_duplicate_registration_prevention()
            self.test_12_secure_meeting_access_control()
            self.test_13_customer_webinars_list_endpoint()
            self.test_14_creator_attendee_roster()
            self.test_15_creator_mark_attendance()
            self.test_16_creator_cancel_webinar()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING SUITE EXECUTION: {e}")

        print("\n" + "=" * 80)
        print(f"WEBINAR TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_creator(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_email,
            "password": self.creator_password,
            "name": "Webinar Test Creator"
        })
        self.log("Signup Creator", res.status_code == 200)

        res = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)

        res = self.session.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Webinar Test Creator",
            "businessType": "INDIVIDUAL",
            "accountNumber": "91827364503",
            "ifscCode": "HDFC0001234"
        })
        self.log("Onboard Payouts", res.status_code == 200)

    def test_2_create_webinar_product(self):
        res = self.session.post(f"{BASE_URL}/products", json={
            "type": "WEBINAR",
            "title": "System Design Live Masterclass",
            "shortDescription": "Live interactive system design session",
            "price": 499,
            "currency": "inr"
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        self.log("Create Webinar Product", res.status_code == 201 and self.product_id is not None, f"ID: {self.product_id}")

    def test_3_publish_blocked_without_config(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Blocked Without Valid Schedule & Meeting URL", res.status_code == 400, f"Response: {res.text}")

    def test_4_past_date_validation_guard(self):
        past_time = (datetime.utcnow() - timedelta(days=2)).isoformat() + "Z"
        res = self.session.post(f"{BASE_URL}/webinar/config/{self.product_id}", json={
            "title": "System Design Live Masterclass",
            "startAtUTC": past_time,
            "durationMinutes": 90,
            "timezone": "Asia/Kolkata",
            "meetingUrl": "https://meet.google.com/abc-defg-hij",
            "price": 499
        })
        # Publish should fail for past date
        res_pub = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Past Date Schedule Rejection Guard", res_pub.status_code == 400, f"Status: {res_pub.status_code}")

    def test_5_save_webinar_config(self):
        future_time = (datetime.utcnow() + timedelta(days=5)).isoformat() + "Z"
        res = self.session.post(f"{BASE_URL}/webinar/config/{self.product_id}", json={
            "title": "System Design Live Masterclass",
            "shortDescription": "Live system design session for engineering interviews",
            "description": "Comprehensive live architecture walkthrough and database design.",
            "category": "Technology",
            "tags": ["#systemdesign", "#live"],
            "startAtUTC": future_time,
            "durationMinutes": 90,
            "timezone": "Asia/Kolkata",
            "price": 499,
            "currency": "inr",
            "isFree": False,
            "capacity": 100,
            "meetingUrl": "https://meet.google.com/live-system-design",
            "meetingInstructions": "Join 5 minutes early.",
            "questions": [
                {"id": "q1", "question": "What is your current role?", "type": "SHORT_TEXT", "required": True, "order": 1}
            ]
        })
        self.log("Save Webinar Config", res.status_code == 200)

    def test_6_publish_webinar_product(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Webinar Product", res.status_code == 200)

    def test_7_public_webinar_landing_endpoint(self):
        res = requests.get(f"{BASE_URL}/webinar/public/{self.product_id}")
        data = res.json()
        config = data.get("config", {})
        self.log("Public Webinar Landing Endpoint", res.status_code == 200 and config.get("title") == "System Design Live Masterclass")

    def test_8_free_webinar_registration(self):
        # Create a second free webinar
        res_p = self.session.post(f"{BASE_URL}/products", json={
            "type": "WEBINAR",
            "title": "Free Tech Talk",
            "price": 0,
            "currency": "inr"
        })
        free_id = res_p.json().get("product", {}).get("id")
        future_time = (datetime.utcnow() + timedelta(days=3)).isoformat() + "Z"
        self.session.post(f"{BASE_URL}/webinar/config/{free_id}", json={
            "title": "Free Tech Talk",
            "startAtUTC": future_time,
            "durationMinutes": 60,
            "timezone": "Asia/Kolkata",
            "price": 0,
            "isFree": True,
            "capacity": 50,
            "meetingUrl": "https://meet.google.com/free-tech-talk"
        })
        self.session.post(f"{BASE_URL}/products/{free_id}/publish")

        # Register free attendee
        res_reg = requests.post(f"{BASE_URL}/webinar/register-free", json={
            "productId": free_id,
            "name": "Free Attendee",
            "email": self.customer_email_free,
            "answers": [{"questionId": "q1", "questionText": "Role", "answer": "Developer"}]
        })
        if res_reg.status_code != 200:
            print("TEST 8 FAIL:", res_reg.status_code, res_reg.text)
        self.log("Free Webinar Registration Flow", res_reg.status_code == 200 and res_reg.json().get("registration", {}).get("status") == "REGISTERED")

    def test_9_paid_webinar_checkout_and_payment(self):
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
            "razorpay_payment_id": f"pay_webinar_{uuid.uuid4().hex[:6]}",
            "razorpay_signature": "mock_signature"
        })
        self.log("Paid Webinar Checkout & Payment Verification", res_ver.status_code == 200 and res_ver.json().get("success") == True)

    def test_10_capacity_limit_enforcement(self):
        # Create a webinar with capacity = 1
        res_p = self.session.post(f"{BASE_URL}/products", json={"type": "WEBINAR", "title": "Micro Capacity Webinar", "price": 0})
        cap_id = res_p.json().get("product", {}).get("id")
        self.product_id_capacity = cap_id
        future_time = (datetime.utcnow() + timedelta(days=4)).isoformat() + "Z"
        self.session.post(f"{BASE_URL}/webinar/config/{cap_id}", json={
            "title": "Micro Capacity Webinar",
            "startAtUTC": future_time,
            "price": 0,
            "isFree": True,
            "capacity": 1,
            "meetingUrl": "https://meet.google.com/micro-cap"
        })
        self.session.post(f"{BASE_URL}/products/{cap_id}/publish")

        # Attendee 1 registers -> succeeds
        res_1 = requests.post(f"{BASE_URL}/webinar/register-free", json={"productId": cap_id, "name": "Attendee 1", "email": "att1@example.com"})
        
        # Attendee 2 registers -> rejected (409 Conflict)
        res_2 = requests.post(f"{BASE_URL}/webinar/register-free", json={"productId": cap_id, "name": "Attendee 2", "email": "att2@example.com"})
        
        self.log("Capacity Limit Enforcement (409 Conflict when full)", res_1.status_code == 200 and res_2.status_code == 409)

    def test_11_duplicate_registration_prevention(self):
        res = requests.post(f"{BASE_URL}/webinar/register-free", json={
            "productId": self.product_id_capacity,
            "name": "Attendee 1 Duplicate",
            "email": "att1@example.com"
        })
        # Should return existing registration gracefully
        self.log("Duplicate Registration Prevention", res.status_code == 200 and res.json().get("registration", {}).get("customerEmail") == "att1@example.com")

    def test_12_secure_meeting_access_control(self):
        # Unauthenticated / Non-registered user receives 403 Forbidden
        res_unauth = requests.get(f"{BASE_URL}/webinar/registrations/{self.product_id}/access?email=unpaid_random@example.com")
        
        # Registered user receives meetingUrl
        res_auth = requests.get(f"{BASE_URL}/webinar/registrations/{self.product_id}/access?email={self.customer_email_paid}")
        data_auth = res_auth.json()

        self.log("Secure Meeting Access Control (403 for non-registrants)", res_unauth.status_code == 403 and res_auth.status_code == 200 and "meetingUrl" in data_auth)

    def test_13_customer_webinars_list_endpoint(self):
        res = requests.get(f"{BASE_URL}/webinar/student/registrations?email={self.customer_email_paid}")
        data = res.json()
        items = data.get("items", [])
        self.log("Customer Webinars List Endpoint", res.status_code == 200 and len(items) >= 1)

    def test_14_creator_attendee_roster(self):
        res = self.session.get(f"{BASE_URL}/webinar/creator/attendees?productId={self.product_id}")
        data = res.json()
        items = data.get("items", [])
        if len(items) > 0:
            self.registration_id = items[0].get("id")
        self.log("Creator Attendee Roster List", res.status_code == 200 and len(items) >= 1)

    def test_15_creator_mark_attendance(self):
        if not self.registration_id:
            return
        res = self.session.post(f"{BASE_URL}/webinar/creator/attendance", json={
            "registrationId": self.registration_id,
            "status": "ATTENDED"
        })
        reg = res.json().get("registration", {})
        self.log("Creator Mark Attendance Status", res.status_code == 200 and reg.get("status") == "ATTENDED")

    def test_16_creator_cancel_webinar(self):
        res = self.session.post(f"{BASE_URL}/webinar/creator/cancel", json={
            "productId": self.product_id,
            "reason": "Host emergency"
        })
        self.log("Creator Cancel Webinar Event", res.status_code == 200 and res.json().get("success") == True)

if __name__ == "__main__":
    runner = WebinarTestRunner()
    runner.run_all()
