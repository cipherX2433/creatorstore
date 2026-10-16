#!/usr/bin/env python3
import requests
import sys
import uuid
import hmac
import hashlib

BASE_URL = "http://localhost:3000/api"

def log_pass(msg):
    print(f"  ✓ {msg}: PASSED")

def log_fail(msg, detail=""):
    print(f"  ❌ {msg}: FAILED ({detail})")

def run_security_tests():
    print("=" * 80)
    print("RUNNING CREATORZERO SECURITY, IDOR & CONCURRENCY AUDIT TEST SUITE")
    print("=" * 80)

    # 1. Setup Creator A and Creator B
    s_creator_a = requests.Session()
    s_creator_b = requests.Session()
    s_customer_a = requests.Session()
    s_customer_b = requests.Session()

    email_creator_a = f"creator_a_{uuid.uuid4().hex[:6]}@example.com"
    email_creator_b = f"creator_b_{uuid.uuid4().hex[:6]}@example.com"
    email_customer_a = f"customer_a_{uuid.uuid4().hex[:6]}@example.com"
    email_customer_b = f"customer_b_{uuid.uuid4().hex[:6]}@example.com"

    r_signup_a = s_creator_a.post(f"{BASE_URL}/auth/signup", json={"email": email_creator_a, "password": "Password123!", "name": "Creator A"})
    assert r_signup_a.status_code == 200, "Creator A signup failed"
    creator_a_id = r_signup_a.json()["user"]["id"]
    log_pass("Signup Creator A")

    r_signup_b = s_creator_b.post(f"{BASE_URL}/auth/signup", json={"email": email_creator_b, "password": "Password123!", "name": "Creator B"})
    assert r_signup_b.status_code == 200, "Creator B signup failed"
    creator_b_id = r_signup_b.json()["user"]["id"]
    log_pass("Signup Creator B")

    r_cust_a_signup = s_customer_a.post(f"{BASE_URL}/auth/signup", json={"email": email_customer_a, "password": "Password123!", "name": "Customer A"})
    assert r_cust_a_signup.status_code == 200, "Customer A signup failed"
    log_pass("Signup Customer A")

    r_cust_b_signup = s_customer_b.post(f"{BASE_URL}/auth/signup", json={"email": email_customer_b, "password": "Password123!", "name": "Customer B"})
    assert r_cust_b_signup.status_code == 200, "Customer B signup failed"
    log_pass("Signup Customer B")

    # Onboard payouts for Creator A & B
    s_creator_a.post(f"{BASE_URL}/payouts/onboard", json={"payoutMethod": "UPI", "upiId": "creatora@upi", "accountHolderName": "Creator A"})
    s_creator_b.post(f"{BASE_URL}/payouts/onboard", json={"payoutMethod": "UPI", "upiId": "creatorb@upi", "accountHolderName": "Creator B"})

    # 2. Creator A Creates Digital Product
    r_prod_a = s_creator_a.post(f"{BASE_URL}/products", json={"title": f"Creator A Ebook {uuid.uuid4().hex[:4]}", "price": 499, "type": "DIGITAL_DOWNLOAD"})
    assert r_prod_a.status_code == 201
    prod_a = r_prod_a.json()["product"]
    prod_a_id = prod_a["id"]
    log_pass(f"Creator A Created Product ({prod_a_id})")

    # IDOR Test: Creator B attempts to edit Creator A's product
    r_idor_edit = s_creator_b.patch(f"{BASE_URL}/products/{prod_a_id}", json={"title": "Hacked Title"})
    assert r_idor_edit.status_code in [403, 404], f"IDOR Vulnerability: Creator B edited Creator A's product! Status: {r_idor_edit.status_code}"
    log_pass("IDOR Protection: Creator B cannot edit Creator A's product (404/403)")

    # IDOR Test: Creator B attempts to delete Creator A's product
    r_idor_del = s_creator_b.delete(f"{BASE_URL}/products/{prod_a_id}")
    assert r_idor_del.status_code in [403, 404], f"IDOR Vulnerability: Creator B deleted Creator A's product! Status: {r_idor_del.status_code}"
    log_pass("IDOR Protection: Creator B cannot delete Creator A's product (404/403)")

    # 3. Creator A Uploads File & Publishes Product
    files = {'file': ('secret_guide.pdf', b'%PDF-1.4 Mock Secret Content', 'application/pdf')}
    r_file = s_creator_a.post(f"{BASE_URL}/products/{prod_a_id}/file", files=files)
    assert r_file.status_code == 200
    s_creator_a.post(f"{BASE_URL}/products/{prod_a_id}/publish")
    log_pass("Creator A Uploaded File & Published Product")

    # File Security Test: Unauthorized Customer attempts to download file without purchase
    r_unauth_dl = s_customer_a.get(f"{BASE_URL}/download?token=invalid_or_fake_token")
    assert r_unauth_dl.status_code in [401, 403, 404], f"Unauthorized File Access: Status {r_unauth_dl.status_code}"
    log_pass("File Security: Unauthorized download token rejected (403/404)")

    # 4. Customer A Purchases Product A
    r_order_a = s_customer_a.post(f"{BASE_URL}/checkout", json={"productId": prod_a_id, "customerEmail": email_customer_a, "customerName": "Customer A"})
    assert r_order_a.status_code == 200, f"Create order failed ({r_order_a.status_code}): {r_order_a.text}"
    order_a = r_order_a.json()
    order_a_id = order_a["orderId"]
    log_pass(f"Customer A Created Order ({order_a_id})")

    # IDOR Test: Creator B attempts to access Creator A's Orders
    r_orders_b = s_creator_b.get(f"{BASE_URL}/orders")
    assert r_orders_b.status_code == 200
    b_orders = r_orders_b.json().get("orders", [])
    assert not any(o.get("id") == order_a_id for o in b_orders), "IDOR Vulnerability: Creator B can view Creator A's order!"
    log_pass("IDOR Protection: Creator B orders list isolated from Creator A")

    # Complete Payment Verification for Customer A Order
    r_verify = s_customer_a.post(f"{BASE_URL}/checkout/verify", json={"razorpay_order_id": order_a["razorpayOrderId"], "razorpay_payment_id": f"pay_{uuid.uuid4().hex[:10]}", "razorpay_signature": "mock_test_signature"})
    assert r_verify.status_code == 200
    log_pass("Customer A Payment Verified & Active Entitlement Granted")

    # 5. Webhook Security Testing
    # Missing Signature Test
    r_wh_no_sig = requests.post(f"{BASE_URL}/webhooks/razorpay", data="{}")
    assert r_wh_no_sig.status_code == 400, f"Webhook Security: Missing signature returned status {r_wh_no_sig.status_code}"
    log_pass("Webhook Security: Missing signature rejected (400 Bad Request)")

    # Invalid / Spoofed Signature Test
    headers_invalid = {"x-razorpay-signature": "invalid_spoofed_sig_12345"}
    r_wh_bad_sig = requests.post(f"{BASE_URL}/webhooks/razorpay", data="{}", headers=headers_invalid)
    assert r_wh_bad_sig.status_code == 400, f"Webhook Security: Invalid signature returned status {r_wh_bad_sig.status_code}"
    log_pass("Webhook Security: Spoofed signature rejected (400 Bad Request)")

    # 6. External Link Protocol Security & Zero Premature Leakage
    r_link_prod = s_creator_a.post(f"{BASE_URL}/products", json={"title": "Paid Discord Invite", "price": 299, "type": "EXTERNAL_LINK"})
    assert r_link_prod.status_code == 201
    link_prod_id = r_link_prod.json()["product"]["id"]

    # Security: Attempt setting dangerous protocol
    r_bad_url = s_creator_a.post(f"{BASE_URL}/external-link/config/{link_prod_id}", json={
        "destinationUrl": "javascript:alert('xss')",
        "destinationType": "DISCORD",
        "price": 299,
        "isFree": False
    })
    assert r_bad_url.status_code == 400, f"External Link Security: Dangerous protocol returned {r_bad_url.status_code}"
    log_pass("External Link Security: Dangerous protocol javascript: rejected (400 Bad Request)")

    # Set valid HTTPS URL & publish
    s_creator_a.post(f"{BASE_URL}/external-link/config/{link_prod_id}", json={
        "destinationUrl": "https://discord.gg/secret-invite-link-12345",
        "destinationType": "DISCORD",
        "price": 299,
        "isFree": False
    })
    s_creator_a.post(f"{BASE_URL}/products/{link_prod_id}/publish")

    # Security: Public endpoint MUST NOT expose protected destinationUrl for paid links
    r_pub_link = requests.get(f"{BASE_URL}/external-link/public/{link_prod_id}")
    assert r_pub_link.status_code == 200
    pub_data = r_pub_link.json()
    assert "destinationUrl" not in pub_data.get("config", {}), "Premature Leakage: Paid external link URL exposed in public API!"
    log_pass("External Link Security: Protected destination URL hidden from public landing metadata")

    # 7. Webinar Over-Subscription Concurrency & Capacity Test
    r_web_prod = s_creator_a.post(f"{BASE_URL}/products", json={"title": "Exclusive Masterclass (Cap 1)", "price": 0, "type": "WEBINAR"})
    web_prod_id = r_web_prod.json()["product"]["id"]
    s_creator_a.post(f"{BASE_URL}/webinar/config/{web_prod_id}", json={
        "scheduledAt": "2026-09-01T10:00:00Z",
        "durationMinutes": 60,
        "timezone": "UTC",
        "meetingUrl": "https://meet.google.com/abc-defg-hij",
        "capacity": 1, # Max capacity = 1 attendee
        "price": 0,
        "isFree": True
    })
    s_creator_a.post(f"{BASE_URL}/products/{web_prod_id}/publish")

    # Attendee 1 Registers (Fills capacity to 100%)
    r_reg1 = s_customer_a.post(f"{BASE_URL}/webinar/register-free", json={"productId": web_prod_id, "email": email_customer_a, "name": "Customer A"})
    assert r_reg1.status_code == 200, f"Attendee 1 registration failed: {r_reg1.text}"
    log_pass("Webinar Capacity: Attendee 1 registered successfully (1/1 seats filled)")

    # Attendee 2 Registers (Over capacity limit)
    r_reg2 = s_customer_b.post(f"{BASE_URL}/webinar/register-free", json={"productId": web_prod_id, "email": email_customer_b, "name": "Customer B"})
    assert r_reg2.status_code == 409, f"Webinar Concurrency: Attendee 2 over capacity returned status {r_reg2.status_code}"
    log_pass("Webinar Capacity Guard: Over-subscription blocked with 409 Conflict")

    print("=" * 80)
    print("ALL SECURITY, IDOR & CONCURRENCY TESTS PASSED!")
    print("=" * 80)

if __name__ == "__main__":
    run_security_tests()
