import pytest
import requests

@pytest.fixture
def base_url():
    """Returns the base URL for the API."""
    return "http://127.0.0.1:5001/api"

@pytest.fixture
def test_user_email():
    """The email for our test user."""
    return "testuser_profile@example.com"

@pytest.fixture
def create_test_user(base_url, test_user_email):
    """
    Creates a test user via the signup endpoint,
    so we have a user to retrieve/update the profile.
    """
    url = f"{base_url}/auth/signup"
    data = {
        "email": test_user_email,
        "password": "SomeStrongP@ssw0rd",
        "first_name": "Jane",
        "last_name": "Doe",
        "phone": "555-555-1234",
        "job_title": "QA Tester",
        "industry": "Testing",
        "years_of_experience": "2"
    }
    response = requests.post(url, data=data)
    # It's okay if the user already exists from a previous run,
    # as long as we know there's a record with `test_user_email`.
    # So we won't hard-fail if 201 isn't returned here.
    return response

def test_static_profile_endpoint(base_url):
    """
    Tests the static profile endpoint: GET /api/profile.
    Expects a 200 OK with the fixed sample data.
    """
    url = f"{base_url}/profile"
    response = requests.get(url)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    data = response.json()
    # Check that we have the fields we expect
    assert "name" in data, "Response should contain a 'name' field."
    assert "about" in data, "Response should contain an 'about' field."
    # Validate their contents (example checks)
    assert data["name"] == "John Doe", "Expected static name 'John Doe'."
    assert "A full stack developer" in data["about"], "Expected about info to match sample."

def test_get_profile_nonexistent_user(base_url):
    """
    GET /api/profile/<email> with a user that does not exist.
    Should return a 404.
    """
    non_existent_email = "random_nonexistent_user@example.com"
    url = f"{base_url}/profile/{non_existent_email}"
    response = requests.get(url)
    assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    data = response.json()
    assert "error" in data, "Should return an error message if user not found."

def test_get_profile_existing_user(base_url, create_test_user, test_user_email):
    """
    GET /api/profile/<email> for an existing user, expecting 200 + the user data.
    The user is first created via `create_test_user` fixture.
    """
    url = f"{base_url}/profile/{test_user_email}"
    response = requests.get(url)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    body = response.json()
    assert "message" in body, "Should have a 'message' field in response."
    assert "data" in body, "Should include 'data' with the profile details."
    
    profile_data = body["data"]
    # Check a few fields to confirm we got the correct user
    assert profile_data.get("email") == test_user_email, "Email in response must match test user."
    assert profile_data.get("first_name") == "Jane", "Should match the first_name we used during signup."
    assert profile_data.get("last_name") == "Doe", "Should match the last_name we used during signup."

def test_update_profile_nonexistent_user(base_url):
    """
    PUT /api/profile/<email> with a user that doesn't exist, expecting 404.
    """
    non_existent_email = "random_updatenonuser@example.com"
    url = f"{base_url}/profile/{non_existent_email}"
    updated_data = {
        "first_name": "NoOne",
        "last_name": "Here"
    }
    response = requests.put(url, json=updated_data)
    assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    body = response.json()
    assert "error" in body, "Should have an error message for nonexistent user."

def test_update_profile_existing_user(base_url, create_test_user, test_user_email):
    """
    PUT /api/profile/<email> for an existing user, expecting 200 and updated data returned.
    """
    url = f"{base_url}/profile/{test_user_email}"
    updated_data = {
        "first_name": "JaneUpdated",
        "last_name": "DoeUpdated",
        "phone": "555-555-9999",
        "about": "New about info from test_update_profile",
        "linkedin_url": "https://linkedin.com/in/janedoe_updated",
        "key_skills": "pytest,unittest,ci/cd"
        # ...
        # Add more fields if needed to exercise the update logic
    }
    
    # Perform the PUT request
    response = requests.put(url, json=updated_data)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    body = response.json()
    assert "message" in body, "Should have a success message."
    assert body["message"] == "Profile updated successfully", "Success message mismatch."
    assert "data" in body, "Should have updated profile data."

    returned_profile = body["data"]
    # Basic validation of updated fields
    assert returned_profile.get("name") == "JaneUpdated DoeUpdated", \
        "Expected updated first/last name concatenated."
    assert returned_profile.get("phone") == "555-555-9999", \
        "Phone should be updated."
    assert returned_profile.get("about") == "New about info from test_update_profile", \
        "About section should be updated."
    assert "pytest" in returned_profile.get("skills", []), \
        "Skills should include 'pytest' from the updated data."
    
    # Optionally, do a GET to confirm it was truly saved server-side:
    get_response = requests.get(url)
    assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
    get_body = get_response.json()
    get_profile_data = get_body["data"]
    assert get_profile_data.get("first_name") == "JaneUpdated", "Server should have the updated name stored."

