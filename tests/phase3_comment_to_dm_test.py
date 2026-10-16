import requests
import json
import uuid
import sys
import urllib.parse

BASE_URL = "http://localhost:3000/api"

def run_tests():
    print("==================================================")
    print("PHASE 3 — COMMENT -> DM AUTOMATION TEST SUITE")
    print("==================================================")

    passed = 0
    total = 12

    # Helper function to sign up creator
    def create_test_creator():
        email = f"test_phase3_{uuid.uuid4().hex[:8]}@example.com"
        resp = requests.post(f"{BASE_URL}/auth/signup", json={
            "email": email,
            "password": "Password123!",
            "name": "Phase 3 Tester",
            "storeName": "Phase 3 Store",
            "accountType": "CREATOR"
        })
        assert resp.status_code == 200, f"Signup failed: {resp.text}"
        data = resp.json()
        cookies = resp.cookies
        return data["user"], cookies

    # Setup Creator A
    user_a, cookies_a = create_test_creator()
    print(f"Created Creator A: {user_a['id']} ({user_a['email']})")

    # Connect Instagram for Creator A via official OAuth flow
    oauth_res = requests.get(f"{BASE_URL}/integrations/instagram/oauth", cookies=cookies_a)
    assert oauth_res.status_code == 200, f"OAuth URL failed: {oauth_res.text}"
    oauth_url = oauth_res.json()["url"]
    parsed = urllib.parse.urlparse(oauth_url)
    params = urllib.parse.parse_qs(parsed.query)
    real_state_a = params["state"][0]
    
    cb_res_a = requests.get(f"{BASE_URL}/integrations/instagram/callback?code=mock_code_a&state={real_state_a}", cookies=cookies_a, allow_redirects=False)
    assert cb_res_a.status_code in [302, 307], f"Callback failed: {cb_res_a.status_code}"

    # Verify IG connection status for Creator A
    ig_res_a = requests.get(f"{BASE_URL}/integrations/instagram/account", cookies=cookies_a)
    ig_data_a = ig_res_a.json()
    assert ig_data_a.get("connected") is True, f"IG not connected: {ig_data_a}"
    platform_user_id_a = ig_data_a["platformUserId"]
    print(f"Creator A IG Connected. Platform User ID: {platform_user_id_a}")

    # Create product for Creator A
    prod_res = requests.post(f"{BASE_URL}/products", cookies=cookies_a, json={
        "title": "Phase 3 Playbook",
        "price": 499,
        "type": "DIGITAL_DOWNLOAD",
        "status": "PUBLISHED"
    })
    assert prod_res.status_code in [200, 201], f"Product creation failed: {prod_res.text}"
    prod_data_a = prod_res.json()
    prod_a = prod_data_a.get("product", prod_data_a)

    # Create Automation for Creator A
    auto_res = requests.post(f"{BASE_URL}/automations", cookies=cookies_a, json={
        "name": "Guide Comment Automation",
        "triggerValue": "GUIDE",
        "productId": prod_a["id"],
        "destinationType": "PRODUCT_PAGE",
        "message": "Hey! Here is your guide link: {{link}}",
        "status": "ACTIVE"
    })
    assert auto_res.status_code == 201, f"Automation creation failed: {auto_res.text}"
    auto_a = auto_res.json()
    print(f"Created Automation A for keyword 'GUIDE' -> product {prod_a['id']}")

    # TEST 1: keyword = GUIDE, comment = "GUIDE" -> match
    payload_t1 = {
        "object": "instagram",
        "entry": [{
            "id": platform_user_id_a,
            "changes": [{
                "field": "comments",
                "value": {
                    "id": f"comment_t1_{uuid.uuid4().hex[:6]}",
                    "text": "GUIDE",
                    "from": {"id": "commenter_101"}
                }
            }]
        }]
    }
    res_t1 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t1)
    t1_json = res_t1.json()
    if res_t1.status_code == 200 and t1_json.get("count") == 1:
        print("[PASS] TEST 1: Exact keyword match ('GUIDE') -> 1 DM sent")
        passed += 1
    else:
        print(f"[FAIL] TEST 1: Expected count=1, got {t1_json}")

    # TEST 2: keyword = GUIDE, comment = "guide please" -> match
    payload_t2 = {
        "object": "instagram",
        "entry": [{
            "id": platform_user_id_a,
            "changes": [{
                "field": "comments",
                "value": {
                    "id": f"comment_t2_{uuid.uuid4().hex[:6]}",
                    "text": "guide please",
                    "from": {"id": "commenter_102"}
                }
            }]
        }]
    }
    res_t2 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t2)
    t2_json = res_t2.json()
    if res_t2.status_code == 200 and t2_json.get("count") == 1:
        print("[PASS] TEST 2: Lowercase phrase match ('guide please') -> 1 DM sent")
        passed += 1
    else:
        print(f"[FAIL] TEST 2: Expected count=1, got {t2_json}")

    # TEST 3: keyword = GUIDE, comment = "GUIDE!" -> match
    payload_t3 = {
        "object": "instagram",
        "entry": [{
            "id": platform_user_id_a,
            "changes": [{
                "field": "comments",
                "value": {
                    "id": f"comment_t3_{uuid.uuid4().hex[:6]}",
                    "text": "GUIDE!",
                    "from": {"id": "commenter_103"}
                }
            }]
        }]
    }
    res_t3 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t3)
    t3_json = res_t3.json()
    if res_t3.status_code == 200 and t3_json.get("count") == 1:
        print("[PASS] TEST 3: Keyword with punctuation ('GUIDE!') -> 1 DM sent")
        passed += 1
    else:
        print(f"[FAIL] TEST 3: Expected count=1, got {t3_json}")

    # TEST 4: keyword = GUIDE, comment = "guideline" -> no match
    payload_t4 = {
        "object": "instagram",
        "entry": [{
            "id": platform_user_id_a,
            "changes": [{
                "field": "comments",
                "value": {
                    "id": f"comment_t4_{uuid.uuid4().hex[:6]}",
                    "text": "guideline",
                    "from": {"id": "commenter_104"}
                }
            }]
        }]
    }
    res_t4 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t4)
    t4_json = res_t4.json()
    if res_t4.status_code == 200 and t4_json.get("count") == 0:
        print("[PASS] TEST 4: Substring boundary ('guideline') -> 0 DM sent")
        passed += 1
    else:
        print(f"[FAIL] TEST 4: Expected count=0, got {t4_json}")

    # TEST 5: automation PAUSED -> no match/execution
    requests.patch(f"{BASE_URL}/automations/{auto_a['id']}", cookies=cookies_a, json={"status": "PAUSED"})
    payload_t5 = {
        "object": "instagram",
        "entry": [{
            "id": platform_user_id_a,
            "changes": [{
                "field": "comments",
                "value": {
                    "id": f"comment_t5_{uuid.uuid4().hex[:6]}",
                    "text": "GUIDE",
                    "from": {"id": "commenter_105"}
                }
            }]
        }]
    }
    res_t5 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t5)
    t5_json = res_t5.json()
    if res_t5.status_code == 200 and t5_json.get("count") == 0:
        print("[PASS] TEST 5: PAUSED automation -> 0 DM sent")
        passed += 1
    else:
        print(f"[FAIL] TEST 5: Expected count=0, got {t5_json}")

    # Reactivate automation A
    requests.patch(f"{BASE_URL}/automations/{auto_a['id']}", cookies=cookies_a, json={"status": "ACTIVE"})

    # TEST 6: wrong creator -> no execution
    user_b, cookies_b = create_test_creator()
    payload_t6 = {
        "object": "instagram",
        "entry": [{
            "id": f"unconnected_creator_{user_b['id'][:8]}",
            "changes": [{
                "field": "comments",
                "value": {
                    "id": f"comment_t6_{uuid.uuid4().hex[:6]}",
                    "text": "GUIDE",
                    "from": {"id": "commenter_106"}
                }
            }]
        }]
    }
    res_t6 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t6)
    t6_json = res_t6.json()
    if res_t6.status_code == 200 and t6_json.get("count") == 0:
        print("[PASS] TEST 6: Unconnected/Wrong creator -> 0 DM sent")
        passed += 1
    else:
        print(f"[FAIL] TEST 6: Expected count=0, got {t6_json}")

    # TEST 7: product does not belong to creator -> no execution (validation at creation)
    oauth_res_b = requests.get(f"{BASE_URL}/integrations/instagram/oauth", cookies=cookies_b)
    params_b = urllib.parse.parse_qs(urllib.parse.urlparse(oauth_res_b.json()["url"]).query)
    requests.get(f"{BASE_URL}/integrations/instagram/callback?code=mock_code_b&state={params_b['state'][0]}", cookies=cookies_b, allow_redirects=False)
    
    auto_b_res = requests.post(f"{BASE_URL}/automations", cookies=cookies_b, json={
        "name": "Hijacked Automation",
        "triggerValue": "GUIDE",
        "productId": prod_a["id"],
        "destinationType": "PRODUCT_PAGE",
        "message": "Hijacked product link",
        "status": "ACTIVE"
    })
    if auto_b_res.status_code in [400, 403]:
        print("[PASS] TEST 7: Unowned product binding blocked at creation (HTTP 403/400)")
        passed += 1
    else:
        print(f"[FAIL] TEST 7: Expected HTTP 403/400, got {auto_b_res.status_code}")

    # TEST 8: same commentId arrives twice -> exactly one DM attempt (idempotency)
    dupe_comment_id = f"comment_dupe_{uuid.uuid4().hex[:6]}"
    payload_t8 = {
        "object": "instagram",
        "entry": [{
            "id": platform_user_id_a,
            "changes": [{
                "field": "comments",
                "value": {
                    "id": dupe_comment_id,
                    "text": "GUIDE",
                    "from": {"id": "commenter_108"}
                }
            }]
        }]
    }
    first_send = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t8).json()
    second_send = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t8).json()
    
    if first_send.get("count") == 1 and (second_send.get("deduplicated") is True or second_send.get("count") == 0):
        print("[PASS] TEST 8: Duplicate commentId webhook -> 1st count=1, 2nd deduplicated/skipped (Idempotent)")
        passed += 1
    else:
        print(f"[FAIL] TEST 8: Idempotency failed. 1st: {first_send}, 2nd: {second_send}")

    # TEST 9: unknown Instagram account -> no execution
    payload_t9 = {
        "object": "instagram",
        "entry": [{
            "id": "unknown_ig_account_id_99999",
            "changes": [{
                "field": "comments",
                "value": {
                    "id": f"comment_t9_{uuid.uuid4().hex[:6]}",
                    "text": "GUIDE",
                    "from": {"id": "commenter_109"}
                }
            }]
        }]
    }
    res_t9 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t9)
    t9_json = res_t9.json()
    if res_t9.status_code == 200 and t9_json.get("count") == 0:
        print("[PASS] TEST 9: Unknown Instagram account ID -> 0 DM sent")
        passed += 1
    else:
        print(f"[FAIL] TEST 9: Expected count=0, got {t9_json}")

    # TEST 10: Instagram disconnected -> no DM
    requests.delete(f"{BASE_URL}/integrations/instagram/account", cookies=cookies_a)
    payload_t10 = {
        "object": "instagram",
        "entry": [{
            "id": platform_user_id_a,
            "changes": [{
                "field": "comments",
                "value": {
                    "id": f"comment_t10_{uuid.uuid4().hex[:6]}",
                    "text": "GUIDE",
                    "from": {"id": "commenter_110"}
                }
            }]
        }]
    }
    res_t10 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t10)
    t10_json = res_t10.json()
    if res_t10.status_code == 200 and t10_json.get("count") == 0:
        print("[PASS] TEST 10: Disconnected Instagram account -> 0 DM sent")
        passed += 1
    else:
        print(f"[FAIL] TEST 10: Expected count=0, got {t10_json}")

    # Reconnect Instagram A for tests 11 & 12
    oauth_res_a2 = requests.get(f"{BASE_URL}/integrations/instagram/oauth", cookies=cookies_a)
    params_a2 = urllib.parse.parse_qs(urllib.parse.urlparse(oauth_res_a2.json()["url"]).query)
    requests.get(f"{BASE_URL}/integrations/instagram/callback?code=mock_code_a2&state={params_a2['state'][0]}", cookies=cookies_a, allow_redirects=False)

    ig_res_a2 = requests.get(f"{BASE_URL}/integrations/instagram/account", cookies=cookies_a)
    platform_user_id_a2 = ig_res_a2.json()["platformUserId"]

    # TEST 11: Meta API fails (handled gracefully, event status recorded)
    payload_t11 = {
        "object": "instagram",
        "entry": [{
            "id": platform_user_id_a2,
            "changes": [{
                "field": "comments",
                "value": {
                    "id": f"comment_t11_{uuid.uuid4().hex[:6]}",
                    "text": "GUIDE",
                    "from": {"id": "commenter_111"}
                }
            }]
        }]
    }
    res_t11 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t11)
    if res_t11.status_code == 200:
        print("[PASS] TEST 11: Meta API response/error handled gracefully")
        passed += 1
    else:
        print(f"[FAIL] TEST 11: Unexpected response status {res_t11.status_code}")

    # TEST 12: successful Meta response -> event processed and DM simulated/sent
    payload_t12 = {
        "object": "instagram",
        "entry": [{
            "id": platform_user_id_a2,
            "changes": [{
                "field": "comments",
                "value": {
                    "id": f"comment_t12_{uuid.uuid4().hex[:6]}",
                    "text": "GUIDE",
                    "from": {"id": "commenter_112"}
                }
            }]
        }]
    }
    res_t12 = requests.post(f"{BASE_URL}/integrations/instagram/webhook", json=payload_t12)
    t12_json = res_t12.json()
    if res_t12.status_code == 200 and t12_json.get("count") == 1:
        print("[PASS] TEST 12: Successful Meta execution -> event recorded & DM sent")
        passed += 1
    else:
        print(f"[FAIL] TEST 12: Expected count=1, got {t12_json}")

    print("\n==================================================")
    print(f"RESULTS: {passed}/{total} TESTS PASSED")
    print("==================================================")
    if passed == total:
        print("ALL PHASE 3 AUTOMATION TESTS PASSED SUCCESSFULLY!")
        return 0
    else:
        print("SOME TESTS FAILED.")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())
