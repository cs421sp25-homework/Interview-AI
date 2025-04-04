import pytest
import requests
from pathlib import Path

@pytest.fixture
def base_url():
    return "http://127.0.0.1:5001/api"

@pytest.fixture
def test_files_dir(tmp_path):
    """Create a temporary directory for test files"""
    test_dir = tmp_path / "test_files"
    test_dir.mkdir()
    return test_dir

@pytest.fixture
def sample_resume(test_files_dir):
    """Create a sample resume file for testing"""
    # Download the sample resume from the provided URL
    resume_url = "https://h0xotvuawi.ufs.sh/f/KSLubuOGoQY2gKqJCRGs17J09WhwGDMtonXja3FTNRfVOkx6"
    response = requests.get(resume_url)
    
    # Save the downloaded resume to the test directory
    resume_path = test_files_dir / "test_resume.pdf"
    resume_path.write_bytes(response.content)
    
    return resume_path

def test_signup_with_resume(base_url, sample_resume):
    """Test the signup endpoint with a resume file."""
    assert sample_resume.exists(), "Sample resume file not found."
    
    with open(sample_resume, "rb") as resume_file:
        files = {"resume": ("test_resume.pdf", resume_file, "application/pdf")}
        data = {
            "email": "newuser@example.com",
            "password": "securepassword123",
            "first_name": "John",
            "last_name": "Doe",
            "phone": "123-456-7890",
            "job_title": "Software Engineer",
            "industry": "Technology",
            "years_of_experience": "5"
        }
        response = requests.post(
            f"{base_url}/auth/signup",
            data=data,
            files=files
        )
    
    assert response.status_code == 201, "Signup should succeed with valid data."
    data = response.json()
    assert "message" in data, "Response should include a success message."
    assert data["message"] == "User created successfully"