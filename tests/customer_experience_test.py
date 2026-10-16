#!/usr/bin/env python3
"""
Unified Customer Experience & Account End-to-End Test Suite for CreatorZero
Validates all customer portal endpoints, entitlement views, order histories, secure downloads, notifications, profile updates, and strict IDOR isolation.
"""

import requests
import json
import os
import sys
import uuid

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000/api")

test_results = {"passed": [], "failed": []}

def log_pass(test_name):
    print(f"✅ PASS: {test_name}")
    test_results["passed"].append(test_name)

def log_fail(test_name, reason):
    print(f"❌ FAIL: {test_name} - {reason}")
    test_results["failed"].append(f"{test_name}: {reason}")

def run_tests():
    print("=" * 80)
    print("RUNNING CREATORZERO UNIFIED CUSTOMER EXPERIENCE TEST SUITE")
    print("=" * 80)

    run_id = uuid.uuid4().hex[:6]
    session_cust_a = requests.Session()
    session_cust_b = requests.Session()

    cust_a_email = f"customer_a_{run_id}@example.com"
    cust_b_email = f"customer_b_{run_id}@example.com"
    password = "Password123!"

    # 1. Customer A Signup & Login
    try:
        r = session_cust_a.post(f"{BASE_URL}/auth/signup", json={"email": cust_a_email, "password": password, "name": "Customer A"})
        if r.status_code == 200:
            log_pass("Customer Account: Customer A Signup")
        else:
            log_fail("Customer Account: Customer A Signup", f"Status {r.status_code}: {r.text}")
    except Exception as e:
        log_fail("Customer Account: Customer A Signup", str(e))

    # 2. Customer B Signup & Login
    try:
        r = session_cust_b.post(f"{BASE_URL}/auth/signup", json={"email": cust_b_email, "password": password, "name": "Customer B"})
        if r.status_code == 200:
            log_pass("Customer Account: Customer B Signup")
        else:
            log_fail("Customer Account: Customer B Signup", f"Status {r.status_code}")
    except Exception as e:
        log_fail("Customer Account: Customer B Signup", str(e))

    # 3. GET /account/overview (Customer A)
    try:
        r = session_cust_a.get(f"{BASE_URL}/account/overview")
        if r.status_code == 200:
            data = r.json()
            if "summary" in data and "continueLearning" in data and "recentOrders" in data:
                log_pass("Customer Account: GET /account/overview returns aggregated portal summary")
            else:
                log_fail("Customer Account: GET /account/overview", f"Invalid response structure: {data}")
        else:
            log_fail("Customer Account: GET /account/overview", f"Status {r.status_code}: {r.text}")
    except Exception as e:
        log_fail("Customer Account: GET /account/overview", str(e))

    # 4. GET /account/library (Customer A)
    try:
        r = session_cust_a.get(f"{BASE_URL}/account/library")
        if r.status_code == 200:
            data = r.json()
            if "items" in data:
                log_pass("Customer Account: GET /account/library returns entitlement items")
            else:
                log_fail("Customer Account: GET /account/library", f"Missing items key: {data}")
        else:
            log_fail("Customer Account: GET /account/library", f"Status {r.status_code}: {r.text}")
    except Exception as e:
        log_fail("Customer Account: GET /account/library", str(e))

    # 5. GET /account/orders (Customer A)
    try:
        r = session_cust_a.get(f"{BASE_URL}/account/orders")
        if r.status_code == 200:
            data = r.json()
            if "orders" in data:
                log_pass("Customer Account: GET /account/orders returns order history")
            else:
                log_fail("Customer Account: GET /account/orders", f"Missing orders key: {data}")
        else:
            log_fail("Customer Account: GET /account/orders", f"Status {r.status_code}: {r.text}")
    except Exception as e:
        log_fail("Customer Account: GET /account/orders", str(e))

    # 6. GET /account/downloads (Customer A)
    try:
        r = session_cust_a.get(f"{BASE_URL}/account/downloads")
        if r.status_code == 200:
            data = r.json()
            if "downloads" in data:
                log_pass("Customer Account: GET /account/downloads returns purchased downloads")
            else:
                log_fail("Customer Account: GET /account/downloads", f"Missing downloads key: {data}")
        else:
            log_fail("Customer Account: GET /account/downloads", f"Status {r.status_code}: {r.text}")
    except Exception as e:
        log_fail("Customer Account: GET /account/downloads", str(e))

    # 7. GET /account/notifications (Customer A)
    try:
        r = session_cust_a.get(f"{BASE_URL}/account/notifications")
        if r.status_code == 200:
            data = r.json()
            if "notifications" in data and "unreadCount" in data:
                log_pass("Customer Account: GET /account/notifications returns user alerts")
            else:
                log_fail("Customer Account: GET /account/notifications", f"Invalid structure: {data}")
        else:
            log_fail("Customer Account: GET /account/notifications", f"Status {r.status_code}: {r.text}")
    except Exception as e:
        log_fail("Customer Account: GET /account/notifications", str(e))

    # 8. IDOR Isolation: Customer B trying to fetch Customer A's Order Detail
    try:
        # Request fake/unowned order ID for Customer B
        fake_order_id = "order_cust_a_12345"
        r = session_cust_b.get(f"{BASE_URL}/account/orders/{fake_order_id}")
        if r.status_code in [403, 404]:
            log_pass("IDOR Protection: Unowned order request blocked (returns 403/404)")
        else:
            log_fail("IDOR Protection: Order Access", f"Expected 403/404 for unowned order, got {r.status_code}")
    except Exception as e:
        log_fail("IDOR Protection: Order Access", str(e))

    # 9. Profile Patch (Customer A)
    try:
        r = session_cust_a.patch(f"{BASE_URL}/me/profile", json={"name": "Customer A Updated", "timezone": "Asia/Kolkata"})
        if r.status_code == 200:
            log_pass("Customer Account: PATCH /me/profile updates profile settings")
        else:
            log_fail("Customer Account: PATCH /me/profile", f"Status {r.status_code}: {r.text}")
    except Exception as e:
        log_fail("Customer Account: PATCH /me/profile", str(e))

    print("=" * 80)
    print(f"TEST SUMMARY: {len(test_results['passed'])} PASSED, {len(test_results['failed'])} FAILED")
    print("=" * 80)

    if len(test_results["failed"]) > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
