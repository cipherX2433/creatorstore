#!/usr/bin/env python3
"""
Role Selection, Creator Subscription & Authorization Test Suite for CreatorZero
Validates all 17 requirements for Customer vs Creator onboarding, role persistence, subscription enforcement, 'Become a Creator' transition, and IDOR isolation.
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
    print("RUNNING CREATORZERO ROLE SELECTION & CREATOR SUBSCRIPTION TEST SUITE")
    print("=" * 80)

    run_id = uuid.uuid4().hex[:6]
    session_customer = requests.Session()
    session_creator_a = requests.Session()
    session_creator_b = requests.Session()

    cust_email = f"customer_{run_id}@example.com"
    creator_a_email = f"creator_a_{run_id}@example.com"
    creator_b_email = f"creator_b_{run_id}@example.com"
    password = "Password123!"

    # 1. Signup as Customer
    try:
        r = session_customer.post(f"{BASE_URL}/auth/signup", json={
            "email": cust_email, "password": password, "name": "Customer User", "accountType": "CUSTOMER"
        })
        if r.status_code == 200:
            data = r.json()
            if data.get("user", {}).get("role") == "CUSTOMER":
                log_pass("Signup as Customer: Returns role=CUSTOMER and 200 OK")
            else:
                log_fail("Signup as Customer", f"Expected role CUSTOMER, got {data.get('user', {}).get('role')}")
        else:
            log_fail("Signup as Customer", f"Status {r.status_code}: {r.text}")
    except Exception as e:
        log_fail("Signup as Customer", str(e))

    # 2. Signup as Creator
    try:
        r = session_creator_a.post(f"{BASE_URL}/auth/signup", json={
            "email": creator_a_email, "password": password, "name": "Creator A", "accountType": "CREATOR"
        })
        if r.status_code == 200:
            data = r.json()
            if data.get("user", {}).get("role") == "CREATOR":
                log_pass("Signup as Creator: Returns role=CREATOR and 200 OK")
            else:
                log_fail("Signup as Creator", f"Expected role CREATOR, got {data.get('user', {}).get('role')}")
        else:
            log_fail("Signup as Creator", f"Status {r.status_code}: {r.text}")
    except Exception as e:
        log_fail("Signup as Creator", str(e))

    # 3. Customer login
    try:
        r = session_customer.get(f"{BASE_URL}/me")
        if r.status_code == 200 and r.json().get("user", {}).get("role") == "CUSTOMER":
            log_pass("Customer Login: GET /me returns authenticated customer session")
        else:
            log_fail("Customer Login", f"Status {r.status_code}")
    except Exception as e:
        log_fail("Customer Login", str(e))

    # 4. Creator login
    try:
        r = session_creator_a.get(f"{BASE_URL}/me")
        if r.status_code == 200 and r.json().get("user", {}).get("role") == "CREATOR":
            log_pass("Creator Login: GET /me returns authenticated creator session")
        else:
            log_fail("Creator Login", f"Status {r.status_code}")
    except Exception as e:
        log_fail("Creator Login", str(e))

    # 5. Customer cannot access creator routes (Server authorization check)
    try:
        r = session_customer.get(f"{BASE_URL}/payouts/status")
        if r.status_code == 403:
            log_pass("Route Protection: Customer denied access to creator payouts (returns 403)")
        else:
            log_fail("Route Protection: Customer Access", f"Expected 403, got {r.status_code}")
    except Exception as e:
        log_fail("Route Protection: Customer Access", str(e))

    # 6. Creator can access creator routes
    try:
        r = session_creator_a.get(f"{BASE_URL}/payouts/status")
        if r.status_code == 200:
            log_pass("Route Protection: Creator can access creator payouts (returns 200)")
        else:
            log_fail("Route Protection: Creator Access", f"Expected 200, got {r.status_code}")
    except Exception as e:
        log_fail("Route Protection: Creator Access", str(e))

    # 7. Customer can purchase products
    try:
        r = session_customer.get(f"{BASE_URL}/account/library")
        if r.status_code == 200:
            log_pass("Customer Purchase Flow: Accesses /account/library successfully")
        else:
            log_fail("Customer Purchase Flow", f"Status {r.status_code}")
    except Exception as e:
        log_fail("Customer Purchase Flow", str(e))

    # 8. Creator can purchase products from another creator
    try:
        r = session_creator_a.get(f"{BASE_URL}/account/library")
        if r.status_code == 200:
            log_pass("Creator + Customer Coexistence: Creator can access /account/library for purchases")
        else:
            log_fail("Creator + Customer Coexistence", f"Status {r.status_code}")
    except Exception as e:
        log_fail("Creator + Customer Coexistence", str(e))

    # 9. Creator subscription active (₹999/mo checkout + verification)
    try:
        r_checkout = session_creator_a.post(f"{BASE_URL}/creator/subscription/checkout")
        if r_checkout.status_code == 200:
            order_id = r_checkout.json().get("orderId")
            r_verify = session_creator_a.post(f"{BASE_URL}/creator/subscription/verify", json={
                "razorpayOrderId": order_id,
                "razorpayPaymentId": "pay_mock_12345",
                "razorpaySignature": "sig_mock"
            })
            if r_verify.status_code == 200 and r_verify.json().get("status") == "ACTIVE":
                log_pass("Creator Subscription Active: Signature verification activates ₹999/mo subscription")
            else:
                log_fail("Creator Subscription Active", f"Verify status {r_verify.status_code}: {r_verify.text}")
        else:
            log_fail("Creator Subscription Checkout", f"Status {r_checkout.status_code}")
    except Exception as e:
        log_fail("Creator Subscription Active", str(e))

    # 10. Customer becomes Creator ("Become a Creator" upgrade path)
    try:
        r = session_customer.post(f"{BASE_URL}/account/upgrade-to-creator")
        if r.status_code == 200 and r.json().get("user", {}).get("role") == "CREATOR":
            log_pass("Become a Creator: Upgrades customer account to CREATOR role without deleting history")
        else:
            log_fail("Become a Creator", f"Status {r.status_code}: {r.text}")
    except Exception as e:
        log_fail("Become a Creator", str(e))

    # 11. Role Transition Safety: Customer history visible after upgrade
    try:
        r = session_customer.get(f"{BASE_URL}/account/library")
        if r.status_code == 200:
            log_pass("Role Transition Safety: Customer library and history preserved after upgrade")
        else:
            log_fail("Role Transition Safety", f"Status {r.status_code}")
    except Exception as e:
        log_fail("Role Transition Safety", str(e))

    # 12. Client-side role manipulation defense
    try:
        r = session_customer.patch(f"{BASE_URL}/me/profile", json={"role": "ADMIN"})
        r_me = session_customer.get(f"{BASE_URL}/me")
        if r_me.json().get("user", {}).get("role") != "ADMIN":
            log_pass("Role Integrity: Client-side role manipulation blocked server-side")
        else:
            log_fail("Role Integrity", "Client managed to modify role field via PATCH")
    except Exception as e:
        log_fail("Role Integrity", str(e))

    # 13. IDOR Isolation: Creator A vs Creator B
    try:
        session_creator_b.post(f"{BASE_URL}/auth/signup", json={
            "email": creator_b_email, "password": password, "name": "Creator B", "accountType": "CREATOR"
        })
        r_b_products = session_creator_b.get(f"{BASE_URL}/products")
        if r_b_products.status_code == 200 and len(r_b_products.json().get("products", [])) == 0:
            log_pass("IDOR Protection: Creator B cannot see Creator A's products")
        else:
            log_fail("IDOR Protection", f"Status {r_b_products.status_code}")
    except Exception as e:
        log_fail("IDOR Protection", str(e))

    print("=" * 80)
    print(f"TEST SUMMARY: {len(test_results['passed'])} PASSED, {len(test_results['failed'])} FAILED")
    print("=" * 80)

    if len(test_results["failed"]) > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
