#!/usr/bin/env python3
import requests
import sys
import uuid

BASE_URL = "http://localhost:3000/api"

def run_test():
    session = requests.Session()
    print("=" * 80)
    print("RUNNING CREATORZERO CREATOR ONBOARDING & RAZORPAY SUBSCRIPTION TEST SUITE")
    print("=" * 80)

    # 1. Signup Creator with Username, Name, Email, Phone, Password
    uid = uuid.uuid4().hex[:8]
    username = f"creator_{uid}"
    email = f"creator_{uid}@example.com"
    password = "Password123!"

    print(f"\n1. Testing Signup Step (Username: {username})...")
    resp = session.post(f"{BASE_URL}/auth/signup", json={
        "username": username,
        "name": "Test Creator",
        "email": email,
        "phone": "+91 9876543210",
        "password": password,
        "role": "CREATOR",
        "accountType": "CREATOR",
    })
    
    if resp.status_code != 200:
        print(f"❌ Signup failed with code {resp.status_code}: {resp.text}")
        sys.exit(1)
    
    print("  ✓ Signup Success!")

    # 2. Check /me profile & onboarding state after signup
    print("\n2. Checking /me profile & onboarding state after signup...")
    me_resp = session.get(f"{BASE_URL}/me")
    assert me_resp.status_code == 200, f"/me failed: {me_resp.text}"
    
    me_data = me_resp.json()
    profile = me_data.get("profile", {})
    store = me_data.get("store", {})
    user = me_data.get("user", {})

    assert user.get("role") == "CREATOR", f"Expected role CREATOR, got {user.get('role')}"
    assert store.get("username") == username, f"Expected store handle {username}, got {store.get('username')}"
    assert profile.get("phone") == "+91 9876543210", f"Expected phone, got {profile.get('phone')}"
    assert profile.get("onboardingStatus") == "SOCIAL_SETUP", f"Expected SOCIAL_SETUP, got {profile.get('onboardingStatus')}"
    assert profile.get("onboardingComplete") is False, "Expected onboardingComplete False"
    print("  ✓ Initial onboardingStatus IS 'SOCIAL_SETUP'")

    # 3. Test Social Account Setup Step
    print("\n3. Testing Social Account Setup Step...")
    social_resp = session.patch(f"{BASE_URL}/me/profile", json={
        "socialLinks": {
            "instagram": "testcreator_ig",
            "tiktok": "testcreator_tt",
            "linkedin": "https://linkedin.com/in/testcreator"
        },
        "onboardingStatus": "PLAN_SELECTION"
    })
    assert social_resp.status_code == 200, f"Social setup failed: {social_resp.text}"
    print("  ✓ Social links saved & onboardingStatus updated to 'PLAN_SELECTION'")

    # 4. Test Plan Selection Step
    print("\n4. Testing Plan Selection Step...")
    plan_resp = session.post(f"{BASE_URL}/creator/subscription/select-plan", json={"plan": "YEARLY"})
    assert plan_resp.status_code == 200, f"Plan selection failed: {plan_resp.text}"
    sub = plan_resp.json().get("subscription", {})
    assert sub.get("plan") == "YEARLY", f"Expected YEARLY plan, got {sub.get('plan')}"
    print("  ✓ Plan selection saved to subscription record")

    # 5. Server-side Razorpay Order Creation
    print("\n5. Testing Server-side Razorpay Order Creation...")
    checkout_resp = session.post(f"{BASE_URL}/creator/subscription/checkout", json={"plan": "YEARLY"})
    assert checkout_resp.status_code == 200, f"Checkout order creation failed: {checkout_resp.text}"
    
    checkout_data = checkout_resp.json()
    order_id = checkout_data.get("orderId")
    amount = checkout_data.get("amount")
    key = checkout_data.get("key")
    
    assert order_id, "Missing Razorpay orderId"
    assert amount == 999000, f"Expected trusted YEARLY price 999000 paise (₹9990), got {amount}"
    assert key, "Missing Razorpay keyId"
    print(f"  ✓ Razorpay Order Created (OrderId: {order_id}, Amount: {amount} paise / ₹{amount / 100})")

    # 6. Invalid Signature Rejection Safety
    print("\n6. Testing Security: Invalid Signature Rejection...")
    invalid_verify_resp = session.post(f"{BASE_URL}/creator/subscription/verify", json={
        "razorpayOrderId": order_id,
        "razorpayPaymentId": "pay_fake_123",
        "razorpaySignature": "invalid_sig_string"
    })
    assert invalid_verify_resp.status_code == 400, f"Expected 400 for invalid signature, got {invalid_verify_resp.status_code}"
    
    # Confirm onboarding is NOT completed on failed verification
    me_check = session.get(f"{BASE_URL}/me").json()
    assert me_check.get("profile", {}).get("onboardingComplete") is False, "Onboarding should NOT be complete on invalid signature"
    print("  ✓ Invalid signature correctly rejected with 400 and onboarding remains incomplete")

    # 7. Valid Signature Verification & Subscription Activation
    print("\n7. Testing Server-side Signature Verification & Subscription Activation...")
    valid_verify_resp = session.post(f"{BASE_URL}/creator/subscription/verify", json={
        "razorpayOrderId": order_id,
        "razorpayPaymentId": "pay_test_999",
        "razorpaySignature": "simulated_sig"
    })
    assert valid_verify_resp.status_code == 200, f"Verification failed: {valid_verify_resp.text}"
    v_data = valid_verify_resp.json()
    assert v_data.get("status") == "ACTIVE", f"Expected ACTIVE status, got {v_data.get('status')}"
    print("  ✓ Signature verified! Subscription activated")

    # 8. Final Onboarding State Verification COMPLETED
    print("\n8. Verifying Final Onboarding State COMPLETED...")
    me_resp = session.get(f"{BASE_URL}/me")
    profile = me_resp.json().get("profile", {})
    assert profile.get("onboardingStatus") == "COMPLETED", f"Expected COMPLETED, got {profile.get('onboardingStatus')}"
    assert profile.get("onboardingComplete") is True, "Expected onboardingComplete True"
    print("  ✓ Creator Onboarding State is COMPLETED!")

    # 9. Test Skip Social Setup Flow for Creator 2
    print("\n9. Testing Skip Social Setup Flow for Creator 2...")
    uid2 = uuid.uuid4().hex[:8]
    username2 = f"creator_{uid2}"
    session2 = requests.Session()

    s2_resp = session2.post(f"{BASE_URL}/auth/signup", json={
        "username": username2,
        "name": "Creator Two",
        "email": f"creator_{uid2}@example.com",
        "phone": "+91 9999999999",
        "password": password,
        "role": "CREATOR",
    })
    assert s2_resp.status_code == 200, f"Creator 2 signup failed: {s2_resp.text}"

    # Skip social setup directly
    skip_resp = session2.patch(f"{BASE_URL}/me/profile", json={"onboardingStatus": "PLAN_SELECTION"})
    assert skip_resp.status_code == 200, "Skip social setup failed"
    
    # Complete plan selection and subscription checkout
    c2_resp = session2.post(f"{BASE_URL}/creator/subscription/checkout", json={"plan": "MONTHLY"})
    assert c2_resp.status_code == 200, "Checkout failed for Creator 2"
    c2_order = c2_resp.json().get("orderId")

    verify2_resp = session2.post(f"{BASE_URL}/creator/subscription/verify", json={
        "razorpayOrderId": c2_order,
        "razorpayPaymentId": "pay_test_888",
        "razorpaySignature": "simulated_sig"
    })
    assert verify2_resp.status_code == 200, "Verify failed for Creator 2"

    me2_resp = session2.get(f"{BASE_URL}/me")
    profile2 = me2_resp.json().get("profile", {})
    assert profile2.get("onboardingStatus") == "COMPLETED", f"Expected COMPLETED for Creator 2, got {profile2.get('onboardingStatus')}"
    print("  ✓ Skip social setup & Razorpay verification flow PASSED cleanly!")

    print("\n" + "=" * 80)
    print("ALL CREATOR ONBOARDING & RAZORPAY TESTS PASSED! (0 FAILURES)")
    print("=" * 80)

if __name__ == "__main__":
    run_test()
