#!/usr/bin/env python3
import requests
import sys
import uuid
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000/api"

class CoachingTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_coaching_{uuid.uuid4().hex[:6]}@example.com"
        self.creator_password = "Password123!"
        self.customer_email = f"customer_{uuid.uuid4().hex[:6]}@example.com"
        self.username = f"coaching_store_{uuid.uuid4().hex[:6]}"
        self.product_id = None
        self.booking_id = None
        self.order_id = None
        self.razorpay_order_id = None
        self.slot_time = None
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
        print("RUNNING CREATORZERO COACHING (1:1 CALLS & SESSIONS) TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_and_onboard()
            self.test_2_create_coaching_product()
            self.test_3_publish_blocked_without_availability()
            self.test_4_save_coaching_config()
            self.test_5_publish_coaching_product_success()
            self.test_6_query_available_slots()
            self.test_7_booking_hold_and_checkout()
            self.test_8_payment_verification_confirms_booking()
            self.test_9_double_booking_prevention()
            self.test_10_checkout_status_includes_booking()
            self.test_11_customer_and_creator_bookings_list()
            self.test_12_reschedule_session()
            self.test_13_cancel_session()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING SUITE EXECUTION: {e}")

        print("\n" + "=" * 80)
        print(f"COACHING TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_and_onboard(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_email,
            "password": self.creator_password,
            "name": "Coaching Test Creator"
        })
        self.log("Signup Creator", res.status_code == 200, f"Status: {res.status_code}")

        # Set username
        res = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)

        # Onboard payouts so paid products can be published
        res = self.session.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Coaching Test Creator",
            "businessType": "INDIVIDUAL",
            "accountNumber": "91827364501",
            "ifscCode": "HDFC0001234"
        })
        self.log("Onboard Payouts", res.status_code == 200)

    def test_2_create_coaching_product(self):
        res = self.session.post(f"{BASE_URL}/products", json={
            "type": "COACHING",
            "title": "1:1 Career Strategy Call",
            "shortDescription": "60-minute career guidance session",
            "price": 1499,
            "currency": "inr"
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        self.log("Create Coaching Product", res.status_code == 201 and self.product_id is not None, f"ID: {self.product_id}")

    def test_3_publish_blocked_without_availability(self):
        # Publishing before saving valid availability should be blocked
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Blocked Without Availability", res.status_code == 400, f"Response: {res.text}")

    def test_4_save_coaching_config(self):
        res = self.session.post(f"{BASE_URL}/coaching/config/{self.product_id}", json={
            "durationMinutes": 60,
            "timezone": "Asia/Kolkata",
            "meetingType": "VIDEO_CALL",
            "meetingUrl": "https://meet.google.com/test-coaching-call",
            "minimumNoticeMinutes": 60,
            "maximumAdvanceDays": 30,
            "bufferMinutes": 15,
            "maxSessionsPerDay": 5,
            "allowRescheduling": True,
            "cancellationPolicyNoticeHours": 24,
            "availability": [
                {"dayOfWeek": 0, "startTime": "10:00", "endTime": "18:00", "enabled": True},
                {"dayOfWeek": 1, "startTime": "10:00", "endTime": "18:00", "enabled": True},
                {"dayOfWeek": 2, "startTime": "10:00", "endTime": "18:00", "enabled": True},
                {"dayOfWeek": 3, "startTime": "10:00", "endTime": "18:00", "enabled": True},
                {"dayOfWeek": 4, "startTime": "10:00", "endTime": "18:00", "enabled": True},
                {"dayOfWeek": 5, "startTime": "10:00", "endTime": "18:00", "enabled": True},
                {"dayOfWeek": 6, "startTime": "10:00", "endTime": "18:00", "enabled": True},
            ],
            "questions": [
                {"id": "q1", "question": "What is your main goal?", "type": "LONG_TEXT", "required": True, "order": 1}
            ]
        })
        self.log("Save Coaching Config", res.status_code == 200)

    def test_5_publish_coaching_product_success(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Coaching Product", res.status_code == 200)

    def test_6_query_available_slots(self):
        # Query slots for tomorrow
        target_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
        res = requests.get(f"{BASE_URL}/coaching/slots?productId={self.product_id}&date={target_date}")
        data = res.json()
        slots = data.get("slots", [])
        self.log("Query Available Slots", res.status_code == 200 and len(slots) > 0, f"Found {len(slots)} slots for {target_date}")
        if slots:
            self.slot_time = slots[0]

    def test_7_booking_hold_and_checkout(self):
        if not self.slot_time:
            self.log("Booking Hold & Checkout", False, "No slot time available")
            return

        res = requests.post(f"{BASE_URL}/checkout", json={
            "productId": self.product_id,
            "email": self.customer_email,
            "bookingDetails": {
                "startTime": self.slot_time["startTime"],
                "endTime": self.slot_time["endTime"],
                "answers": [{"questionId": "q1", "questionText": "What is your main goal?", "answer": "Prepare for Senior Tech Lead interview"}]
            }
        })
        data = res.json() if res.status_code == 200 else {}
        if res.status_code != 200:
            print("CHECKOUT FAIL RESPONSE:", res.status_code, res.text)
        self.order_id = data.get("orderId")
        self.razorpay_order_id = data.get("razorpayOrderId")
        self.booking_id = data.get("bookingId")

        self.log("Create Checkout Order & Booking Hold", res.status_code == 200 and self.order_id is not None and self.booking_id is not None, f"Order: {self.order_id}, Booking: {self.booking_id}")

    def test_8_payment_verification_confirms_booking(self):
        res = requests.post(f"{BASE_URL}/checkout/verify", json={
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": f"pay_test_{uuid.uuid4().hex[:6]}",
            "razorpay_signature": "mock_signature"
        })
        self.log("Payment Verification", res.status_code == 200 and res.json().get("success") == True)

    def test_9_double_booking_prevention(self):
        # Attempt to book the EXACT SAME slot again
        res = requests.post(f"{BASE_URL}/checkout", json={
            "productId": self.product_id,
            "email": "another_customer@example.com",
            "bookingDetails": {
                "startTime": self.slot_time["startTime"],
                "endTime": self.slot_time["endTime"],
                "answers": []
            }
        })
        # Should be rejected with 409 Conflict
        self.log("Prevent Double Booking (409 Conflict)", res.status_code == 409, f"Status: {res.status_code}")

    def test_10_checkout_status_includes_booking(self):
        res = requests.get(f"{BASE_URL}/checkout/status?order_id={self.order_id}")
        data = res.json()
        booking = data.get("booking")
        self.log("Checkout Status Includes Booking", res.status_code == 200 and booking is not None and booking.get("status") == "CONFIRMED")

    def test_11_customer_and_creator_bookings_list(self):
        # Customer list
        res_cust = requests.get(f"{BASE_URL}/coaching/student/bookings?email={self.customer_email}")
        cust_bookings = res_cust.json().get("bookings", [])

        # Creator list
        res_cr = self.session.get(f"{BASE_URL}/coaching/creator/bookings")
        creator_bookings = res_cr.json().get("bookings", [])

        self.log("List Customer & Creator Bookings", res_cust.status_code == 200 and res_cr.status_code == 200 and len(cust_bookings) >= 1 and len(creator_bookings) >= 1)

    def test_12_reschedule_session(self):
        if not self.booking_id:
            return
        new_start = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%dT14:00:00.000Z")
        new_end = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%dT15:00:00.000Z")

        res = requests.post(f"{BASE_URL}/coaching/bookings/{self.booking_id}/reschedule", json={
            "customerEmail": self.customer_email,
            "newStartTime": new_start,
            "newEndTime": new_end
        })
        self.log("Reschedule Session", res.status_code == 200 and res.json().get("booking", {}).get("status") == "CONFIRMED")

    def test_13_cancel_session(self):
        if not self.booking_id:
            return
        res = requests.post(f"{BASE_URL}/coaching/bookings/{self.booking_id}/cancel", json={
            "customerEmail": self.customer_email,
            "reason": "Schedule conflict"
        })
        self.log("Cancel Session & Refund Trigger", res.status_code == 200 and res.json().get("booking", {}).get("status") == "CANCELLED")

if __name__ == "__main__":
    runner = CoachingTestRunner()
    runner.run_all()
