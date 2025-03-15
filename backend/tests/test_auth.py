import pytest
import requests
from pathlib import Path

@pytest.fixture
def base_url():
    return "http://127.0.0.1:5001/api"

@pytest.fixture
def test_user():
    return {
        "email": "tlin56@jh.edu",
        "password": "12345678"
    }

def test_email_login_success(base_url, test_user):
    """Test that email login succeeds with valid credentials."""
    payload = {
        "email": test_user["email"],
        "password": test_user["password"]
    }
    response = requests.post(f"{base_url}/auth/login", json=payload)
    assert response.status_code == 200, "Login should succeed with valid credentials."
    data = response.json()
    assert "message" in data, "Response should include a success message."
    assert data["message"] == "Login successful", "Unexpected success message."

def test_email_login_invalid_password(base_url, test_user):
    """Test that email login fails with an invalid password."""
    payload = {
        "email": test_user["email"],
        "password": "wrongpassword123"
    }
    response = requests.post(f"{base_url}/auth/login", json=payload)
    assert response.status_code == 401, "Login should fail with an invalid password."
    data = response.json()
    assert "error" in data, "Response should include an error message."
    assert data["error"] == "Invalid password", "Unexpected error message for invalid password."

def test_email_login_no_account(base_url):
    """Test that email login fails when the email does not exist."""
    payload = {
        "email": "nonexistent@example.com",
        "password": "any_password123"
    }
    response = requests.post(f"{base_url}/auth/login", json=payload)
    assert response.status_code == 400, "Login should fail if the email does not exist."
    data = response.json()
    assert "error" in data, "Response should include an error message."
    assert data["error"] == "You don't have an account with this email"

def test_google_oauth_initiation(base_url):
    """Test initiating Google OAuth."""
    response = requests.get(f"{base_url}/oauth/google", allow_redirects=False)
    assert response.status_code in (302, 303), "OAuth initiation should return a redirect status."
    assert "Location" in response.headers, "Redirect response missing Location header."
