
import pytest
import requests
from io import BytesIO

def test_generate_good_response_valid(base_url):
    """
    Test a valid POST request to /api/generate_good_response.
    Expects:
      - Status code: 200
      - JSON containing a 'response' key with improved answer text.
    """
    payload = {"message": "I'm not very sure about the answer."}
    response = requests.post(f"{base_url}/generate_good_response", json=payload)
    assert response.status_code == 200, "Expected 200 OK for valid request."
    data = response.json()
    assert "response" in data, "Response JSON should contain 'response' key."


def test_generate_good_response_missing_message(base_url):
    """
    Test a POST request to /api/generate_good_response without a 'message' field.
    Expects:
      - Status code: 400
      - JSON error indicating 'Missing message'.
    """
    payload = {}
    response = requests.post(f"{base_url}/generate_good_response", json=payload)
    assert response.status_code == 400, "Expected 400 for missing 'message' field."
    data = response.json()
    assert "error" in data and data["error"] == "Missing message", \
        "Expected 'Missing message' error in response."


# ------------------------------------------------------------------------------
# Tests for /api/overall_scores/<id> and /api/overall_scores/email/<email>
# ------------------------------------------------------------------------------

def test_get_overall_scores_by_email_valid(base_url):
    """
    Test retrieving overall scores by email.
    Expects:
      - Status code: 200
      - JSON containing a 'scores' object with all required keys.
    NOTE: Adjust 'email' as needed. Also, you might need test data in your DB.
    """
    test_email = "testuser@example.com"
    response = requests.get(f"{base_url}/overall_scores/email/{test_email}")
    # It's possible this returns default 0 scores if there's no data
    # or real average if data exists. In both cases we expect 200.
    assert response.status_code == 200, \
        "Expected 200 even if no records are found (returns default data)."
    data = response.json()
    assert "scores" in data, "Response JSON should contain 'scores'."
    # The 'scores' object should have these six keys:
    for key in ["confidence", "communication", "technical", 
                "problem_solving", "resume strength", "leadership"]:
        assert key in data["scores"], f"Missing expected score key: {key}"


# ------------------------------------------------------------------------------
# Tests for /api/interview_scores/<interview_id>
# ------------------------------------------------------------------------------

def test_get_interview_scores_valid(base_url):
    """
    Test retrieving interview scores with a valid interview_id.
    Expects:
      - Status code: 200
      - JSON containing 'scores' with multiple metrics.
    This test might need an existing 'interview_id' in your DB for success.
    """
    interview_id = 1  # Replace with an actual interview_id in your DB
    response = requests.get(f"{base_url}/interview_scores/{interview_id}")
    if response.status_code == 200:
        data = response.json()
        assert "scores" in data, "Response JSON should contain 'scores'."
        for key in ["confidence", "communication", "technical", 
                    "problem_solving", "resume strength", "leadership"]:
            assert key in data["scores"], f"Missing expected score key: {key}"
    else:
        # If there's no record, we expect a 404. We can handle that as well.
        assert response.status_code == 404, \
            "If there's no record, expecting 404 for interview not found."


# ------------------------------------------------------------------------------
# Tests for /api/interview_feedback_strengths/<interview_id>
# /api/interview_feedback_improvement_areas/<interview_id>
# /api/interview_feedback_specific_feedback/<interview_id>
# ------------------------------------------------------------------------------

def test_get_interview_feedback_strengths_valid(base_url):
    """
    Test retrieving interview feedback strengths for a valid interview_id.
    Expects:
      - Status code: 200
      - JSON containing 'strengths' key.
    """
    interview_id = 1  # Replace with a valid ID that has data in DB
    response = requests.get(f"{base_url}/interview_feedback_strengths/{interview_id}")
    if response.status_code == 200:
        data = response.json()
        assert "strengths" in data, "Response JSON should contain 'strengths'."
    else:
        # If no record is found, we expect 404.
        assert response.status_code == 404, "Expected 404 if no feedback is found."


def test_get_interview_feedback_improvement_areas_valid(base_url):
    """
    Test retrieving interview feedback improvement areas for a valid interview_id.
    Expects:
      - Status code: 200
      - JSON containing 'improvement_areas' key.
    """
    interview_id = 1  # Replace with a valid ID
    response = requests.get(f"{base_url}/interview_feedback_improvement_areas/{interview_id}")
    if response.status_code == 200:
        data = response.json()
        assert "improvement_areas" in data, "Response JSON should contain 'improvement_areas'."
    else:
        assert response.status_code == 404, "Expected 404 if no feedback is found."


def test_get_interview_feedback_specific_feedback_valid(base_url):
    """
    Test retrieving specific feedback for a valid interview_id.
    Expects:
      - Status code: 200
      - JSON containing 'specific_feedback' key.
    """
    interview_id = 1  # Replace with a valid ID
    response = requests.get(f"{base_url}/interview_feedback_specific_feedback/{interview_id}")
    if response.status_code == 200:
        data = response.json()
        assert "specific_feedback" in data, "Response JSON should contain 'specific_feedback'."
    else:
        assert response.status_code == 404, "Expected 404 if no feedback is found."