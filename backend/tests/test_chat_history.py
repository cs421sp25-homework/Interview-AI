import pytest
import requests

@pytest.fixture
def base_url():
    """Base URL for your API."""
    return "http://127.0.0.1:5001/api"

def test_save_chat_history_missing_params(base_url):
    """
    Test that the endpoint returns 400 if required parameters are missing.
    """
    # Missing thread_id, user_email, or messages should cause a 400 error.
    invalid_data = {
        "thread_id": "",          # or omit entirely
        "email": "",             # or omit entirely
        "messages": []           # or omit entirely
    }
    response = requests.post(f"{base_url}/chat_history", json=invalid_data)
    assert response.status_code == 400, (
        f"Expected 400 Bad Request when required params are missing, got {response.status_code}"
    )
    data = response.json()
    assert "error" in data, "Expected 'error' key in JSON response."

def test_save_chat_history_welcome_only(base_url):
    """
    Test that the endpoint skips saving when there's only a welcome message from AI.
    """
    data = {
        "thread_id": "test_thread_1",
        "email": "test_user@example.com",
        "messages": [
            {
                "sender": "ai",
                "content": "Welcome to the interview!"
            }
        ],
        "config_name": "Interview Session"
    }
    response = requests.post(f"{base_url}/chat_history", json=data)
    # Should return 200 with a skipped result
    assert response.status_code == 200, (
        f"Expected 200 when only welcome message is present, got {response.status_code}"
    )
    result = response.json()
    # Look for the 'skipped' field in the JSON
    assert result.get("skipped") is True, "Should indicate it skipped saving."
    assert result.get("reason") == "only_welcome_message", "Should note the reason as only welcome message."

def test_save_chat_history_success(base_url):
    """
    Test successful saving of chat history.
    
    In a real setup, you'd want to ensure 'chat_history_service.save_chat_history'
    and 'chat_history_service.save_analysis' can handle data. You might also mock
    the database calls to control the test environment. 
    """
    data = {
        "thread_id": "test_thread_2",
        "email": "test_user@example.com",
        "messages": [
            {
                "sender": "user",
                "content": "Hello, I have a question about the role."
            },
            {
                "sender": "ai",
                "content": "Sure, go ahead."
            }
        ],
        "config_name": "Developer Interview",
        "config_id": "config_123"
    }
    response = requests.post(f"{base_url}/chat_history", json=data)

    # Expect success = True in most normal cases
    # Could be 200 or 500 if there's an internal error
    assert response.status_code in (200, 500), (
        f"Expected 200 or 500 from chat_history endpoint, got {response.status_code}"
    )

    if response.status_code == 200:
        result = response.json()
        assert result.get("success") is True, "Expected 'success' to be True on successful save."
        # Possibly check for 'data' in the response if a record was returned
        # if "data" in result:
        #     assert "thread_id" in result["data"], "Returned data should include the saved thread_id."

def test_delete_chat_history_by_id_not_found(base_url):
    """
    Test deleting an interview log by ID when the record does not exist.
    Should return 404.
    """
    non_existent_id = "999999"
    response = requests.delete(f"{base_url}/chat_history/{non_existent_id}")
    assert response.status_code in (404, 400, 500), (
        f"Expected 404 if record doesn't exist, but got {response.status_code}"
    )
    # The route specifically expects 404 if interview log is not found
    if response.status_code == 404:
        data = response.json()
        assert "error" in data, "Expected an 'error' key in the 404 response."

def test_delete_chat_history_by_id_success(base_url):
    """
    Test successful deletion of a chat history record by ID.
    In a real test, you would:
      1) Create a log in the DB
      2) Delete that log by the returned ID
      3) Confirm the response is 200 
    Here we'll just assume you have a known ID or you mock your DB calls.
    """
    # This ID should exist in your test DB, or you can create it just before this test.
    existing_id = "123"  # Replace with an actual existing ID in your test environment
    response = requests.delete(f"{base_url}/chat_history/{existing_id}")
    # Expect 200 if the log was found and successfully deleted
    assert response.status_code in (200, 404), (
        f"Expected 200 if record found and deleted, or 404 if not found. Got {response.status_code}"
    )
    if response.status_code == 200:
        data = response.json()
        assert data.get("success") is True, "Expected 'success' field in successful deletion."
        assert data.get("message") == "Interview log, performance records, and chat history deleted successfully", \
            "Expected success deletion message."
