#!/usr/bin/env python3
import requests
import sys
import uuid
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000/api"

class AdvancedCoachingTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_coaching_adv_{uuid.uuid4().hex[:6]}@example.com"
        self.creator_password = "Password123!"
        self.customer_email_1 = f"cust_1_{uuid.uuid4().hex[:6]}@example.com"
        self.customer_email_2 = f"cust_2_{uuid.uuid4().hex[:6]}@example.com"
        self.username = f"coaching_adv_{uuid.uuid4().hex[:6]}"
        self.product_id = None
        self.booking_id = None
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
        print("RUNNING ADVANCED COACHING SCHEDULING TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_and_onboard()
            self.test_2_create_coaching_product()
            self.test_3_save_advanced_coaching_config()
            self.test_4_publish_coaching_product()
            self.test_5_get_available_slots_multi_windows()
            self.test_6_blocked_date_prevents_slots()
            self.test_7_blocked_time_range_prevents_booking()
            self.test_8_successful_booking_hold()
            self.test_9_double_booking_conflict_prevention()
            self.test_10_reschedule_coaching_booking()
            self.test_11_cancel_coaching_booking()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING TEST EXECUTION: {e}")
            import traceback
            traceback.print_exc()

        print("\n" + "=" * 80)
        print(f"ADVANCED COACHING TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_and_onboard(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={"email": self.creator_email, "password": self.creator_password, "name": "Coaching Expert"})
        self.log("Signup Creator", res.status_code == 200)
        res = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)
        self.session.post(f"{BASE_URL}/payouts/onboard", json={"legalName": "Coaching Expert", "businessType": "INDIVIDUAL", "accountNumber": "1001", "ifscCode": "HDFC0001234"})

    def test_2_create_coaching_product(self):
        res = self.session.post(f"{BASE_URL}/products", json={
            "type": "COACHING",
            "title": "Executive Strategy Session",
            "shortDescription": "1:1 Executive Leadership & Business Strategy",
            "price": 0,
            "currency": "inr"
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        self.log("Create Coaching Product", res.status_code == 201 and self.product_id is not None)

    def test_3_save_advanced_coaching_config(self):
        # Target tomorrow date
        tomorrow = (datetime.utcnow() + timedelta(days=2))
        self.target_date_str = tomorrow.strftime("%Y-%m-%d")
        day_of_week = tomorrow.weekday() # 0 = Mon, ..., 6 = Sun
        js_day = (day_of_week + 1) % 7 # 0 = Sun, 1 = Mon, ..., 6 = Sat

        self.blocked_date_str = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d")

        res = self.session.post(f"{BASE_URL}/coaching/config/{self.product_id}", json={
            "durationMinutes": 45,
            "timezone": "Asia/Kolkata",
            "meetingType": "ZOOM",
            "meetingUrl": "https://zoom.us/j/999888777",
            "locationText": "Zoom Video Call",
            "minimumNoticeMinutes": 60,
            "maximumAdvanceDays": 30,
            "bufferMinutes": 15,
            "maxSessionsPerDay": 5,
            "allowRescheduling": True,
            "cancellationPolicyNoticeHours": 0,
            "blockedDates": [self.blocked_date_str],

            "blockedTimeRanges": [
                {"date": self.target_date_str, "startTime": "14:00", "endTime": "16:00"}
            ],
            "availability": [
                {"dayOfWeek": js_day, "windows": [
                    {"startTime": "09:00", "endTime": "12:00"},
                    {"startTime": "16:00", "endTime": "19:00"}
                ], "enabled": True}
            ]
        })
        self.log("Save Advanced Coaching Config", res.status_code == 200, f"Status: {res.status_code}")

    def test_4_publish_coaching_product(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Coaching Product", res.status_code == 200)

    def test_5_get_available_slots_multi_windows(self):
        res = requests.get(f"{BASE_URL}/coaching/slots?productId={self.product_id}&date={self.target_date_str}")
        data = res.json()
        slots = data.get("slots", [])
        self.log("GET Slots with Multi-Windows and Blocked Range", res.status_code == 200 and len(slots) > 0)
        if len(slots) > 0:
            self.first_slot = slots[0]

    def test_6_blocked_date_prevents_slots(self):
        res = requests.get(f"{BASE_URL}/coaching/slots?productId={self.product_id}&date={self.blocked_date_str}")
        slots = res.json().get("slots", [])
        self.log("Blocked Date Returns 0 Slots", res.status_code == 200 and len(slots) == 0)

    def test_7_blocked_time_range_prevents_booking(self):
        # Attempt to book inside blocked time range (14:00 - 16:00)
        blocked_start = f"{self.target_date_str}T14:30:00.000Z"
        blocked_end = f"{self.target_date_str}T15:15:00.000Z"
        res = requests.post(f"{BASE_URL}/coaching/book", json={
            "productId": self.product_id,
            "startTime": blocked_start,
            "endTime": blocked_end,
            "customerEmail": self.customer_email_1,
            "customerName": "Customer 1"
        })
        self.log("Booking inside Blocked Time Range Fails (409)", res.status_code == 409)

    def test_8_successful_booking_hold(self):
        res = requests.post(f"{BASE_URL}/coaching/book", json={
            "productId": self.product_id,
            "startTime": self.first_slot["startTime"],
            "endTime": self.first_slot["endTime"],
            "customerEmail": self.customer_email_1,
            "customerName": "Customer 1"
        })
        data = res.json()
        booking = data.get("booking", {})
        self.booking_id = booking.get("id")
        self.log("Create Successful Booking Hold", res.status_code == 200 and self.booking_id is not None)

    def test_9_double_booking_conflict_prevention(self):
        # Customer 2 attempts to book the same slot simultaneously
        res = requests.post(f"{BASE_URL}/coaching/book", json={
            "productId": self.product_id,
            "startTime": self.first_slot["startTime"],
            "endTime": self.first_slot["endTime"],
            "customerEmail": self.customer_email_2,
            "customerName": "Customer 2"
        })
        self.log("Double Booking Attempt Blocked (409 Conflict)", res.status_code == 409)

    def test_10_reschedule_coaching_booking(self):
        # Get next available slot
        res_slots = requests.get(f"{BASE_URL}/coaching/slots?productId={self.product_id}&date={self.target_date_str}")
        slots = res_slots.json().get("slots", [])
        if len(slots) > 1:
            new_slot = slots[1]
            res = requests.post(f"{BASE_URL}/coaching/bookings/{self.booking_id}/reschedule", json={
                "email": self.customer_email_1,
                "newStartTime": new_slot["startTime"],
                "newEndTime": new_slot["endTime"]
            })
            self.log("Reschedule Booking", res.status_code == 200)

    def test_11_cancel_coaching_booking(self):
        res = requests.post(f"{BASE_URL}/coaching/bookings/{self.booking_id}/cancel", json={
            "email": self.customer_email_1,
            "reason": "Schedule conflict"
        })
        self.log("Cancel Booking", res.status_code == 200, f"Status: {res.status_code}, Text: {res.text}")


if __name__ == "__main__":
    runner = AdvancedCoachingTestRunner()
    runner.run_all()
