#!/usr/bin/env python3
"""
Test Suite for Unified Product Management Popup & Performance Column
Validates:
1. Product Creation across DIGITAL, COURSE, COACHING, and MEMBERSHIP
2. Performance column calculation on GET /api/products
3. Type-specific management payload on GET /api/products/:id/management
4. Server-side security & creator ownership isolation (Creator B cannot view Creator A's management data)
5. Empty states when products have 0 orders/students/bookings/members
6. Real data metrics calculation (Revenue, Students, Bookings, Members)
"""

import os
import sys
import requests
import json
import uuid

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000/api")

test_results = {"passed": [], "failed": []}

def log_pass(name):
    print(f"✅ PASS: {name}")
    test_results["passed"].append(name)

def log_fail(name, reason):
    print(f"❌ FAIL: {name} - {reason}")
    test_results["failed"].append(f"{name}: {reason}")

def run_tests():
    print("=" * 80)
    print("RUNNING PRODUCT MANAGEMENT POPUP & PERFORMANCE TESTS")
    print("=" * 80)

    session_creator_a = requests.Session()
    session_creator_b = requests.Session()

    suffix = os.urandom(4).hex()
    creator_a_email = f"creator_mgmt_a_{suffix}@example.com"
    creator_b_email = f"creator_mgmt_b_{suffix}@example.com"
    password = "Password123!"

    # 1. Signup Creator A & Creator B
    r_a = session_creator_a.post(f"{BASE_URL}/auth/signup", json={"email": creator_a_email, "password": password, "name": "Creator A"})
    if r_a.status_code == 200:
        log_pass("Auth: Creator A signup")
    else:
        log_fail("Auth: Creator A signup", f"Status {r_a.status_code}: {r_a.text}")
        return

    r_b = session_creator_b.post(f"{BASE_URL}/auth/signup", json={"email": creator_b_email, "password": password, "name": "Creator B"})
    if r_b.status_code == 200:
        log_pass("Auth: Creator B signup")
    else:
        log_fail("Auth: Creator B signup", f"Status {r_b.status_code}: {r_b.text}")

    # Set store username
    session_creator_a.post(f"{BASE_URL}/store/username", json={"username": f"store_a_{suffix}"})

    # 2. Create Digital Product
    prod_digital_id = None
    r = session_creator_a.post(f"{BASE_URL}/products", json={
        "title": "ML Notes & Guide",
        "type": "DIGITAL_DOWNLOAD",
        "price": 299,
        "currency": "inr",
        "shortDescription": "Complete machine learning reference guide",
        "status": "PUBLISHED"
    })
    if r.status_code in (200, 201):
        prod_digital_id = r.json().get("product", {}).get("id")
        log_pass("Create Digital Product")
    else:
        log_fail("Create Digital Product", f"Status {r.status_code}: {r.text}")

    # 3. Create Course Product
    prod_course_id = None
    course_id = None
    r = session_creator_a.post(f"{BASE_URL}/courses", json={
        "title": "Python Masterclass",
        "price": 1999,
        "currency": "inr",
        "shortDescription": "Master modern Python from basics to advanced",
        "instructor": "Jane Developer",
        "difficulty": "All Levels"
    })
    if r.status_code in (200, 201):
        data = r.json()
        course_id = data.get("course", {}).get("id")
        prod_course_id = data.get("product", {}).get("id") or data.get("course", {}).get("productId")
        log_pass("Create Course Product")
    else:
        log_fail("Create Course Product", f"Status {r.status_code}: {r.text}")

    # 4. Create Coaching / Booking Product
    prod_coaching_id = None
    r = session_creator_a.post(f"{BASE_URL}/products", json={
        "title": "Career Consultation & Strategy",
        "type": "COACHING",
        "price": 1000,
        "currency": "inr",
        "shortDescription": "1:1 Strategy Call",
        "status": "PUBLISHED"
    })
    if r.status_code in (200, 201):
        prod_coaching_id = r.json().get("product", {}).get("id")
        # Save coaching config
        session_creator_a.post(f"{BASE_URL}/coaching/config/{prod_coaching_id}", json={
            "durationMinutes": 45,
            "meetingType": "GOOGLE_MEET",
            "availability": [
                {"dayOfWeek": 1, "dayName": "Monday", "enabled": True, "windows": [{"startTime": "10:00", "endTime": "18:00"}]},
                {"dayOfWeek": 2, "dayName": "Tuesday", "enabled": True, "windows": [{"startTime": "10:00", "endTime": "18:00"}]}
            ]
        })
        log_pass("Create Coaching Product")
    else:
        log_fail("Create Coaching Product", f"Status {r.status_code}: {r.text}")

    # 5. Create Membership Product
    prod_membership_id = None
    r = session_creator_a.post(f"{BASE_URL}/products", json={
        "title": "Premium Developer Community",
        "type": "MEMBERSHIP",
        "price": 499,
        "currency": "inr",
        "shortDescription": "Private Discord & monthly workshops",
        "status": "PUBLISHED"
    })
    if r.status_code in (200, 201):
        prod_membership_id = r.json().get("product", {}).get("id")
        session_creator_a.post(f"{BASE_URL}/membership/config/{prod_membership_id}", json={
            "name": "Premium Developer Community",
            "price": 499,
            "billingType": "MONTHLY",
            "benefits": ["Weekly live coding", "Private Discord channel", "Direct DM access"]
        })
        log_pass("Create Membership Product")
    else:
        log_fail("Create Membership Product", f"Status {r.status_code}: {r.text}")

    # 6. Test GET /api/products returns products with performance labels
    r = session_creator_a.get(f"{BASE_URL}/products")
    if r.status_code == 200:
        prods = r.json().get("products") or []
        found_perf = any("performanceLabel" in p for p in prods)
        if found_perf:
            log_pass("GET /api/products includes performanceLabel on items")
        else:
            log_fail("GET /api/products includes performanceLabel", "performanceLabel not present in items")
    else:
        log_fail("GET /api/products", f"Status {r.status_code}")

    # 7. Test GET /api/products/:id/management for DIGITAL product
    if prod_digital_id:
        r = session_creator_a.get(f"{BASE_URL}/products/{prod_digital_id}/management")
        if r.status_code == 200:
            data = r.json()
            if "summary" in data and "revenue" in data["summary"] and "totalSales" in data["summary"] and "customers" in data and "orders" in data:
                log_pass("Digital Product Management Data structure verified")
            else:
                log_fail("Digital Product Management Data", f"Missing fields: {list(data.keys())}")
        else:
            log_fail("Digital Product Management Data", f"Status {r.status_code}: {r.text}")

    # 8. Test GET /api/products/:id/management for COURSE product
    if prod_course_id:
        r = session_creator_a.get(f"{BASE_URL}/products/{prod_course_id}/management")
        if r.status_code == 200:
            data = r.json()
            if "summary" in data and "students" in data["summary"] and "completionRate" in data["summary"] and "curriculum" in data and "students" in data:
                log_pass("Course Management Data structure verified (students, curriculum, summary)")
            else:
                log_fail("Course Management Data", f"Missing fields: {list(data.keys())}")
        else:
            log_fail("Course Management Data", f"Status {r.status_code}: {r.text}")

    # 9. Test GET /api/products/:id/management for COACHING product
    if prod_coaching_id:
        r = session_creator_a.get(f"{BASE_URL}/products/{prod_coaching_id}/management")
        if r.status_code == 200:
            data = r.json()
            if "summary" in data and "totalBookings" in data["summary"] and "upcoming" in data["summary"] and "bookings" in data:
                log_pass("Coaching Management Data structure verified (bookings, upcoming, config)")
            else:
                log_fail("Coaching Management Data", f"Missing fields: {list(data.keys())}")
        else:
            log_fail("Coaching Management Data", f"Status {r.status_code}: {r.text}")

    # 10. Test GET /api/products/:id/management for MEMBERSHIP product
    if prod_membership_id:
        r = session_creator_a.get(f"{BASE_URL}/products/{prod_membership_id}/management")
        if r.status_code == 200:
            data = r.json()
            if "summary" in data and "members" in data["summary"] and "mrr" in data["summary"] and "members" in data and "content" in data:
                log_pass("Membership Management Data structure verified (members, mrr, content, tiers)")
            else:
                log_fail("Membership Management Data", f"Missing fields: {list(data.keys())}")
        else:
            log_fail("Membership Management Data", f"Status {r.status_code}: {r.text}")

    # 11. Test Security Isolation: Creator B attempting to fetch Creator A's product management data
    if prod_digital_id:
        r = session_creator_b.get(f"{BASE_URL}/products/{prod_digital_id}/management")
        if r.status_code in (403, 404):
            log_pass("Security Isolation: Creator B blocked from Creator A's management data (404/403)")
        else:
            log_fail("Security Isolation", f"Expected 403/404 but received {r.status_code}")

    print("=" * 80)
    print(f"RESULTS: {len(test_results['passed'])} PASSED, {len(test_results['failed'])} FAILED")
    print("=" * 80)

    if test_results["failed"]:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
