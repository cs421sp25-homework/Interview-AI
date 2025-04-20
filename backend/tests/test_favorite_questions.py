import pytest
import requests
from datetime import datetime

# ------------------------------------------------------------------------------
# Tests for GET /api/favorite_questions/<email>
# ------------------------------------------------------------------------------

def test_get_favorite_questions_valid_email(base_url):
    """
    Test retrieving favorite questions for a valid email.
    Expects:
      - Status code: 200
      - JSON containing 'data' key with a list (possibly empty).
    """
    test_email = "testuser@example.com"
    response = requests.get(f"{base_url}/favorite_questions/{test_email}")
    assert response.status_code == 200, "Expected 200 for valid email."
    data = response.json()
    assert "data" in data, "Response JSON should contain 'data' key."
    assert isinstance(data["data"], list), "Data should be a list."

def test_get_favorite_questions_with_session_id(base_url):
    """
    Test retrieving favorite questions filtered by session_id.
    Expects:
      - Status code: 200
      - JSON containing 'data' key with a list (possibly empty).
    NOTE: Assumes session_id exists in DB or returns empty list.
    """
    test_email = "testuser@example.com"
    session_id = "session123"
    response = requests.get(f"{base_url}/favorite_questions/{test_email}?session_id={session_id}")
    assert response.status_code == 200, "Expected 200 for valid email with session_id."
    data = response.json()
    assert "data" in data, "Response JSON should contain 'data' key."
    assert isinstance(data["data"], list), "Data should be a list."

def test_get_favorite_questions_empty_email(base_url):
    """
    Test retrieving favorite questions with an empty email.
    Expects:
      - Status code: 200
      - JSON containing 'data' key with an empty list.
    """
    response = requests.get(f"{base_url}/favorite_questions/")
    assert response.status_code == 200, "Expected 200 for empty email."
    data = response.json()
    assert "data" in data, "Response JSON should contain 'data' key."
    assert data["data"] == [], "Expected empty list for empty email."

# ------------------------------------------------------------------------------
# Tests for POST /api/favorite_questions
# ------------------------------------------------------------------------------

def test_add_favorite_question_valid(base_url):
    """
    Test adding a new favorite question with valid payload.
    Expects:
      - Status code: 201
      - JSON containing 'data' key with the inserted question.
    """
    payload = {
        "question_text": "What is your experience with Python?",
        "session_id": "session123",
        "email": "testuser@example.com",
        "question_type": "technical"
    }
    response = requests.post(f"{base_url}/favorite_questions", json=payload)
    assert response.status_code == 201, "Expected 201 for valid question addition."
    data = response.json()
    assert "data" in data, "Response JSON should contain 'data' key."
    assert data["data"]["question_text"] == payload["question_text"], "Question text should match input."
    assert data["data"]["is_favorite"] is True, "Question should be marked as favorite."
    assert "created_at" in data["data"], "Response should include created_at timestamp."

def test_add_favorite_question_missing_field(base_url):
    """
    Test adding a favorite question with a missing required field.
    Expects:
      - Status code: 400
      - JSON error indicating missing field.
    """
    payload = {
        "session_id": "session123",
        "email": "testuser@example.com"
    }  # Missing question_text
    response = requests.post(f"{base_url}/favorite_questions", json=payload)
    assert response.status_code == 400, "Expected 400 for missing required field."
    data = response.json()
    assert "error" in data, "Response should contain 'error' key."
    assert "missing required field: question_text" in data["error"].lower(), \
        "Error should indicate missing question_text."

def test_add_favorite_question_existing(base_url):
    """
    Test updating an existing favorite question.
    Expects:
      - Status code: 201
      - JSON containing updated 'data' with is_favorite=True.
    NOTE: Assumes the question already exists in DB or requires setup.
    """
    payload = {
        "question_text": "What is your experience with Python?",
        "session_id": "session123",
        "email": "testuser@example.com",
        "question_type": "technical",
        "thread_id": "thread456",
        "is_favorite": True
    }
    response = requests.post(f"{base_url}/favorite_questions", json=payload)
    assert response.status_code == 201, "Expected 201 for updating existing question."
    data = response.json()
    assert "data" in data, "Response JSON should contain 'data' key."
    assert data["data"]["thread_id"] == "thread456", "Thread ID should be updated."
    assert "updated_at" in data["data"], "Response should include updated_at timestamp."

# ------------------------------------------------------------------------------
# Tests for DELETE /api/favorite_questions/<id>
# ------------------------------------------------------------------------------

def test_remove_favorite_question_valid(base_url):
    """
    Test removing a favorite question with a valid ID.
    Expects:
      - Status code: 200
      - JSON containing 'message' key.
    NOTE: Requires a valid question ID in DB or setup.
    """
    # Placeholder: Assume ID 1 exists or requires setup
    question_id = 1
    response = requests.delete(f"{base_url}/favorite_questions/{question_id}")
    assert response.status_code == 200, "Expected 200 for valid question removal."
    data = response.json()
    assert "message" in data, "Response should contain 'message' key."
    assert "question removed" in data["message"].lower(), \
        "Message should confirm question removal."

# ------------------------------------------------------------------------------
# Tests for DELETE /api/favorite_questions/session/<session_id>
# ------------------------------------------------------------------------------

def test_delete_favorite_questions_by_session_valid(base_url):
    """
    Test deleting all favorite questions for a valid session_id.
    Expects:
      - Status code: 200
      - JSON containing 'message' key.
    """
    session_id = "session123"
    response = requests.delete(f"{base_url}/favorite_questions/session/{session_id}")
    assert response.status_code == 200, "Expected 200 for valid session deletion."
    data = response.json()
    assert "message" in data, "Response should contain 'message' key."
    assert "deleted successfully" in data["message"].lower(), \
        "Message should confirm successful deletion."

def test_delete_favorite_questions_by_session_missing(base_url):
    """
    Test deleting favorite questions with an empty session_id.
    Expects:
      - Status code: 400
      - JSON error indicating missing session ID.
    """
    response = requests.delete(f"{base_url}/favorite_questions/session/")
    assert response.status_code == 400, "Expected 400 for missing session_id."
    data = response.json()
    assert "error" in data, "Response should contain 'error' key."
    assert "session id is required" in data["error"].lower(), \
        "Error should indicate missing session_id."