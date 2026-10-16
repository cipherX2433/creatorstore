import sys
import json
import requests
import uuid

BASE_URL = "http://localhost:3000/api"

def run_tests():
    print("==================================================")
    print("RUNNING CREATORSTORE PHASE 2 VERIFICATION SUITE")
    print("==================================================")

    session_a = requests.Session()
    session_b = requests.Session()

    # 1. Unauthenticated Security Checks
    print("\n1. Testing Unauthenticated Route Protections...")
    res = requests.get(f"{BASE_URL}/automations")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    
    res = requests.get(f"{BASE_URL}/integrations/instagram/account")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("✓ Unauthenticated requests strictly rejected with 401")

    # 2. Signup Creator A & Creator B
    print("\n2. Creating Creator A & Creator B Accounts...")
    email_a = f"creator_a_{uuid.uuid4().hex[:6]}@example.com"
    email_b = f"creator_b_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "TestPassword123!"

    res_a = session_a.post(f"{BASE_URL}/auth/signup", json={
        "email": email_a,
        "password": pwd,
        "name": "Creator Alpha",
        "accountType": "CREATOR"
    })
    assert res_a.status_code == 200, f"Signup A failed: {res_a.text}"
    user_a = res_a.json()["user"]
    print(f"✓ Created Creator A ({user_a['email']})")

    res_b = session_b.post(f"{BASE_URL}/auth/signup", json={
        "email": email_b,
        "password": pwd,
        "name": "Creator Beta",
        "accountType": "CREATOR"
    })
    assert res_b.status_code == 200, f"Signup B failed: {res_b.text}"
    user_b = res_b.json()["user"]
    print(f"✓ Created Creator B ({user_b['email']})")

    # 3. Instagram Account & OAuth Verification
    print("\n3. Testing Instagram Integration & OAuth Routes...")
    res = session_a.get(f"{BASE_URL}/integrations/instagram/account")
    assert res.status_code == 200
    acc_a = res.json()
    assert acc_a["connected"] is False, "Expected new user to not have connected IG"
    print("✓ Initial Instagram status confirmed: Disconnected")

    res = session_a.get(f"{BASE_URL}/integrations/instagram/oauth")
    assert res.status_code == 200
    oauth_data = res.json()
    assert "url" in oauth_data and "oauth/authorize" in oauth_data["url"]
    assert "facebook.com" not in oauth_data["url"]
    assert "enable_fb_login=0" in oauth_data["url"]
    oauth_url = oauth_data["url"]
    print("✓ Instagram OAuth URL generated correctly (https://www.instagram.com/oauth/authorize)")
    assert "instagram_business_basic" in oauth_url
    assert "instagram_business_manage_comments" in oauth_url
    assert "instagram_business_manage_messages" in oauth_url
    print("✓ Meta OAuth URL generated with instagram_business_* scopes")

    # Extract state token from oauth_url
    from urllib.parse import parse_qs, urlparse
    parsed_oauth = urlparse(oauth_url)
    qs = parse_qs(parsed_oauth.query)
    valid_state = qs.get("state", [""])[0]
    assert valid_state, "Expected state token in OAuth URL"
    print("✓ Cryptographically signed state token extracted")

    # Test invalid / tampered state callback
    print("\n4. Testing CSRF Protection & State Validation...")
    invalid_cb = session_a.get(f"{BASE_URL}/integrations/instagram/callback?code=mock_code_123&state=tampered_state_token", allow_redirects=False)
    assert invalid_cb.status_code in [302, 307]
    assert "error=" in invalid_cb.headers.get("Location", "")
    print("✓ Tampered/invalid OAuth state token rejected correctly")

    # Test valid state callback
    callback_url = f"{BASE_URL}/integrations/instagram/callback?code=mock_code_123&state={valid_state}"
    res_cb = session_a.get(callback_url, allow_redirects=False)
    assert res_cb.status_code in [302, 307], f"Expected redirect, got {res_cb.status_code}"
    assert "connected=1" in res_cb.headers.get("Location", "")
    print("✓ Valid OAuth callback processed and redirected to connected-accounts page")

    # Verify Connected Status for Creator A
    res = session_a.get(f"{BASE_URL}/integrations/instagram/account")
    assert res.status_code == 200
    acc_a_connected = res.json()
    assert acc_a_connected["connected"] is True
    assert acc_a_connected["username"].startswith("creator_")
    print(f"✓ Creator A Instagram status: Connected (@{acc_a_connected['username']})")

    # 4. Product Creation for Creator A & Creator B
    print("\n5. Creating Digital Products...")
    res_p_a = session_a.post(f"{BASE_URL}/products", json={
        "title": "AI Prompt Pack 2026",
        "price": 499,
        "type": "DIGITAL_PRODUCT",
        "shortDescription": "Top AI Prompts",
        "storePublished": False
    })
    assert res_p_a.status_code == 201 or res_p_a.status_code == 200, f"Product A failed: {res_p_a.text}"
    prod_a = res_p_a.json()
    prod_a_id = prod_a.get("id") or prod_a.get("product", {}).get("id")
    print(f"✓ Created Digital Product for Creator A (ID: {prod_a_id})")

    res_p_b = session_b.post(f"{BASE_URL}/products", json={
        "title": "Freelance Playbook",
        "price": 0,
        "type": "DIGITAL_PRODUCT",
        "shortDescription": "Free Guide",
        "storePublished": True
    })
    prod_b = res_p_b.json()
    prod_b_id = prod_b.get("id") or prod_b.get("product", {}).get("id")
    print(f"✓ Created Digital Product for Creator B (ID: {prod_b_id})")

    # 5. Testing Automation Validation & Creation
    print("\n6. Testing Automation Validations & Creation...")
    
    # Creator B (not connected IG) attempts to create active automation -> should fail
    res_auto_b_fail = session_b.post(f"{BASE_URL}/automations", json={
        "name": "Beta Campaign",
        "triggerValue": "GUIDE",
        "productId": prod_b_id,
        "destinationType": "CHECKOUT",
        "message": "Here is guide {{product_link}}"
    })
    assert res_auto_b_fail.status_code == 400
    assert "Connect Instagram" in res_auto_b_fail.json()["error"]
    print("✓ Activation blocked when Instagram is not connected")

    # Creator A attempts to create automation referencing Creator B's product -> IDOR Protection
    res_idor = session_a.post(f"{BASE_URL}/automations", json={
        "name": "Hacked Campaign",
        "triggerValue": "HACK",
        "productId": prod_b_id,
        "destinationType": "CHECKOUT",
        "message": "Hack {{product_link}}"
    })
    assert res_idor.status_code == 403, f"Expected 403 IDOR rejection, got {res_idor.status_code}"
    print("✓ IDOR protection verified: Cannot reference another creator's product ID")

    # Creator A creates valid automation
    res_auto_a = session_a.post(f"{BASE_URL}/automations", json={
        "name": "AI Prompt Auto-DM",
        "triggerValue": "PROMPT",
        "productId": prod_a_id,
        "destinationType": "CHECKOUT",
        "message": "Hey! 👋 Here is your AI Prompt Pack: {{product_link}}",
        "status": "ACTIVE"
    })
    assert res_auto_a.status_code == 201, f"Automation creation failed: {res_auto_a.text}"
    auto_a = res_auto_a.json()
    auto_a_id = auto_a["id"]
    assert auto_a["name"] == "AI Prompt Auto-DM"
    assert auto_a["triggerValue"] == "PROMPT"
    assert auto_a["status"] == "ACTIVE"
    print(f"✓ Created Automation for Creator A (ID: {auto_a_id})")

    # 6. IDOR Security Verification on GET / PATCH / DELETE
    print("\n7. Testing IDOR Protections on Automation Endpoints...")
    res_get_b = session_b.get(f"{BASE_URL}/automations/{auto_a_id}")
    assert res_get_b.status_code == 404 or res_get_b.status_code == 403, f"Expected 404/403, got {res_get_b.status_code}"
    
    res_patch_b = session_b.patch(f"{BASE_URL}/automations/{auto_a_id}", json={"name": "Hacked Name"})
    assert res_patch_b.status_code == 404 or res_patch_b.status_code == 403
    
    res_del_b = session_b.delete(f"{BASE_URL}/automations/{auto_a_id}")
    assert res_del_b.status_code == 404 or res_del_b.status_code == 403
    print("✓ IDOR protections confirmed for GET, PATCH, and DELETE operations")

    # 7. Automation Status Toggle & Update
    print("\n8. Testing Status Toggle & Automation Updates...")
    res_toggle = session_a.patch(f"{BASE_URL}/automations/{auto_a_id}", json={"statusOnly": True, "status": "PAUSED"})
    assert res_toggle.status_code == 200
    assert res_toggle.json()["status"] == "PAUSED"
    print("✓ Successfully toggled status to PAUSED")

    res_toggle2 = session_a.patch(f"{BASE_URL}/automations/{auto_a_id}", json={"statusOnly": True, "status": "ACTIVE"})
    assert res_toggle2.status_code == 200
    assert res_toggle2.json()["status"] == "ACTIVE"
    print("✓ Successfully reactivated automation")

    # 8. Meta Webhook Verification & Processing
    print("\n9. Testing Meta Webhook Handler...")
    
    # GET Challenge verification
    res_wh_get = requests.get(f"{BASE_URL}/integrations/instagram/webhook?hub.mode=subscribe&hub.verify_token=creatorstore_webhook_verify_token&hub.challenge=test_challenge_998877")
    assert res_wh_get.status_code == 200
    assert res_wh_get.text == "test_challenge_998877"
    print("✓ Meta Webhook GET challenge verification passed")

    # POST Webhook payload processing
    webhook_payload = {
        "entry": [
            {
                "id": "17841400000000000",
                "changes": [
                    {
                        "field": "comments",
                        "value": {
                            "id": "comment_123",
                            "text": "Send me the PROMPT pack please!",
                            "from": {"id": "user_ig_999", "username": "fan_user"}
                        }
                    }
                ]
            }
        ]
    }
    
    res_wh_post = requests.post(
        f"{BASE_URL}/integrations/instagram/webhook",
        json=webhook_payload,
        headers={"x-meta-event-id": f"evt_{uuid.uuid4().hex[:8]}"}
    )
    assert res_wh_post.status_code == 200
    assert res_wh_post.json().get("received") is True
    print("✓ Meta Webhook POST comment event processed successfully")

    # Deduplication check (Idempotency)
    dup_event_id = f"evt_dup_{uuid.uuid4().hex[:8]}"
    res_wh_post1 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=webhook_payload, headers={"x-meta-event-id": dup_event_id})
    assert res_wh_post1.status_code == 200
    
    res_wh_post2 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=webhook_payload, headers={"x-meta-event-id": dup_event_id})
    assert res_wh_post2.status_code == 200
    assert res_wh_post2.json().get("deduplicated") is True
    print("✓ Webhook event deduplication (idempotency) verified")

    # 9. Clean up / Delete Automation
    print("\n10. Testing Automation Deletion...")
    res_del = session_a.delete(f"{BASE_URL}/automations/{auto_a_id}")
    assert res_del.status_code == 200
    
    res_list = session_a.get(f"{BASE_URL}/automations")
    assert res_list.status_code == 200
    assert len(res_list.json()) == 0
    print("✓ Automation deleted cleanly")

    print("\n==================================================")
    print("ALL PHASE 2 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
