import pytest
import requests

@pytest.fixture
def base_url():
    return "http://127.0.0.1:5001/api"

@pytest.fixture
def auth_headers(base_url):
    """Get authentication token for tests"""
    login_payload = {
        "email": "tlin56@jh.edu",
        "password": "12345678"
    }
    login_response = requests.post(f"{base_url}/auth/login", json=login_payload)
    token = login_response.json().get("token")
    return {"Authorization": f"Bearer {token}"}

def test_static_get_profile(base_url):
    """Test retrieving the static profile."""
    response = requests.get(f"{base_url}/profile")
    assert response.status_code == 200, "Failed to retrieve static profile."
    data = response.json()
    assert "name" in data, "Static profile missing 'name'."
    assert "about" in data, "Static profile missing 'about'."

def test_get_profile_by_email_not_found(base_url):
    """Test retrieving a profile by email when the user does not exist."""
    email = "nonexistent@example.com"
    response = requests.get(f"{base_url}/profile/{email}")
    assert response.status_code == 404, "Expected 404 for non-existent user."
    data = response.json()
    assert "error" in data, "Response should include an error message when user is not found."

def test_update_profile(base_url, auth_headers):
    """Test updating a user's profile."""
    update_payload = {
        "first_name": "John",
        "last_name": "Doe",
        "phone": "123-456-7890",
        "job_title": "Software Engineer",
        "industry": "Technology",
        "years_of_experience": "5"
    }
    
    response = requests.put(
        f"{base_url}/profile/update",
        headers=auth_headers,
        json=update_payload
    )
    
    assert response.status_code == 200, "Profile update failed."
    data = response.json()
    assert "message" in data, "Response should include a success message."
    assert data["message"] == "Profile updated successfully"
    
    # Verify returned formatted data
    formatted = data.get("data", {})
    expected_name = f"{update_payload['first_name']} {update_payload['last_name']}"
    assert formatted.get("name") == expected_name, "Name did not update correctly."
    assert formatted.get("title") == update_payload["job_title"], "Job title did not update correctly."
