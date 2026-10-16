#!/usr/bin/env python3
import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

class StoreSectionsTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_sec_{uuid.uuid4().hex[:6]}@example.com"
        self.password = "Password123!"
        self.username = f"sec_store_{uuid.uuid4().hex[:6]}"
        self.section_1_id = None
        self.section_2_id = None
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
        print("RUNNING STORE SECTIONS & REORDERING TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_creator()
            self.test_2_add_hero_section()
            self.test_3_add_featured_products_section()
            self.test_4_list_store_sections()
            self.test_5_update_section_visibility()
            self.test_6_reorder_sections()
            self.test_7_public_store_renders_ordered_sections()
            self.test_8_delete_section()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING TEST EXECUTION: {e}")
            import traceback
            traceback.print_exc()

        print("\n" + "=" * 80)
        print(f"STORE SECTIONS TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_creator(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={"email": self.creator_email, "password": self.password, "name": "Store Designer"})
        self.log("Signup Creator", res.status_code == 200)
        res = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)

    def test_2_add_hero_section(self):
        res = self.session.post(f"{BASE_URL}/creator/store/sections", json={
            "type": "HERO",
            "title": "Welcome to My Digital Store",
            "subtitle": "Learn algorithms and build real-world apps",
            "visible": True
        })
        data = res.json()
        sec = data.get("section", {})
        self.section_1_id = sec.get("id")
        self.log("Add HERO Section", res.status_code in [200, 201] and self.section_1_id is not None, f"Status: {res.status_code}, Text: {res.text}")


    def test_3_add_featured_products_section(self):
        res = self.session.post(f"{BASE_URL}/creator/store/sections", json={
            "type": "FEATURED_PRODUCTS",
            "title": "Top Selling Downloads",
            "visible": True
        })
        data = res.json()
        sec = data.get("section", {})
        self.section_2_id = sec.get("id")
        self.log("Add FEATURED_PRODUCTS Section", res.status_code in [200, 201] and self.section_2_id is not None)

    def test_4_list_store_sections(self):
        res = self.session.get(f"{BASE_URL}/creator/store/sections")
        sections = res.json().get("sections", [])
        self.log("List Store Sections", res.status_code == 200 and len(sections) >= 2)

    def test_5_update_section_visibility(self):
        res = self.session.patch(f"{BASE_URL}/creator/store/sections/{self.section_1_id}", json={
            "visible": False,
            "title": "Updated Hero Headline"
        })
        data = res.json()
        sec = data.get("section", {})
        self.log("Update Section Visibility (Hide)", res.status_code == 200 and sec.get("visible") == False)

    def test_6_reorder_sections(self):
        # Swap order: section_2 first, then section_1
        res = self.session.post(f"{BASE_URL}/creator/store/sections/reorder", json={
            "orderedSectionIds": [self.section_2_id, self.section_1_id]
        })
        sections = res.json().get("sections", [])
        self.log("Reorder Sections", res.status_code == 200 and len(sections) >= 2 and sections[0]["id"] == self.section_2_id)

    def test_7_public_store_renders_ordered_sections(self):
        res = requests.get(f"{BASE_URL}/store/public?username={self.username}")
        sections = res.json().get("store", {}).get("sections", [])
        self.log("Public Store Renders Sections", res.status_code == 200 and len(sections) >= 1)

    def test_8_delete_section(self):
        res = self.session.delete(f"{BASE_URL}/creator/store/sections/{self.section_1_id}")
        self.log("Delete Store Section", res.status_code == 200)
        check = self.session.get(f"{BASE_URL}/creator/store/sections")
        sec_ids = [s["id"] for s in check.json().get("sections", [])]
        self.log("Section Removed from Store", self.section_1_id not in sec_ids)


if __name__ == "__main__":
    runner = StoreSectionsTestRunner()
    runner.run_all()
