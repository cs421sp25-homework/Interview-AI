import pytest
import requests
import uuid
from unittest.mock import patch, MagicMock
import os

@pytest.fixture
def base_url():
    """Base URL for your API."""
    return "http://127.0.0.1:5001/api"

# ------------------------------------------------------------------------------
# /api/auth/login (POST)
# ------------------------------------------------------------------------------
def test_email_login_missing_params(base_url):
    """
    Test that /api/auth/login returns 400 if 'email' or 'password' is missing.
    """
    # Missing email
    payload = {"email": "", "password": "SomePassword"}
    response = requests.post(f"{base_url}/auth/login", json=payload)
    assert response.status_code in [400, 500], (
        f"Expected 400 or 500 if email is missing, got {response.status_code}"
    )
    
    # Missing password
    payload = {"email": "user@example.com", "password": ""}
    response = requests.post(f"{base_url}/auth/login", json=payload)
    # Depending on your actual endpoint logic, if your code checks for empty string 
    # or None, this might also yield a 401 or 400. Adjust if needed.
    assert response.status_code in [400, 401, 500], (
        f"Expected 400/401/500 if password is missing, got {response.status_code}"
    )

@patch("app.authorization_service")  # Adjust path to wherever authorization_service is imported
def test_email_login_email_not_exists(mock_auth_service, base_url):
    """
    Test that /api/auth/login returns 400 if the email does not exist in the system.
    """
    # Mock the service so that check_email_exists(email) returns False
    mock_auth_service.check_email_exists.return_value = False
    
    payload = {"email": "nonexistent@example.com", "password": "AnyPassword"}
    response = requests.post(f"{base_url}/auth/login", json=payload)
    assert response.status_code == 400, (
        f"Expected 400 if email doesn't exist, got {response.status_code}"
    )
    data = response.json()
    assert "error" in data, "Expected 'error' key for missing email error."
    assert "account with this email" in data["error"], "Error message mismatch."

@patch("app.authorization_service")  # Adjust path as needed
def test_email_login_invalid_password(mock_auth_service, base_url):
    """
    Test that /api/auth/login returns 401 if the password is invalid.
    """
    # 1) check_email_exists(email) => True
    # 2) check_user_login(email, password) => False
    mock_auth_service.check_email_exists.return_value = True
    mock_auth_service.check_user_login.return_value = False
    
    payload = {"email": "user@example.com", "password": "WrongPassword"}
    response = requests.post(f"{base_url}/auth/login", json=payload)
    assert response.status_code == 401, (
        f"Expected 401 for invalid password, got {response.status_code}"
    )
    data = response.json()
    assert "error" in data, "Expected 'error' key for invalid password."
    assert "Invalid password" in data["error"], "Error message mismatch."

@patch("app.authorization_service")  # Adjust path as needed
def test_email_login_success(mock_auth_service, base_url):
    """
    Test that /api/auth/login returns 200 and success message if credentials are correct.
    """
    mock_auth_service.check_email_exists.return_value = True
    mock_auth_service.check_user_login.return_value = True
    
    payload = {"email": "validuser@example.com", "password": "CorrectPassword"}
    response = requests.post(f"{base_url}/auth/login", json=payload)
    assert response.status_code == 200, (
        f"Expected 200 for successful login, got {response.status_code}"
    )
    data = response.json()
    assert "message" in data, "Expected a 'message' key on success."
    assert data["message"] == "Login successful", "Success message mismatch."

# ------------------------------------------------------------------------------
# /api/oauth/<provider> (GET)
# ------------------------------------------------------------------------------
@patch("app.supabase")  # Adjust the import path to where you use supabase in your code
def test_oauth_login_google(mock_supabase, base_url):
    """
    Test that /api/oauth/google redirects with a valid URL from supabase.
    We patch supabase.auth.sign_in_with_oauth to return a mock response object
    with a .url attribute.
    """
    # Mock supabase.auth.sign_in_with_oauth to return an object with .url
    mock_response = MagicMock()
    mock_response.url = "http://example.com/oauth_redirect"
    mock_supabase.auth.sign_in_with_oauth.return_value = mock_response
    
    response = requests.get(f"{base_url}/oauth/google")
    # Expect a 302 or 301 redirect to the mock URL
    assert response.status_code in [301, 302], (
        f"Expected a redirect (3xx) for OAuth login, got {response.status_code}"
    )
    # Check the location header
    assert response.headers["Location"] == "http://example.com/oauth_redirect", (
        f"Unexpected redirect URL. Got {response.headers['Location']}"
    )

@patch("app.supabase")  # Adjust path as needed
def test_oauth_login_failure(mock_supabase, base_url):
    """
    Test that /api/oauth/<provider> returns 500 if an exception is raised.
    """
    mock_supabase.auth.sign_in_with_oauth.side_effect = Exception("Mock OAuth failure")
    
    response = requests.get(f"{base_url}/oauth/google")
    assert response.status_code == 500, (
        f"Expected 500 if an exception occurs, got {response.status_code}"
    )
    data = response.json()
    assert "error" in data, "Expected 'error' key in JSON on failure."
    assert data["error"] == "OAuth failed", "Error message mismatch."

# ------------------------------------------------------------------------------
# /api/auth/callback (GET)
# ------------------------------------------------------------------------------
@patch("app.supabase")  # Adjust import path to match your code
@patch("app.authorization_service")  # Adjust path for authorization_service
def test_auth_callback_no_code(mock_auth_service, mock_supabase, base_url):
    """
    Test that if no 'code' is provided in query params, we handle it gracefully.
    By default, your code tries to exchange the code. 
    If missing, you might see a 400 or a redirect with error in real usage.
    """
    # If you are redirecting to FRONTEND_URL with an error, 
    # we'd check for a 3xx or the final location. 
    # Adjust your logic as appropriate.
    response = requests.get(f"{base_url}/auth/callback")  # No code param
    # Likely a redirect to the FRONTEND_URL with ?error=...
    assert response.status_code in [301, 302], (
        f"Expected redirect or 3xx if no code is present, got {response.status_code}"
    )
    # Check the location for an error param
    location = response.headers.get("Location")
    assert location, "Expected a redirect location."
    assert "error" in location.lower(), "Expected error in the redirect location."


@patch("app.supabase")  
@patch("app.authorization_service")  
def test_auth_callback_exchange_session_success(mock_auth_service, mock_supabase, base_url):
    """
    Test that /api/auth/callback completes successfully and redirects to the FRONTEND_URL
    with email and is_new_user if the user exists or not.
    """
    # Set up environment variable for FRONTEND_URL
    os.environ["FRONTEND_URL"] = "http://frontend.example.com"

    # Mock supabase.auth.exchange_code_for_session to return a valid session + user
    mock_result = MagicMock()
    mock_result.session = True
    mock_user = MagicMock()
    mock_user.email = "existing_user@example.com"
    mock_result.user = mock_user
    mock_supabase.auth.exchange_code_for_session.return_value = mock_result
    
    # Assume user already exists
    mock_auth_service.check_email_exists.return_value = True

    # Provide a code param
    code_value = "test_code_123"
    response = requests.get(f"{base_url}/auth/callback?code={code_value}")
    
    # Expect a 302 redirect to the frontend with email and is_new_user params
    assert response.status_code in [301, 302], (
        f"Expected redirect if session is valid, got {response.status_code}"
    )
    location = response.headers.get("Location")
    assert location, "Expected a redirect location."
    # e.g. "http://frontend.example.com/#/auth/callback?email=existing_user@example.com&is_new_user=False"
    assert "existing_user@example.com" in location, "Email should appear in redirect URL."
    assert "is_new_user=False" in location, "Expected is_new_user=False in query param."

@patch("app.supabase")  
@patch("app.authorization_service")  
def test_auth_callback_exchange_session_new_user(mock_auth_service, mock_supabase, base_url):
    """
    Test that a newly registered user is indicated (is_new_user=True).
    """
    os.environ["FRONTEND_URL"] = "http://frontend.example.com"

    # Mock supabase.auth.exchange_code_for_session to return a valid session + user
    mock_result = MagicMock()
    mock_result.session = True
    mock_user = MagicMock()
    mock_user.email = "new_user@example.com"
    mock_result.user = mock_user
    mock_supabase.auth.exchange_code_for_session.return_value = mock_result
    
    # Simulate a new user
    mock_auth_service.check_email_exists.return_value = False

    response = requests.get(f"{base_url}/auth/callback?code=someCode")
    assert response.status_code in [301, 302], (
        f"Expected 3xx redirect, got {response.status_code}"
    )
    location = response.headers["Location"]
    assert "new_user@example.com" in location, "Expected 'new_user@example.com' in redirect URL."
    assert "is_new_user=True" in location, "Expected is_new_user=True for newly created user."

@patch("app.supabase")  
def test_auth_callback_exchange_session_failure(mock_supabase, base_url):
    """
    Test that if supabase.auth.exchange_code_for_session fails or returns no session,
    we either get a 400 or redirect to the frontend with an error. Adjust to your logic.
    """
    os.environ["FRONTEND_URL"] = "http://frontend.example.com"
    
    # Mock a failed exchange
    mock_result = MagicMock()
    mock_result.session = None
    mock_result.user = None
    mock_supabase.auth.exchange_code_for_session.return_value = mock_result
    
    response = requests.get(f"{base_url}/auth/callback?code=failExchange")
    # Depending on your code, you might do a 400 or a redirect with an error.
    # Your code does `return jsonify({"error": "Failed to exchange code for session"}), 400`
    # if `not result or not result.session`, so let's check for 400.
    
    assert response.status_code == 400, (
        f"Expected 400 if session exchange failed, got {response.status_code}"
    )
    data = response.json()
    assert "error" in data, "Expected 'error' key in JSON."
    assert "Failed to exchange code for session" in data["error"], "Error message mismatch."
    
