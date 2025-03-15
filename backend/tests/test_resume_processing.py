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
    resume_path = test_files_dir / "test_resume.pdf"
    resume_path.write_bytes(b"%PDF-1.4\n%Test PDF content")
    return resume_path

def test_parse_resume(base_url, sample_resume):
    """Test the resume parsing endpoint with a valid resume file."""
    assert sample_resume.exists(), "Sample resume file not found."
    
    with open(sample_resume, "rb") as resume_file:
        files = {"resume": ("test_resume.pdf", resume_file, "application/pdf")}
        response = requests.post(f"{base_url}/resume/parse", files=files)
    
    assert response.status_code == 200, "Resume parsing failed."
    data = response.json()
    assert "parsed_text" in data, "Response should include parsed text."
    assert isinstance(data["parsed_text"], str), "Parsed text should be a string."