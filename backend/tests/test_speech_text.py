
import pytest
import requests
from io import BytesIO

@pytest.fixture
def base_url():
    """
    Fixture to provide a base URL for all tests.
    Change this if your server runs on a different host/port.
    """
    return "http://127.0.0.1:5001/api"

def test_text2speech_valid_request(base_url):
    """
    Test a valid POST request to /api/text2speech.
    Expects:
      - Status code: 200
      - Response is an audio file (MIME type audio/mpeg).
      - 'X-Audio-Duration' header is set.
    """
    payload = {
        "text": "Hello, this is a test.",
        "voice": "alloy",
        "speed": 1.0
    }
    response = requests.post(f"{base_url}/text2speech", json=payload)

    # Check if the request was successful
    assert response.status_code == 200, "Expected 200 OK for valid text input."
    # Check MIME type in the headers (Flask >= 2.2 sets 'Content-Type' for files as well)
    assert "audio/mpeg" in response.headers.get("Content-Type", ""), \
        "Expected 'audio/mpeg' content for successful TTS."

    # Verify that the custom duration header exists
    assert "X-Audio-Duration" in response.headers, "Expected 'X-Audio-Duration' header in response."


def test_text2speech_missing_text(base_url):
    """
    Test a POST request to /api/text2speech with missing text.
    Expects:
      - Status code: 400
      - JSON response containing an error message about missing 'text'.
    """
    payload = {}
    response = requests.post(f"{base_url}/text2speech", json=payload)
    
    assert response.status_code == 400, "Expected 400 Bad Request for missing text."
    data = response.json()
    assert "error" in data, "Response JSON should contain 'error'."
    assert data["error"] == "Invalid request", "Expected 'Invalid request' error."
    assert "message" in data and "Text field is required" in data["message"], \
        "Expected error message about missing 'text' field."


def test_text2speech_invalid_speed(base_url):
    """
    Test a POST request to /api/text2speech with invalid 'speed' to induce a ValueError.
    Expects:
      - Status code: 400
      - JSON response indicating 'Invalid input'.
    """
    payload = {
        "text": "Sample text",
        "speed": "not_a_number"  # invalid speed to cause ValueError
    }
    response = requests.post(f"{base_url}/text2speech", json=payload)

    assert response.status_code == 400, "Expected 400 for invalid speed input."
    data = response.json()
    assert "error" in data and data["error"] == "Invalid input", \
        "Expected 'Invalid input' error for invalid speed type."


# ------------------------------------------------------------------------------
# Tests for /api/speech2text
# ------------------------------------------------------------------------------

def test_speech2text_valid_request(base_url):
    """
    Test a valid POST request to /api/speech2text with a mock audio file.
    Expects:
      - Status code: 200
      - JSON containing 'transcript' and 'status' keys.
    Note: This test uses a BytesIO object to mimic a small audio file upload.
    """
    # Create fake audio data in memory
    fake_audio = BytesIO(b"This is fake audio data.")
    files = {"audio": ("test_audio.wav", fake_audio, "audio/wav")}
    
    response = requests.post(f"{base_url}/speech2text", files=files)
    assert response.status_code == 200, "Expected 200 OK for valid audio upload."
    data = response.json()
    assert "transcript" in data, "Response JSON should contain a 'transcript'."
    assert "status" in data and data["status"] == "success", \
        "Expected 'status' to be 'success' in valid response."


def test_speech2text_missing_file(base_url):
    """
    Test a POST request to /api/speech2text with no 'audio' file in form-data.
    Expects:
      - Status code: 400
      - JSON error about missing file.
    """
    response = requests.post(f"{base_url}/speech2text", files={})
    assert response.status_code == 400, "Expected 400 Bad Request for missing file."
    data = response.json()
    assert "error" in data and data["error"] == "Missing file", \
        "Expected 'Missing file' error for no 'audio' field in request."


def test_speech2text_file_too_large(base_url):
    """
    Test a POST request to /api/speech2text with a file larger than 10MB to
    trigger the size limit check.
    Expects:
      - Status code: 400
      - JSON error about file being too large.
    """
    # Create ~11MB of data to exceed the 10MB limit
    large_audio = BytesIO(b"A" * (11 * 1024 * 1024))
    files = {"audio": ("large_test_audio.wav", large_audio, "audio/wav")}
    
    response = requests.post(f"{base_url}/speech2text", files=files)
    assert response.status_code == 400, "Expected 400 for file that exceeds 10MB."
    data = response.json()
    assert "error" in data and data["error"] == "File too large", \
        "Expected 'File too large' error for exceeding file limit."