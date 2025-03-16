import pytest
import requests
import os
import tempfile
from pathlib import Path

@pytest.fixture(scope="session")
def base_url():
    return "http://127.0.0.1:5001/api"

@pytest.fixture(scope="session")
def test_user():
    return {
        "email": "tlin56@jh.edu",
        "password": "12345678"
    }

@pytest.fixture(scope="function")
def auth_headers(base_url, test_user):
    """Get authentication token for tests"""
    login_response = requests.post(
        f"{base_url}/auth/login", 
        json=test_user
    )
    token = login_response.json().get("token")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_files_dir():
    """Create a temporary directory for test files"""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)

@pytest.fixture(scope="function")
def sample_resume(test_files_dir):
    """Create a sample resume file for testing"""
    resume_path = test_files_dir / "test_resume.pdf"
    resume_path.write_bytes(b"%PDF-1.4\n%Test PDF content")
    return resume_path 