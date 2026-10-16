#!/usr/bin/env python3
import requests
import sys
import uuid

BASE_URL = "http://localhost:3000/api"

def test_profile_image_upload():
    print("=" * 80)
    print("RUNNING CREATORZERO LOCAL PROFILE IMAGE UPLOAD TEST")
    print("=" * 80)

    session = requests.Session()
    email = f"profile_uploader_{uuid.uuid4().hex[:6]}@example.com"

    # 1. Signup Creator
    res_signup = session.post(f"{BASE_URL}/auth/signup", json={
        "email": email,
        "password": "Password123!",
        "name": "Image Creator"
    })
    assert res_signup.status_code == 200, f"Signup failed: {res_signup.text}"
    print("✓ 1. Signup Creator: PASSED")

    # 2. Upload Mock Image File via POST /api/upload
    mock_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    files = {
        'file': ('avatar.png', mock_png_bytes, 'image/png')
    }
    res_upload = session.post(f"{BASE_URL}/upload", files=files)
    assert res_upload.status_code == 200, f"Upload failed: {res_upload.text}"
    data_upload = res_upload.json()
    assert data_upload.get("success") == True, "Upload success flag missing"
    assert "url" in data_upload and "/api/files/" in data_upload["url"], f"Invalid file URL: {data_upload}"
    file_url = data_upload["url"]
    print(f"✓ 2. Upload Image File (POST /api/upload): PASSED (URL: {file_url})")

    # 3. Retrieve Image via GET /api/files/:id
    res_file = session.get(f"{BASE_URL}{file_url.replace('/api', '')}")
    assert res_file.status_code == 200, f"Get file failed: {res_file.status_code}"
    assert "image" in res_file.headers.get("Content-Type", ""), f"Content-Type mismatch: {res_file.headers.get('Content-Type')}"
    print(f"✓ 3. Retrieve Image File (GET {file_url}): PASSED (Content-Type: {res_file.headers.get('Content-Type')})")

    # 4. Update Profile with Uploaded Avatar URL
    res_profile = session.patch(f"{BASE_URL}/me/profile", json={
        "name": "Image Creator",
        "avatarUrl": file_url
    })
    assert res_profile.status_code == 200, f"Update profile failed: {res_profile.text}"
    print("✓ 4. Update Profile Avatar URL: PASSED")

    # 5. Fetch /me Profile Verification
    res_me = session.get(f"{BASE_URL}/me")
    assert res_me.status_code == 200, f"Fetch /me failed: {res_me.text}"
    me_data = res_me.json()
    assert me_data.get("profile", {}).get("avatarUrl") == file_url, f"Avatar URL mismatch: {me_data}"
    print("✓ 5. Verify /me Profile Avatar Persistence: PASSED")

    print("\n" + "=" * 80)
    print("PROFILE IMAGE UPLOAD TEST RESULTS: ALL 5 PASSED")
    print("=" * 80)

if __name__ == "__main__":
    test_profile_image_upload()
