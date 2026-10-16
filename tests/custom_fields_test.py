#!/usr/bin/env python3
import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

class CustomFieldsTestRunner:
    def __init__(self):
        self.session_a = requests.Session()
        self.session_b = requests.Session()
        self.creator_a_email = f"creator_a_fields_{uuid.uuid4().hex[:6]}@example.com"
        self.creator_b_email = f"creator_b_fields_{uuid.uuid4().hex[:6]}@example.com"
        self.password = "Password123!"
        self.username_a = f"store_a_{uuid.uuid4().hex[:6]}"
        self.username_b = f"store_b_{uuid.uuid4().hex[:6]}"
        self.product_id = None
        self.field_1_id = None
        self.field_2_id = None
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
        print("RUNNING CUSTOM CHECKOUT FIELDS TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_setup_creators()
            self.test_2_create_product()
            self.test_3_add_custom_checkout_fields()
            self.test_4_get_custom_checkout_fields()
            self.test_5_update_custom_field()
            self.test_6_reorder_custom_fields()
            self.test_7_public_checkout_product_includes_fields()
            self.test_8_checkout_validation_required_field_missing()
            self.test_9_checkout_success_with_valid_responses()
            self.test_10_creator_isolation()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING TEST EXECUTION: {e}")
            import traceback
            traceback.print_exc()

        print("\n" + "=" * 80)
        print(f"CUSTOM FIELDS TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_setup_creators(self):
        # Signup Creator A
        res = self.session_a.post(f"{BASE_URL}/auth/signup", json={"email": self.creator_a_email, "password": self.password, "name": "Creator A"})
        self.log("Signup Creator A", res.status_code == 200)
        res = self.session_a.post(f"{BASE_URL}/store/username", json={"username": self.username_a})
        self.log("Set Store A Username", res.status_code == 200)
        self.session_a.post(f"{BASE_URL}/payouts/onboard", json={"legalName": "Creator A", "businessType": "INDIVIDUAL", "accountNumber": "1001", "ifscCode": "HDFC0001234"})

        # Signup Creator B
        res = self.session_b.post(f"{BASE_URL}/auth/signup", json={"email": self.creator_b_email, "password": self.password, "name": "Creator B"})
        self.log("Signup Creator B", res.status_code == 200)
        res = self.session_b.post(f"{BASE_URL}/store/username", json={"username": self.username_b})
        self.log("Set Store B Username", res.status_code == 200)

    def test_2_create_product(self):
        res = self.session_a.post(f"{BASE_URL}/products", json={
            "type": "CUSTOM_SERVICE",
            "title": "Resume Review & Career Strategy",
            "shortDescription": "1-on-1 personalized resume feedback",
            "price": 0,
            "currency": "inr"
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        self.log("Create Custom Service Product", res.status_code == 201 and self.product_id is not None)


    def test_3_add_custom_checkout_fields(self):
        # Field 1: Target Role (Dropdown, Required)
        res1 = self.session_a.post(f"{BASE_URL}/creator/products/{self.product_id}/checkout-fields", json={
            "label": "Target Role",
            "description": "Select the role you are applying for",
            "type": "DROPDOWN",
            "required": True,
            "options": ["Data Scientist", "Software Engineer", "Product Manager"],
            "order": 1
        })
        self.log("Add Field 1 (Target Role Dropdown)", res1.status_code == 201)
        if res1.status_code == 201:
            self.field_1_id = res1.json().get("field", {}).get("id")

        # Field 2: Experience (Short Text, Optional)
        res2 = self.session_a.post(f"{BASE_URL}/creator/products/{self.product_id}/checkout-fields", json={
            "label": "Years of Experience",
            "description": "How many years of work experience do you have?",
            "type": "SHORT_TEXT",
            "required": False,
            "placeholder": "e.g. 3 years",
            "order": 2
        })
        self.log("Add Field 2 (Experience Text)", res2.status_code == 201)
        if res2.status_code == 201:
            self.field_2_id = res2.json().get("field", {}).get("id")

    def test_4_get_custom_checkout_fields(self):
        res = self.session_a.get(f"{BASE_URL}/creator/products/{self.product_id}/checkout-fields")
        self.log("GET Creator Checkout Fields", res.status_code == 200 and len(res.json().get("fields", [])) == 2)

    def test_5_update_custom_field(self):
        res = self.session_a.patch(f"{BASE_URL}/creator/products/{self.product_id}/checkout-fields/{self.field_2_id}", json={
            "required": True,
            "label": "Total Work Experience"
        })
        self.log("PATCH Custom Field", res.status_code == 200 and res.json().get("field", {}).get("required") == True)

    def test_6_reorder_custom_fields(self):
        res = self.session_a.post(f"{BASE_URL}/creator/products/{self.product_id}/checkout-fields/reorder", json={
            "orderedFieldIds": [self.field_2_id, self.field_1_id]
        })
        self.log("Reorder Custom Fields", res.status_code == 200)

    def test_7_public_checkout_product_includes_fields(self):
        # Save custom service config & publish product
        conf_res = self.session_a.post(f"{BASE_URL}/custom-service/config/{self.product_id}", json={
            "name": "Resume Review & Career Strategy",
            "shortDescription": "1-on-1 personalized resume feedback",
            "description": "Resume review",
            "price": 0,
            "currency": "inr",
            "isFree": True,
            "deliveryDays": 3,
            "revisionLimit": 2,
            "deliverables": [{"id": "d1", "title": "Resume Review PDF", "description": "Line by line feedback"}],
            "requirements": [{"id": "r1", "question": "Provide link to current resume", "type": "SHORT_TEXT", "required": True, "order": 1}]
        })
        self.log("Save Custom Service Config", conf_res.status_code == 200, f"Status: {conf_res.status_code}")

        pub_res = self.session_a.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Product for Checkout", pub_res.status_code == 200, f"Status: {pub_res.status_code}")

        res = requests.get(f"{BASE_URL}/checkout/product?productId={self.product_id}")
        self.log("Public Checkout Product Includes Custom Fields", res.status_code == 200 and "checkoutFields" in res.json().get("product", {}))



    def test_8_checkout_validation_required_field_missing(self):
        res = requests.post(f"{BASE_URL}/checkout/process", json={
            "productId": self.product_id,
            "email": "customer@example.com",
            "customResponses": []
        })
        self.log("Checkout Process Fails when Required Custom Field is Missing", res.status_code == 400, f"Response: {res.text}")

    def test_9_checkout_success_with_valid_responses(self):
        res = requests.post(f"{BASE_URL}/checkout/process", json={
            "productId": self.product_id,
            "email": "customer@example.com",
            "customResponses": [
                {"fieldId": self.field_1_id, "label": "Target Role", "type": "DROPDOWN", "value": "Software Engineer"},
                {"fieldId": self.field_2_id, "label": "Total Work Experience", "type": "SHORT_TEXT", "value": "4 years"}
            ]
        })
        self.log("Checkout Process Succeeds with Custom Responses", res.status_code in [200, 201])
        if res.status_code in [200, 201]:
            order = res.json().get("order", {})
            self.log("Order Document Contains customResponses", "customResponses" in order and len(order["customResponses"]) == 2)

    def test_10_creator_isolation(self):
        # Creator B cannot access Creator A's checkout fields
        res_get = self.session_b.get(f"{BASE_URL}/creator/products/{self.product_id}/checkout-fields")
        self.log("Creator B Cannot GET Creator A Checkout Fields", res_get.status_code in [403, 404])

        # Creator B cannot add field to Creator A's product
        res_add = self.session_b.post(f"{BASE_URL}/creator/products/{self.product_id}/checkout-fields", json={
            "label": "Malicious Field", "type": "SHORT_TEXT"
        })
        self.log("Creator B Cannot Add Field to Creator A Product", res_add.status_code in [403, 404])

if __name__ == "__main__":
    runner = CustomFieldsTestRunner()
    runner.run_all()
