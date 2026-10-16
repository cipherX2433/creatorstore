#!/usr/bin/env python3
import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

class CustomServiceTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.creator_email = f"creator_cs_{uuid.uuid4().hex[:6]}@example.com"
        self.creator_password = "Password123!"
        self.customer_email_free = f"cust_cs_free_{uuid.uuid4().hex[:6]}@example.com"
        self.customer_email_paid = f"cust_cs_paid_{uuid.uuid4().hex[:6]}@example.com"
        self.username = f"cs_store_{uuid.uuid4().hex[:6]}"
        self.product_id = None
        self.order_id = None
        self.razorpay_order_id = None
        self.request_id = None
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
        print("RUNNING CREATORZERO CUSTOM SERVICE (BESPOKE DELIVERABLES) TEST SUITE")
        print("=" * 80)

        try:
            self.test_1_signup_creator()
            self.test_2_create_custom_service_product()
            self.test_3_publish_blocked_without_requirements()
            self.test_4_save_custom_service_config()
            self.test_5_publish_custom_service_product()
            self.test_6_public_custom_service_landing_endpoint()
            self.test_7_free_custom_service_request()
            self.test_8_paid_custom_service_checkout_and_payment()
            self.test_9_creator_request_clarification()
            self.test_10_customer_clarification_response()
            self.test_11_creator_first_deliverable_submission()
            self.test_12_customer_first_revision_request()
            self.test_13_creator_second_deliverable_submission()
            self.test_14_customer_second_revision_request()
            self.test_15_revision_limit_enforcement()
            self.test_16_creator_final_delivery_and_customer_acceptance()
            self.test_17_creator_internal_notes_security()
            self.test_18_customer_requests_list()
            self.test_19_creator_requests_list()
            self.test_20_creator_analytics()
        except Exception as e:
            print(f"\nCRITICAL FAILURE DURING SUITE EXECUTION: {e}")

        print("\n" + "=" * 80)
        print(f"CUSTOM SERVICE TEST RESULTS: {self.passed} Passed, {self.failed} Failed")
        print("=" * 80)
        if self.failed > 0:
            sys.exit(1)

    def test_1_signup_creator(self):
        res = self.session.post(f"{BASE_URL}/auth/signup", json={
            "email": self.creator_email,
            "password": self.creator_password,
            "name": "Custom Service Creator"
        })
        self.log("Signup Creator", res.status_code == 200)

        res = self.session.post(f"{BASE_URL}/store/username", json={"username": self.username})
        self.log("Set Store Username", res.status_code == 200)

        res = self.session.post(f"{BASE_URL}/payouts/onboard", json={
            "legalName": "Custom Service Creator",
            "businessType": "INDIVIDUAL",
            "accountNumber": "98765432101",
            "ifscCode": "HDFC0001234"
        })
        self.log("Onboard Payouts", res.status_code == 200)

    def test_2_create_custom_service_product(self):
        res = self.session.post(f"{BASE_URL}/products", json={
            "type": "CUSTOM_PRODUCT",
            "title": "Resume Review",
            "shortDescription": "Detailed resume review and ATS optimization",
            "price": 1499,
            "currency": "inr"
        })
        data = res.json()
        self.product_id = data.get("product", {}).get("id")
        self.log("Create Custom Service Product", res.status_code == 201 and self.product_id is not None, f"ID: {self.product_id}")

    def test_3_publish_blocked_without_requirements(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Blocked Without Requirements", res.status_code == 400)

    def test_4_save_custom_service_config(self):
        res = self.session.post(f"{BASE_URL}/custom-service/config/{self.product_id}", json={
            "name": "Resume Review",
            "shortDescription": "Get a detailed review of your resume with actionable feedback.",
            "description": "I will review your resume and provide detailed feedback on structure, ATS optimization, and achievements.",
            "category": "Career",
            "tags": ["#resume", "#career", "#ats"],
            "price": 1499,
            "currency": "inr",
            "isFree": False,
            "deliveryDays": 3,
            "revisionLimit": 2,
            "deliverables": [
                {"id": "d1", "title": "Detailed Resume Review PDF", "description": "Line by line feedback"},
                {"id": "d2", "title": "ATS Keyword Checklist", "description": "Optimization recommendations"}
            ],
            "scopeIncluded": "Resume up to 2 pages, ATS keyword optimization",
            "scopeExcluded": "Resume rewriting from scratch, LinkedIn bio creation",
            "requirements": [
                {"id": "r1", "label": "Current Resume File", "description": "Upload PDF or DOCX file link", "type": "FILE_UPLOAD", "required": True},
                {"id": "r2", "label": "Target Job Role", "description": "Role you are applying for", "type": "SHORT_TEXT", "required": True}
            ],
            "maxActiveRequests": 10,
            "cancellationPolicy": "ALLOW_BEFORE_START"
        })
        self.log("Save Custom Service Config", res.status_code == 200)

    def test_5_publish_custom_service_product(self):
        res = self.session.post(f"{BASE_URL}/products/{self.product_id}/publish")
        self.log("Publish Custom Service Product", res.status_code == 200)

    def test_6_public_custom_service_landing_endpoint(self):
        res = requests.get(f"{BASE_URL}/custom-service/public/{self.product_id}")
        data = res.json()
        config = data.get("config", {})
        self.log("Public Custom Service Landing Endpoint", res.status_code == 200 and config.get("name") == "Resume Review" and len(config.get("requirements", [])) == 2)

    def test_7_free_custom_service_request(self):
        # Create a second free custom service
        res_p = self.session.post(f"{BASE_URL}/products", json={"type": "CUSTOM_PRODUCT", "title": "Free Portfolio Audit", "price": 0})
        free_id = res_p.json().get("product", {}).get("id")
        self.session.post(f"{BASE_URL}/custom-service/config/{free_id}", json={
            "name": "Free Portfolio Audit",
            "price": 0,
            "isFree": True,
            "deliveryDays": 2,
            "revisionLimit": 1,
            "requirements": [{"id": "r1", "label": "Portfolio URL", "type": "SHORT_TEXT", "required": True}]
        })
        self.session.post(f"{BASE_URL}/products/{free_id}/publish")

        # Submit free request
        res_sub = requests.post(f"{BASE_URL}/custom-service/submit-free", json={
            "productId": free_id,
            "name": "Free Customer",
            "email": self.customer_email_free,
            "answers": [{"questionId": "r1", "questionText": "Portfolio URL", "answer": "https://myportfolio.com"}]
        })
        req = res_sub.json().get("request", {})
        self.log("Free Custom Service Request Submission", res_sub.status_code == 200 and req.get("status") == "SUBMITTED")

    def test_8_paid_custom_service_checkout_and_payment(self):
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
            "razorpay_payment_id": f"pay_cs_{uuid.uuid4().hex[:6]}",
            "razorpay_signature": "mock_signature"
        })
        self.log("Paid Custom Service Checkout & Payment Verification", res_ver.status_code == 200 and res_ver.json().get("success") == True)

        # Get request ID
        res_reqs = self.session.get(f"{BASE_URL}/custom-service/creator/requests?productId={self.product_id}")
        items = res_reqs.json().get("items", [])
        if len(items) > 0:
            self.request_id = items[0].get("id")

    def test_9_creator_request_clarification(self):
        if not self.request_id:
            self.log("Creator Request Clarification", False, "No request ID")
            return
        res = self.session.post(f"{BASE_URL}/custom-service/creator/clarification", json={
            "requestId": self.request_id,
            "message": "Please specify which target company roles you want ATS keywords optimized for."
        })
        req = res.json().get("request", {})
        self.log("Creator Request Clarification", res.status_code == 200 and req.get("status") == "CLARIFICATION_REQUIRED")

    def test_10_customer_clarification_response(self):
        if not self.request_id:
            return
        res = requests.post(f"{BASE_URL}/custom-service/requests/{self.request_id}/clarification-response?email={self.customer_email_paid}", json={
            "message": "Targeting Senior Software Engineer roles at Google and Meta."
        })
        req = res.json().get("request", {})
        self.log("Customer Clarification Response", res.status_code == 200 and req.get("status") == "IN_PROGRESS")

    def test_11_creator_first_deliverable_submission(self):
        if not self.request_id:
            return
        res = self.session.post(f"{BASE_URL}/custom-service/creator/delivery", json={
            "requestId": self.request_id,
            "message": "Here is your detailed resume review and ATS keyword feedback.",
            "files": [{"name": "Resume_Review_v1.pdf", "url": "https://example.com/resume_review_v1.pdf"}]
        })
        req = res.json().get("request", {})
        self.log("Creator First Deliverable Submission", res.status_code == 200 and req.get("status") == "DELIVERED")

    def test_12_customer_first_revision_request(self):
        if not self.request_id:
            return
        res = requests.post(f"{BASE_URL}/custom-service/requests/{self.request_id}/revision?email={self.customer_email_paid}", json={
            "message": "Please focus more on system design metrics in the experience section."
        })
        req = res.json().get("request", {})
        self.log("Customer First Revision Request (Used: 1/2)", res.status_code == 200 and req.get("status") == "REVISION_REQUESTED" and req.get("usedRevisions") == 1)

    def test_13_creator_second_deliverable_submission(self):
        if not self.request_id:
            return
        res = self.session.post(f"{BASE_URL}/custom-service/creator/delivery", json={
            "requestId": self.request_id,
            "message": "Updated review with system design metrics highlighted.",
            "files": [{"name": "Resume_Review_v2.pdf", "url": "https://example.com/resume_review_v2.pdf"}]
        })
        req = res.json().get("request", {})
        self.log("Creator Second Deliverable Submission", res.status_code == 200 and req.get("status") == "DELIVERED")

    def test_14_customer_second_revision_request(self):
        if not self.request_id:
            return
        res = requests.post(f"{BASE_URL}/custom-service/requests/{self.request_id}/revision?email={self.customer_email_paid}", json={
            "message": "One minor fix: please update the summary statement phrasing."
        })
        req = res.json().get("request", {})
        self.log("Customer Second Revision Request (Used: 2/2)", res.status_code == 200 and req.get("status") == "REVISION_REQUESTED" and req.get("usedRevisions") == 2)

    def test_15_revision_limit_enforcement(self):
        if not self.request_id:
            return
        # Submit delivery 3
        self.session.post(f"{BASE_URL}/custom-service/creator/delivery", json={
            "requestId": self.request_id,
            "message": "Final updated review v3.",
            "files": [{"name": "Resume_Review_v3.pdf", "url": "https://example.com/resume_review_v3.pdf"}]
        })
        # Attempt 3rd revision request when limit is 2
        res = requests.post(f"{BASE_URL}/custom-service/requests/{self.request_id}/revision?email={self.customer_email_paid}", json={
            "message": "Can you do one more revision?"
        })
        self.log("Revision Limit Enforcement (400 Bad Request when limit reached)", res.status_code == 400)

    def test_16_creator_final_delivery_and_customer_acceptance(self):
        if not self.request_id:
            return
        res = requests.post(f"{BASE_URL}/custom-service/requests/{self.request_id}/accept?email={self.customer_email_paid}")
        req = res.json().get("request", {})
        self.log("Customer Delivery Acceptance -> COMPLETED", res.status_code == 200 and req.get("status") == "COMPLETED")

    def test_17_creator_internal_notes_security(self):
        if not self.request_id:
            return
        # Update internal notes as creator
        res_notes = self.session.post(f"{BASE_URL}/custom-service/creator/notes", json={
            "requestId": self.request_id,
            "internalNotes": "Client has strong technical skills; target senior software engineer role."
        })
        self.log("Update Creator Internal Notes", res_notes.status_code == 200)

        # Check customer API hides internal notes
        res_cust = requests.get(f"{BASE_URL}/custom-service/requests/{self.request_id}?email={self.customer_email_paid}")
        req_cust = res_cust.json().get("request", {})
        self.log("Creator Internal Notes Security (Hidden from customer API)", res_cust.status_code == 200 and "internalNotes" not in req_cust)

    def test_18_customer_requests_list(self):
        res = requests.get(f"{BASE_URL}/custom-service/student/requests?email={self.customer_email_paid}")
        items = res.json().get("items", [])
        self.log("Customer Service Requests List Endpoint", res.status_code == 200 and len(items) >= 1)

    def test_19_creator_requests_list(self):
        res = self.session.get(f"{BASE_URL}/custom-service/creator/requests?productId={self.product_id}")
        items = res.json().get("items", [])
        self.log("Creator Service Requests List Endpoint", res.status_code == 200 and len(items) >= 1)

    def test_20_creator_analytics(self):
        res = self.session.get(f"{BASE_URL}/custom-service/creator/analytics")
        data = res.json()
        self.log("Creator Service Analytics Calculation", res.status_code == 200 and data.get("totalRequests") >= 1)

if __name__ == "__main__":
    runner = CustomServiceTestRunner()
    runner.run_all()
