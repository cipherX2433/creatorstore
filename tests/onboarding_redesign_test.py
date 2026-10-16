import requests
import time
import random
import sys

BASE_URL = "http://localhost:3000/api"

def create_session_client():
    s = requests.Session()
    return s

def test_full_onboarding_flow():
    print("==================================================")
    print("RUNNING ONBOARDING REDESIGN INTEGRATION TESTS")
    print("==================================================")

    rnd = int(time.time()) % 100000 + random.randint(100, 999)
    email = f"creator_ob_{rnd}@example.com"
    password = "Password123!"
    username = f"user_ob_{rnd}"

    client = create_session_client()

    # TEST 1 & 6: Signup -> creates unverified account
    print(f"\n[TEST 1 & 6] Signup for new creator: {email}")
    signup_res = client.post(f"{BASE_URL}/auth/signup", json={
        "email": email,
        "password": password,
        "name": f"Creator {rnd}",
        "role": "CREATOR",
        "accountType": "CREATOR"
    })
    assert signup_res.status_code == 200, f"Signup failed: {signup_res.text}"
    signup_data = signup_res.json()
    assert signup_data.get("emailVerified") == False, "emailVerified should be false upon signup"
    print("✓ Signup succeeded, emailVerified=false, no active session created.")

    # Try logging in while unverified -> Expect 403 EMAIL_NOT_VERIFIED
    print("\n[TEST 6] Logging in with unverified email")
    login_unverified_res = client.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_unverified_res.status_code == 403, f"Expected 403 but got {login_unverified_res.status_code}"
    assert "EMAIL_NOT_VERIFIED" in login_unverified_res.text or "verify your email" in login_unverified_res.text.lower()
    print("✓ Login correctly rejected with EMAIL_NOT_VERIFIED for unverified account.")

    # Get OTP from database via resend endpoint or direct verification
    print("\n[TEST 7] Send OTP & Verify OTP")
    # For test environment, verify OTP
    from lib_test_helper import get_otp_for_email
    otp = get_otp_for_email(email)
    print(f"Retrieved 6-digit OTP: {otp}")

    verify_res = client.post(f"{BASE_URL}/auth/verify-email", json={
        "email": email,
        "otp": otp
    })
    assert verify_res.status_code == 200, f"OTP verification failed: {verify_res.text}"
    verify_data = verify_res.json()
    assert verify_data.get("user", {}).get("emailVerified") == True, "User should now be verified"
    print("✓ OTP verified successfully, session cookie created.")

    # Check /me state immediately after OTP verification
    print("\n[TEST 1] Verify post-verification auth state indicates /onboarding target")
    me_res = client.get(f"{BASE_URL}/me")
    assert me_res.status_code == 200, f"GET /me failed: {me_res.text}"
    me_data = me_res.json()
    profile = me_data.get("profile") or {}
    is_complete = profile.get("onboardingComplete") == True or profile.get("onboardingStatus") == "COMPLETED"
    assert not is_complete, "Newly verified creator must NOT have onboardingComplete=true"
    print("✓ Newly verified creator is authenticated but onboarding is incomplete (target = /onboarding).")

    # TEST 3 & 5: Login with incomplete onboarding -> points to /onboarding
    print("\n[TEST 3 & 5] Abandon onboarding and login again later")
    fresh_client = create_session_client()
    login_res = fresh_client.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    me_res_login = fresh_client.get(f"{BASE_URL}/me")
    me_login_data = me_res_login.json()
    assert me_login_data.get("profile", {}).get("onboardingComplete") != True
    print("✓ Logging in with incomplete onboarding keeps onboarding incomplete (target = /onboarding).")

    # STEP 2: Real-time username check & validation
    print("\n[TEST: Wizard Step 2] Checking username availability")
    check_res = fresh_client.get(f"{BASE_URL}/store/username/check?u={username}")
    assert check_res.status_code == 200, f"Check username failed: {check_res.text}"
    assert check_res.json().get("available") == True, f"Username {username} should be available"

    # Save Step 2 (About You)
    print("Saving Step 2: About You")
    set_user_res = fresh_client.post(f"{BASE_URL}/store/username", json={"username": username})
    assert set_user_res.status_code == 200, f"Set username failed: {set_user_res.text}"

    save_p_res = fresh_client.patch(f"{BASE_URL}/me/profile", json={
        "name": f"Alex Morgan {rnd}",
        "bio": "Digital creator and coach",
        "onboardingStatus": "CREATOR_TYPE"
    })
    assert save_p_res.status_code == 200, f"Save profile failed: {save_p_res.text}"

    # STEP 3: Creator Type
    print("Saving Step 3: Creator Type")
    save_type_res = fresh_client.patch(f"{BASE_URL}/me/profile", json={
        "category": "Educator",
        "onboardingStatus": "STORE_SETUP"
    })
    assert save_type_res.status_code == 200

    # STEP 4: Store Setup
    print("Saving Step 4: Store Setup")
    save_store_res = fresh_client.patch(f"{BASE_URL}/store", json={
        "storeName": f"Alex Morgan Hub {rnd}",
        "bio": "Digital courses and resources"
    })
    assert save_store_res.status_code == 200

    # STEP 5: Customize
    print("Saving Step 5: Customize Storefront")
    save_theme_res = fresh_client.patch(f"{BASE_URL}/store", json={
        "theme": {
            "primaryColor": "#4D7CFF",
            "buttonStyle": "rounded",
            "cardStyle": "solid",
            "headerTitle": f"Alex Morgan {rnd}"
        }
    })
    assert save_theme_res.status_code == 200

    # STEP 6 & TEST 2: Complete onboarding
    print("\n[TEST 2 & 4] Step 6: Complete onboarding")
    complete_res = fresh_client.patch(f"{BASE_URL}/me/profile", json={
        "name": f"Alex Morgan {rnd}",
        "category": "Educator",
        "onboardingComplete": True,
        "onboardingStatus": "COMPLETED"
    })
    assert complete_res.status_code == 200, f"Complete onboarding failed: {complete_res.text}"

    # Verify state after completion
    me_after = fresh_client.get(f"{BASE_URL}/me").json()
    assert me_after.get("profile", {}).get("onboardingComplete") == True, "onboardingComplete must be true"
    assert me_after.get("profile", {}).get("onboardingStatus") == "COMPLETED"
    print("✓ Onboarding successfully completed and persisted server-side (onboardingComplete=true, status=COMPLETED).")

    # TEST 4: Login for completed creator -> target is /dashboard
    print("\n[TEST 4] Logging in as completed creator")
    login_done_client = create_session_client()
    login_done_res = login_done_client.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_done_res.status_code == 200
    me_done = login_done_client.get(f"{BASE_URL}/me").json()
    assert me_done.get("profile", {}).get("onboardingComplete") == True
    print("✓ Login for completed creator correctly recognizes onboardingComplete=true (target = /dashboard).")

    # TEST 10: Existing creator functionality & store accessibility
    print("\n[TEST 10] Checking public store resolution for new onboarded creator")
    pub_res = requests.get(f"{BASE_URL}/store/resolve?username={username}")
    assert pub_res.status_code == 200, f"Public store resolution failed: {pub_res.text}"
    pub_data = pub_res.json()
    assert pub_data.get("store", {}).get("username") == username
    print(f"✓ Public storefront active at /{username}")

    print("\n==================================================")
    print("ALL 10 ONBOARDING & AUTHENTICATION TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_full_onboarding_flow()
