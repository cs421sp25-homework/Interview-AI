# import pytest
# import requests
# from pathlib import Path
# import io
# from reportlab.pdfgen import canvas
# from reportlab.lib.pagesizes import letter

# @pytest.fixture
# def base_url():
#     return "http://127.0.0.1:5001/api"

# @pytest.fixture
# def test_files_dir(tmp_path):
#     """Create a temporary directory for test files"""
#     test_dir = tmp_path / "test_files"
#     test_dir.mkdir()
#     return test_dir

# @pytest.fixture
# def sample_resume(test_files_dir):
#     """Create a sample resume PDF file for testing"""
#     resume_path = test_files_dir / "test_resume.pdf"
    
#     # Create a simple PDF file
#     with open(resume_path, 'wb') as f:
#         f.write(b"%PDF-1.4\n%Test PDF content")
    
#     # Verify the file was created
#     assert resume_path.exists(), "Failed to create sample resume file"
    
#     return resume_path

# def test_parse_resume(base_url, sample_resume):
#     """Test the resume parsing endpoint with a valid resume file."""
#     assert sample_resume.exists(), "Sample resume file not found."
    
#     with open(sample_resume, "rb") as resume_file:
#         files = {"resume": ("test_resume.pdf", resume_file, "application/pdf")}
#         response = requests.post(f"{base_url}/resume/parse", files=files)
    
#     print(response.json())

#     assert response.status_code == 200, "Resume parsing failed."
#     data = response.json()
#     assert "parsed_text" in data, "Response should include parsed text."
#     assert isinstance(data["parsed_text"], str), "Parsed text should be a string."

# def test_resume_extraction(sample_resume, monkeypatch):
#     """Test that resume extraction works correctly"""
#     from services.resume_service import ResumeService
#     from models.resume_model import ResumeData, EducationHistory, Experience
    
#     # Mock the LLM response to return valid data
#     def mock_invoke(self, messages):
#         from langchain_core.messages import AIMessage
#         return [AIMessage(content="""
#         ```json
#         {
#             "education_history": [
#                 {
#                     "institution": "MIT",
#                     "degree": "Master of Computer Science",
#                     "year": "2014-2016",
#                     "location": "Cambridge, MA",
#                     "description": "Focused on AI and Machine Learning"
#                 }
#             ],
#             "experience": [
#                 {
#                     "company": "Google",
#                     "position": "Senior Software Engineer",
#                     "duration": "2018-Present",
#                     "description": "Developed scalable backend services"
#                 }
#             ]
#         }
#         ```
#         """)]
    
#     # Apply the mock
#     from llm.llm_interface import LLMInterface
#     monkeypatch.setattr(LLMInterface, "invoke", mock_invoke)
    
#     # Create the resume service
#     resume_service = ResumeService()
    
#     # Open the sample resume file
#     with open(sample_resume, 'rb') as f:
#         # Process the resume
#         result = resume_service.process_resume(f)
    
#     # Verify the extraction results
#     assert result is not None
#     assert isinstance(result, ResumeData)
#     assert len(result.education_history) == 1
#     assert result.education_history[0].institution == "MIT"
#     assert len(result.experience) == 1
#     assert result.experience[0].company == "Google"