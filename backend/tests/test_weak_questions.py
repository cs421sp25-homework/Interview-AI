import pytest
import requests
from datetime import datetime

# ------------------------------------------------------------------------------
# Tests for GET /api/weak_questions/<email>
# ------------------------------------------------------------------------------

def test_get_weak_questions_valid_email(base_url):
    """
    Test retrieving weak questions for a valid email.
    Expects:
      - Status code: 200
      - JSON containing 'data' key with a list (possibly empty).
    """
    test_email = "testuser@example.com"
    response = requests.get(f"{base_url}/weak_questions/{test_email}")
    assert response.status_code == 200, "Expected 200 for valid email."
    data = response.json()
    assert "data" in data, "Response JSON should contain 'data' key."
    assert isinstance(data["data"], list), "Data should be a list."

def test_get_weak_questions_with_session_id(base_url):
    """
    Test retrieving weak questions filtered by session_id.
    Expects:
      - Status code: 200
      - JSON containing 'data' key with a list (possibly empty).
    NOTE: Assumes session_id exists in DB or returns empty list.
    """
    test_email = "testuser@example.com"
    session_id = "session123"
    response = requests.get(f"{base_url}/weak_questions/{test_email}?session_id={session_id}")
    assert response.status_code == 200, "Expected 200 for valid email with session_id."
    data = response.json()
    assert "data" in data, "Response JSON should contain 'data' key."
    assert isinstance(data["data"], list), "Data should be a list."

def test_get_weak_questions_empty_email(base_url):
    """
    Test retrieving weak questions with an empty email.
    Expects:
      - Status code: 200
      - JSON containing 'data' key with an empty list.
    """
    response = requests.get(f"{base_url}/weak_questions/")
    assert response.status_code == 200, "Expected 200 for empty email."
    data = response.json()
    assert "data" in data, "Response JSON should contain 'data' key."
    assert data["data"] == [], "Expected empty list for empty email."

# ------------------------------------------------------------------------------
# Tests for POST /api/weak_questions
# ------------------------------------------------------------------------------

def test_add_weak_question_valid(base_url):
    """
    Test adding a new weak question with valid payload.
    Expects:
      - Status code: 201
      - JSON containing 'data' key with the inserted question.
    """
    payload = {
        "question_text": "Explain recursion in programming.",
        "session_id": "session123",
        "email": "testuser@example.com",
        "question_type": "technical"
    }
    response = requests.post(f"{base_url}/weak_questions", json=payload)
    assert response.status_code == 201, "Expected 201 for valid question addition."
    data = response.json()
    assert "data" in data, "Response JSON should contain 'data' key."
    assert data["data"]["question_text"] == payload["question_text"], "Question text should match input."
    assert data["data"]["is_weak"] is True, "Question should be marked as weak."
    assert "created_at" in data["data"], "Response should include created_at timestamp."

def test_add_weak_question_missing_field(base_url):
    """
    Test adding a weak question with a missing required field.
    Expects:
      - Status code: 400
      - JSON error indicating missing field.
    """
    payload = {
        "session_id": "session123",
        "email": "testuser@example.com"
    }  # Missing question_text
    response = requests.post(f"{base_url}/weak_questions", json=payload)
    assert response.status_code == 400, "Expected 400 for missing required field."
    data = response.json()
    assert "error" in data, "Response should contain 'error' key."
    assert "missing required field: question_text" in data["error"].lower(), \
        "Error should indicate missing question_text."

def test_add_weak_question_existing(base_url):
    """
    Test updating an existing weak question.
    Expects:
      - Status code: 201
      - JSON containing updated 'data' with is_weak=True.
    NOTE: Assumes the question already exists in DB or requires setup.
    """
    payload = {
        "question_text": "Explain recursion in programming.",
        "session_id": "session123",
        "email": "testuser@example.com",
        "question_type": "technical",
        "thread_id": "thread789",
        "is_weak": True
    }
    response = requests.post(f"{base_url}/weak_questions", json=payload)
    assert response.status_code == 201, "Expected 201 for updating existing question."
    data = response.json()
    assert "data" in data, "Response JSON should contain 'data' key."
    assert data["data"]["thread_id"] == "thread789", "Thread ID should be updated."
    assert "updated_at" in data["data"], "Response should include updated_at timestamp."

# ------------------------------------------------------------------------------
# Tests for DELETE /api/weak_questions/<id>
# ------------------------------------------------------------------------------

def test_remove_weak_question_valid(base_url):
    """
    Test removing a weak question with a valid ID.
    Expects:
      - Status code: 200
      - JSON containing 'message' key.
    NOTE: Requires a valid question ID in DB or setup.
    """
    # Placeholder: Assume ID 1 exists or requires setup
    question_id = 1
    response = requests.delete(f"{base_url}/weak_questions/{question_id}")
    assert response.status_code == 200, "Expected 200 for valid question removal."
    data = response.json()
    assert "message" in data, "Response should contain 'message' key."
    assert "weak question removed" in data["message"].lower(), \
        "Message should confirm question removal."

def test_remove_weak_question_invalid_id(base_url):
    """
    Test removing a weak question with an invalid (non-existent) ID.
    Expects:
      - Status code: 200
      - JSON containing 'message' key, as Supabase delete is idempotent.
    NOTE: Supabase delete returns success even if no rows are affected.
    """
    question_id = 99999  # Assume non-existent ID
    response = requests.delete(f"{base_url}/weak_questions/{question_id}")
    assert response.status_code == 200, "Expected 200 for non-existent question ID."
    data = response.json()
    assert "message" in data, "Response should contain 'message' key."
    assert "weak question removed" in data["message"].lower(), \
        "Message should confirm question removal (idempotent)."