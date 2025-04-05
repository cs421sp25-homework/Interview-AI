import pytest
from unittest.mock import MagicMock, patch
from services.resume_service import ResumeService  # adjust import path


@pytest.fixture
def mock_llm_interface():
    """Return a mock LLM interface."""
    return MagicMock()


@pytest.fixture
def resume_service(mock_llm_interface):
    """
    Patch the LLMInterface inside ResumeService so that
    it uses our mock instead of the real one.
    """
    with patch('services.resume_service.LLMInterface', return_value=mock_llm_interface):
        service = ResumeService()
    return service


def test_process_resume_success(resume_service, mock_llm_interface):
    # Mock out the PDF extraction, prompt generation, and LLM calls
    with patch('your_app.services.resume_service.extract_text_from_pdf', return_value="Sample PDF text"):
        with patch('your_app.services.resume_service.generate_prompt', return_value="Generated prompt"):
            # Suppose the LLM returns a message with JSON content
            mock_llm_interface.invoke.return_value = [MagicMock(content='{"education_history": [{"school":"Test University","degree":"BSc"}], "experience":[{"company":"TestCorp","role":"Engineer"}]}')]
            
            # Call the process_resume method with a fake file-like object
            fake_file = MagicMock()
            result = resume_service.process_resume(fake_file)

            assert result is not None, "Should return a ResumeData object."
            assert len(result.education_history) == 1
            assert result.education_history[0].school == "Test University"
            assert len(result.experience) == 1
            assert result.experience[0].company == "TestCorp"


def test_process_resume_invalid_format(resume_service, mock_llm_interface):
    # LLM returns something that's not JSON
    mock_llm_interface.invoke.return_value = [MagicMock(content="Not valid JSON")]
    with patch('your_app.services.resume_service.extract_text_from_pdf', return_value="pdf text"):
        with patch('your_app.services.resume_service.generate_prompt', return_value="some prompt"):
            fake_file = MagicMock()
            with pytest.raises(ValueError, match="Invalid extraction result format"):
                resume_service.process_resume(fake_file)


def test_process_resume_exception(resume_service):
    # Force an exception in extract_text_from_pdf
    with patch('your_app.services.resume_service.extract_text_from_pdf', side_effect=Exception("PDF read error")):
        fake_file = MagicMock()
        with pytest.raises(Exception, match="PDF read error"):
            resume_service.process_resume(fake_file)
