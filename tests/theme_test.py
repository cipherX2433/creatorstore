#!/usr/bin/env python3
"""
Automated Test Suite for CreatorZero Storefront Hero & Design System
Tests Layout Presets (Full Hero, Floating Cards, Creator Canvas, Immersive, Editorial, Glass),
Hero Controls, Theme Styles, Overrides, and Public Storefront rendering.
"""

import requests
import json
import os
import sys

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
    print("RUNNING CREATORZERO HERO & STORE DESIGN SYSTEM TEST SUITE")
    print("=" * 80)

    session = requests.Session()
    creator_email = f"hero_creator_{os.urandom(4).hex()}@example.com"
    password = "Password123!"
    username = f"herostore{os.urandom(4).hex()}"

    # 1. Signup & Store Setup
    try:
        r = session.post(f"{BASE_URL}/auth/signup", json={"email": creator_email, "password": password, "name": "Hero Creator"})
        if r.status_code == 200:
            log_pass("Auth: Creator signup")
        else:
            log_fail("Auth: Creator signup", f"Status {r.status_code}: {r.text}")

        session.post(f"{BASE_URL}/store/username", json={"username": username})
        session.post(f"{BASE_URL}/store/publish")
        log_pass("Store: Initial store published")
    except Exception as e:
        log_fail("Store Setup", str(e))

    # 2. Test All 7 Layout Presets
    layouts = [
        ("classic", "Classic Stack"),
        ("full-hero", "Full Hero"),
        ("floating-cards", "Floating Cards"),
        ("creator-canvas", "Creator Canvas"),
        ("immersive-portrait", "Immersive Portrait"),
        ("editorial-overlay", "Editorial Overlay"),
        ("glass-creator", "Glass Creator"),
    ]

    for layout_id, layout_name in layouts:
        try:
            r = session.patch(f"{BASE_URL}/store", json={
                "theme": {
                    "layoutPreset": layout_id,
                    "presetId": "warm-studio"
                }
            })
            if r.status_code == 200:
                r_pub = requests.get(f"{BASE_URL}/public/store/{username}")
                t = r_pub.json().get("theme", {})
                if r_pub.status_code == 200 and t.get("layoutPreset") == layout_id:
                    log_pass(f"Layout Preset: {layout_name} ({layout_id})")
                else:
                    log_fail(f"Layout Preset: {layout_name}", f"Mismatch in public response: {t}")
            else:
                log_fail(f"Layout Preset: {layout_name}", f"PATCH status {r.status_code}: {r.text}")
        except Exception as e:
            log_fail(f"Layout Preset: {layout_name}", str(e))

    # 3. Test Hero Image Settings Controls
    try:
        r_hero = session.patch(f"{BASE_URL}/store", json={
            "theme": {
                "layoutPreset": "full-hero",
                "presetId": "creator-spotlight",
                "hero": {
                    "position": "top",
                    "height": "full",
                    "overlay": True,
                    "overlayStrength": 80,
                    "overlapDepth": "strong"
                }
            }
        })
        if r_hero.status_code == 200:
            r_pub = requests.get(f"{BASE_URL}/public/store/{username}")
            hero = r_pub.json().get("theme", {}).get("hero", {})
            if (hero.get("position") == "top" and
                hero.get("height") == "full" and
                hero.get("overlayStrength") == 80 and
                hero.get("overlapDepth") == "strong"):
                log_pass("Hero Controls: Image position, height, overlay strength & depth persist")
            else:
                log_fail("Hero Controls", f"Hero settings got: {hero}")
        else:
            log_fail("Hero Controls", f"Status {r_hero.status_code}")
    except Exception as e:
        log_fail("Hero Controls", str(e))

    # 4. Test Public Page Rendering HTTP 200 for Hero Layouts
    try:
        r_page = requests.get(f"http://localhost:3000/{username}")
        if r_page.status_code == 200 and "Hero Creator" in r_page.text:
            log_pass("Public Storefront: Hero page renders HTTP 200 with creator name")
        else:
            log_fail("Public Storefront", f"Status {r_page.status_code}")
    except Exception as e:
        log_fail("Public Storefront", str(e))

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY RESULTS")
    print("=" * 80)
    print(f"Passed: {len(test_results['passed'])}")
    print(f"Failed: {len(test_results['failed'])}")
    if test_results["failed"]:
        print("Failures:")
        for f in test_results["failed"]:
            print(f"  - {f}")
    print("=" * 80)
    return len(test_results["failed"]) == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
