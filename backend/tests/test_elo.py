import pytest
import requests

# ------------------------------------------------------------------------------
# Tests for POST /api/elo/update
# ------------------------------------------------------------------------------

def test_update_elo_score_valid(base_url):
    """
    Test updating ELO score with valid payload.
    Expects:
      - Status code: 200
      - JSON with 'success': True and 'data' key.
    """
    payload = {
        "email": "testuser@example.com",
        "score": 85,
        "name": "Test User",
        "difficulty": "medium",
        "interview_type": "technical"
    }
    response = requests.post(f"{base_url}/elo/update", json=payload)
    assert response.status_code == 200, "Expected 200 for valid ELO update."
    data = response.json()
    assert "success" in data and data["success"] is True, "Response should indicate success."
    assert "data" in data, "Response should contain 'data' key."

def test_update_elo_score_missing_fields(base_url):
    """
    Test updating ELO score with missing required fields.
    Expects:
      - Status code: 400
      - JSON with 'success': False and error message.
    """
    payload = {"score": 85}  # Missing email
    response = requests.post(f"{base_url}/elo/update", json=payload)
    assert response.status_code == 400, "Expected 400 for missing required fields."
    data = response.json()
    assert "success" in data and data["success"] is False, "Response should indicate failure."
    assert "message" in data and "email and score are required" in data["message"].lower(), \
        "Error should indicate missing required fields."

def test_update_elo_score_invalid_score(base_url):
    """
    Test updating ELO score with an invalid score (out of range).
    Expects:
      - Status code: 400
      - JSON with 'success': False and error message.
    """
    payload = {
        "email": "testuser@example.com",
        "score": 150  # Out of range
    }
    response = requests.post(f"{base_url}/elo/update", json=payload)
    assert response.status_code == 400, "Expected 400 for invalid score."
    data = response.json()
    assert "success" in data and data["success"] is False, "Response should indicate failure."
    assert "message" in data and "score must be between 0 and 100" in data["message"].lower(), \
        "Error should indicate invalid score range."

# ------------------------------------------------------------------------------
# Tests for GET /api/elo/history/<email>
# ------------------------------------------------------------------------------

def test_get_elo_history_valid_email(base_url):
    """
    Test retrieving ELO history for a valid email.
    Expects:
      - Status code: 200
      - JSON with 'success': True and 'data' key containing a list.
    """
    email = "testuser@example.com"
    response = requests.get(f"{base_url}/elo/history/{email}")
    assert response.status_code == 200, "Expected 200 for valid email."
    data = response.json()
    assert "success" in data and data["success"] is True, "Response should indicate success."
    assert "data" in data, "Response should contain 'data' key."
    assert isinstance(data["data"], list), "Data should be a list."

def test_get_elo_history_with_limit(base_url):
    """
    Test retrieving ELO history with a limit parameter.
    Expects:
      - Status code: 200
      - JSON with 'success': True and 'data' key containing a list.
    """
    email = "testuser@example.com"
    limit = 5
    response = requests.get(f"{base_url}/elo/history/{email}?limit={limit}")
    assert response.status_code == 200, "Expected 200 for valid email with limit."
    data = response.json()
    assert "success" in data and data["success"] is True, "Response should indicate success."
    assert "data" in data, "Response should contain 'data' key."
    assert isinstance(data["data"], list), "Data should be a list."
    # Note: Cannot assert length <= limit without knowing elo_service behavior

# ------------------------------------------------------------------------------
# Tests for GET /api/elo/current/<email>
# ------------------------------------------------------------------------------

def test_get_current_elo_valid_email(base_url):
    """
    Test retrieving current ELO score for a valid email.
    Expects:
      - Status code: 200
      - JSON with 'success': True and 'data' containing email, current_elo, previous_elo, change.
    """
    email = "testuser@example.com"
    response = requests.get(f"{base_url}/elo/current/{email}")
    assert response.status_code == 200, "Expected 200 for valid email."
    data = response.json()
    assert "success" in data and data["success"] is True, "Response should indicate success."
    assert "data" in data, "Response should contain 'data' key."
    assert "email" in data["data"] and data["data"]["email"] == email, "Response should include email."
    assert "current_elo" in data["data"], "Response should include current_elo."
    assert "previous_elo" in data["data"], "Response should include previous_elo."
    assert "change" in data["data"], "Response should include change."

# ------------------------------------------------------------------------------
# Tests for GET /api/elo/leaderboard
# ------------------------------------------------------------------------------

def test_get_leaderboard_default(base_url):
    """
    Test retrieving the leaderboard with default parameters.
    Expects:
      - Status code: 200
      - JSON with 'success': True and 'data' containing a list.
    """
    response = requests.get(f"{base_url}/elo/leaderboard")
    assert response.status_code == 200, "Expected 200 for leaderboard."
    data = response.json()
    assert "success" in data and data["success"] is True, "Response should indicate success."
    assert "data" in data, "Response should contain 'data' key."
    assert isinstance(data["data"], list), "Data should be a list."

def test_get_leaderboard_with_parameters(base_url):
    """
    Test retrieving the leaderboard with limit and offset parameters.
    Expects:
      - Status code: 200
      - JSON with 'success': True and 'data' containing a list.
    """
    limit = 5
    offset = 10
    response = requests.get(f"{base_url}/elo/leaderboard?limit={limit}&offset={offset}")
    assert response.status_code == 200, "Expected 200 for leaderboard with parameters."
    data = response.json()
    assert "success" in data and data["success"] is True, "Response should indicate success."
    assert "data" in data, "Response should contain 'data' key."
    assert isinstance(data["data"], list), "Data should be a list."

# ------------------------------------------------------------------------------
# Tests for GET /api/health
# ------------------------------------------------------------------------------

def test_health_check(base_url):
    """
    Test the health check endpoint.
    Expects:
      - Status code: 200
      - JSON with 'status': 'healthy' and 'message'.
    """
    response = requests.get(f"{base_url}/health")
    assert response.status_code == 200, "Expected 200 for health check."
    data = response.json()
    assert "status" in data and data["status"] == "healthy", "Response should indicate healthy status."
    assert "message" in data and "elo api is running" in data["message"].lower(), \
        "Response should confirm API is running."