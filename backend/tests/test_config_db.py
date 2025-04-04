import pytest
import requests

@pytest.fixture
def base_url():
    """Base URL for your API."""
    return "http://127.0.0.1:5001/api"

def test_get_interview_configs(base_url):
    """
    Test retrieving interview configurations by email.
    Depending on whether an interview config exists for this
    email, the response may be 200 or 404.
    """
    test_email = "test_user@example.com"
    response = requests.get(f"{base_url}/get_interview_configs/{test_email}")
    
    # You might expect 200 (if config exists) or 404 (if no config found).
    assert response.status_code in [200, 404], \
        f"Unexpected status code: {response.status_code}. Response: {response.text}"

    if response.status_code == 200:
        # If 200, verify the structure of the returned JSON
        data = response.json()
        # Example assertion: ensure data is a list (if you expect multiple configs)
        assert isinstance(data, list), "Response data should be a list of configurations."
    else:
        # If 404, check the error message
        data = response.json()
        assert "message" in data, "Error response should contain a 'message' key."
        assert data["message"] == "Configuration not found.", \
            "Expected 'Configuration not found.' message."

def test_create_interview_config(base_url):
    """
    Test creating a new interview configuration.
    """
    config_data = {
        "email": "new_user@example.com",
        "position": "Software Engineer",
        "questions": ["Tell me about yourself?", "What is your greatest strength?"],
        # Add any other fields your service expects...
    }
    response = requests.post(f"{base_url}/create_interview_config", json=config_data)
    
    # Expecting HTTP 201 if creation was successful
    assert response.status_code == 201, \
        f"Expected status code 201, got {response.status_code}. Response: {response.text}"
    
    data = response.json()
    assert "message" in data, "Response JSON should have a 'message' field."
    assert data["message"] == "Interview configuration saved successfully!", \
        "The success message should match the expected string."
    assert "id" in data, "Response JSON should contain the newly created config ID."

def test_update_interview_config(base_url):
    """
    Test updating an existing interview configuration.
    Note: For a reliable test, you may first create a config 
    and then update that newly created config's ID. 
    This example assumes you already have an ID to update.
    """
    existing_config_id = "12345"  # Replace with a real ID if needed
    update_data = {
        "position": "Updated Role",
        "questions": ["What is your updated greatest strength?"],
        # Add or modify fields as per your schema
    }
    response = requests.put(
        f"{base_url}/update_interview_config/{existing_config_id}",
        json=update_data
    )
    
    # Expect either 200 if updated or 404 if no config is found
    assert response.status_code in [200, 404], \
        f"Unexpected status code: {response.status_code}. Response: {response.text}"
    
    data = response.json()
    
    if response.status_code == 200:
        assert data["message"] == "Interview configuration updated successfully!", \
            "Expected update success message."
        assert "data" in data, "Updated response should contain 'data' with updated fields."
    else:
        # If we got a 404
        assert "message" in data, "Error response should contain a 'message' field."
        assert data["message"] == "Configuration not found.", \
            "Expected 'Configuration not found.' message when ID does not exist."

def test_delete_interview_config(base_url):
    """
    Test deleting an existing interview configuration.
    Note: Similar to update, you may want to create a config first
    and then delete that ID in a real-world scenario.
    """
    existing_config_id = "12345"  # Replace with a real ID if needed
    response = requests.delete(f"{base_url}/delete_interview_config/{existing_config_id}")
    
    # Expect either 200 or 404
    assert response.status_code in [200, 404], \
        f"Unexpected status code: {response.status_code}. Response: {response.text}"
    
    data = response.json()
    
    if response.status_code == 200:
        assert data["message"] == "Interview configuration deleted successfully!", \
            "Expected success deletion message."
    else:
        assert data["message"] == "Configuration not found.", \
            "Expected not found message if config does not exist."
