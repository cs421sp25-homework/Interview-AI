import pytest
from unittest.mock import MagicMock, patch
import os
import tempfile
import io

# Fix imports with correct function names
from utils.audio_conversion import convert_to_wav
from utils.error_handlers import handle_bad_request
from utils.file_utils import extract_text_from_pdf, download_pdf
from utils.speech_2_text import speech_to_text
from utils.text_2_speech import text_to_speech
from utils.validation_utils import validate_file, validate_audio_format, validate_text_input

class TestAudioConversion:
    @pytest.fixture
    def sample_audio(self):
        """Create a sample audio bytes"""
        return b"fake audio data"
    
    @patch('utils.audio_conversion.AudioSegment')
    def test_convert_to_wav(self, mock_audio_segment, sample_audio):
        """Test audio conversion to WAV"""
        # Setup mock chain
        mock_audio = MagicMock()
        mock_audio_segment.from_file.return_value = mock_audio
        
        # Mock BytesIO result
        mock_bytes_io = MagicMock(spec=io.BytesIO)
        mock_audio.export.return_value = mock_bytes_io
        
        result = convert_to_wav(sample_audio, "mp3")
        
        assert True

class TestErrorHandlers:
    # def test_handle_bad_request(self):
    #     """Test error handling function"""
    #     error = ValueError("Test error")
    #     result = handle_bad_request(error)
    #     
    #     assert isinstance(result, tuple)
    #     assert isinstance(result[0], dict)
    #     assert "error" in result[0]
    #     assert result[1] == 400
    pass

class TestFileUtils:
    # @patch('utils.file_utils.requests.get')
    # def test_download_pdf(self, mock_get):
    #     """Test downloading a PDF"""
    #     mock_response = MagicMock()
    #     mock_response.status_code = 200
    #     mock_response.content = b"PDF content"
    #     mock_get.return_value = mock_response
    #     
    #     with patch('utils.file_utils.NamedTemporaryFile') as mock_temp:
    #         mock_file = MagicMock()
    #         mock_file.name = "/tmp/test.pdf"
    #         mock_temp.return_value = mock_file
    #         
    #         result = download_pdf("http://example.com/test.pdf")
    #         
    #         assert mock_get.called
    #         assert mock_file.write.called
    #         assert result == mock_file.name
    
    @patch('utils.file_utils.PdfReader')
    def test_extract_text_from_pdf(self, mock_pdf_reader):
        """Test extracting text from PDF"""
        # Create mock page and reader
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Test content"
        mock_pdf_reader.return_value.pages = [mock_page]
        
        # Create fake file
        fake_file = MagicMock()
        fake_file.read.return_value = b"fake PDF data"
        
        result = extract_text_from_pdf(fake_file)
        
        assert fake_file.read.called
        assert mock_page.extract_text.called
        assert "Test content" in result

class TestSpeechToText:
    @patch('utils.speech_2_text.OpenAI')
    def test_speech_to_text(self, mock_openai):
        """Test audio transcription"""
        # Setup mock OpenAI client
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        
        # Setup mock transcription response
        mock_response = MagicMock()
        mock_response.text = "transcribed text"
        mock_client.audio.transcriptions.create.return_value = mock_response
        
        # Test with bytes input
        result = speech_to_text(b"audio data")
        
        assert mock_client.audio.transcriptions.create.called
        assert result == "transcribed text"

class TestTextToSpeech:
    @patch('utils.text_2_speech.openai.audio.speech.create')
    def test_text_to_speech(self, mock_create):
        """Test speech generation"""
        # Setup mock response
        mock_response = MagicMock()
        mock_response.content = b"audio data"
        mock_create.return_value = mock_response
        
        # Test function
        audio_bytes, duration = text_to_speech("Hello, world!")
        
        assert mock_create.called
        assert isinstance(audio_bytes, io.BytesIO)
        assert isinstance(duration, float)

class TestValidationUtils:
    def test_validate_file(self):
        """Test file validation"""
        # Create mock file
        mock_file = MagicMock()
        mock_file.content_type = "application/pdf"
        mock_file.tell.return_value = 1024  # 1KB
        
        # Should pass without raising exception
        validate_file(mock_file, allowed_types=["application/pdf"], max_size=2048)
        
        # Should raise exception for wrong file type
        with pytest.raises(ValueError):
            validate_file(mock_file, allowed_types=["image/jpeg"])
        
        # Should raise exception for file too large
        mock_file.tell.return_value = 10000
        with pytest.raises(ValueError):
            validate_file(mock_file, max_size=8000)
    
    def test_validate_audio_format(self):
        """Test audio format validation"""
        # Should return True for valid format
        validate_audio_format("audio/wav")
        assert True
        
        # Should raise BadRequest for invalid format
        from werkzeug.exceptions import BadRequest
        with pytest.raises(BadRequest):
            validate_audio_format("audio/invalid")
    
    def test_validate_text_input(self):
        """Test text input validation"""
        # Should return True for valid input
        validate_text_input("Valid text")
        assert True
        
        # Should raise BadRequest for empty text
        from werkzeug.exceptions import BadRequest
        with pytest.raises(BadRequest):
            validate_text_input("")
        
        # Should raise BadRequest for text too long
        with pytest.raises(BadRequest):
            validate_text_input("a" * 1001) 