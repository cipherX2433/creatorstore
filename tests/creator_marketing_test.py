#!/usr/bin/env python3
"""
Creator Marketing Engine & Growth Suite Test Suite for CreatorZero
Validates Lead Magnets, Coupons, Bundles, Reviews, Funnels, Landing Pages, Email Broadcasts, Affiliates, Tracking Pixels, and IDOR isolation.
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
    print("RUNNING CREATORZERO CREATOR MARKETING ENGINE TEST SUITE")
    print("=" * 80)

    run_id = uuid.uuid4().hex[:6]
    session_creator = requests.Session()
    session_creator_b = requests.Session()
    session_customer = requests.Session()

    creator_email = f"marketing_creator_{run_id}@example.com"
    creator_b_email = f"marketing_creator_b_{run_id}@example.com"
    customer_email = f"marketing_cust_{run_id}@example.com"
    password = "Password123!"

    # 1. Signup Creator
    r = session_creator.post(f"{BASE_URL}/auth/signup", json={"email": creator_email, "password": password, "name": "Marketing Creator", "accountType": "CREATOR"})
    if r.status_code == 200:
        log_pass("Creator Signup: Created creator account")
    else:
        log_fail("Creator Signup", f"Status {r.status_code}")

    # 2. Signup Customer
    r = session_customer.post(f"{BASE_URL}/auth/signup", json={"email": customer_email, "password": password, "name": "Marketing Customer", "accountType": "CUSTOMER"})
    if r.status_code == 200:
        log_pass("Customer Signup: Created customer account")
    else:
        log_fail("Customer Signup", f"Status {r.status_code}")

    # 3. Lead Capture & Lead CRM
    try:
        me = session_creator.get(f"{BASE_URL}/me").json()
        creator_id = me["user"]["id"]

        r_cap = requests.post(f"{BASE_URL}/leads/capture", json={
            "creatorId": creator_id,
            "email": f"visitor_{run_id}@example.com",
            "name": "Visitor Lead",
            "leadMagnetTitle": "Free DSA Roadmap"
        })
        if r_cap.status_code == 200 and r_cap.json().get("lead", {}).get("email") == f"visitor_{run_id}@example.com":
            log_pass("Lead Capture: Public lead magnet submission captures email and creates lead")
        else:
            log_fail("Lead Capture", f"Status {r_cap.status_code}")

        r_leads = session_creator.get(f"{BASE_URL}/leads")
        if r_leads.status_code == 200 and len(r_leads.json().get("items", [])) > 0:
            log_pass("Leads Dashboard: Creator can retrieve captured leads list")
        else:
            log_fail("Leads Dashboard", f"Status {r_leads.status_code}")
    except Exception as e:
        log_fail("Leads Engine", str(e))

    # 4. Coupon Creation & Server-side Validation
    try:
        r_cpn = session_creator.post(f"{BASE_URL}/coupons", json={
            "code": f"SAVE50_{run_id}",
            "type": "PERCENTAGE",
            "discount": 50
        })
        if r_cpn.status_code == 200:
            log_pass("Coupons: Creator can create percentage discount coupon")
        else:
            log_fail("Coupons", f"Status {r_cpn.status_code}")

        r_val = requests.post(f"{BASE_URL}/checkout/validate-coupon", json={
            "creatorId": creator_id,
            "code": f"SAVE50_{run_id}",
            "basePrice": 2000
        })
        if r_val.status_code == 200 and r_val.json().get("finalPrice") == 1000:
            log_pass("Server-side Financial Safety: Coupon discount validated server-side (₹2000 -> ₹1000)")
        else:
            log_fail("Coupon Validation", f"Status {r_val.status_code}: {r_val.text}")
    except Exception as e:
        log_fail("Coupons Engine", str(e))

    # 5. Landing Pages
    try:
        slug = f"offer-{run_id}"
        r_lp = session_creator.post(f"{BASE_URL}/landing-pages", json={
            "headline": "Master Python Web APIs",
            "slug": slug
        })
        if r_lp.status_code == 200:
            r_pub_lp = requests.get(f"{BASE_URL}/landing-pages/slug/{slug}")
            if r_pub_lp.status_code == 200 and r_pub_lp.json().get("page", {}).get("headline") == "Master Python Web APIs":
                log_pass("Landing Pages: Creator can publish & public visitors can view offer landing page")
            else:
                log_fail("Public Landing Page", f"Status {r_pub_lp.status_code}")
        else:
            log_fail("Landing Pages", f"Status {r_lp.status_code}")
    except Exception as e:
        log_fail("Landing Pages", str(e))

    # 6. Email Broadcasts
    try:
        r_email = session_creator.post(f"{BASE_URL}/email/broadcasts", json={
            "subject": "New Live Webinar Announcement!",
            "content": "Join us live this Saturday."
        })
        if r_email.status_code == 200:
            log_pass("Email Broadcasts: Creator can send email campaign to audience")
        else:
            log_fail("Email Broadcasts", f"Status {r_email.status_code}")
    except Exception as e:
        log_fail("Email Engine", str(e))

    # 7. Tracking Pixels Configuration
    try:
        r_trk = session_creator.post(f"{BASE_URL}/tracking", json={
            "gaId": "G-123456789",
            "metaPixelId": "123456789012345"
        })
        if r_trk.status_code == 200 and r_trk.json().get("tracking", {}).get("gaId") == "G-123456789":
            log_pass("Tracking Pixels: Creator can safely configure GA and Meta Pixel IDs")
        else:
            log_fail("Tracking Pixels", f"Status {r_trk.status_code}")
    except Exception as e:
        log_fail("Tracking Pixels", str(e))

    # 8. Verify Removed Marketing Endpoints Return 404
    try:
        r_bnd = session_creator.get(f"{BASE_URL}/bundles")
        r_rev = session_creator.get(f"{BASE_URL}/reviews")
        r_fnl = session_creator.get(f"{BASE_URL}/funnels")
        r_aff = session_creator.get(f"{BASE_URL}/affiliates")

        if r_bnd.status_code == 404 and r_rev.status_code == 404 and r_fnl.status_code == 404 and r_aff.status_code == 404:
            log_pass("Removed Marketing Features: /bundles, /reviews, /funnels, /affiliates all return 404")
        else:
            log_fail("Removed Endpoints Verification", f"Statuses: Bundles={r_bnd.status_code}, Reviews={r_rev.status_code}, Funnels={r_fnl.status_code}, Affiliates={r_aff.status_code}")
    except Exception as e:
        log_fail("Removed Endpoints Verification", str(e))

    # 10. IDOR Security Isolation (Creator B cannot view Creator A's marketing data)
    try:
        session_creator_b.post(f"{BASE_URL}/auth/signup", json={"email": creator_b_email, "password": password, "name": "Creator B", "accountType": "CREATOR"})
        r_b_leads = session_creator_b.get(f"{BASE_URL}/leads")
        if r_b_leads.status_code == 200 and len(r_b_leads.json().get("items", [])) == 0:
            log_pass("IDOR Protection: Creator B cannot access Creator A's leads")
        else:
            log_fail("IDOR Protection", f"Status {r_b_leads.status_code}")
    except Exception as e:
        log_fail("IDOR Protection", str(e))

    print("=" * 80)
    print(f"TEST SUMMARY: {len(test_results['passed'])} PASSED, {len(test_results['failed'])} FAILED")
    print("=" * 80)

    if len(test_results["failed"]) > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
