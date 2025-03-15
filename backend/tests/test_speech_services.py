import pytest
from unittest.mock import Mock, patch, MagicMock
import io
import json
import base64
from werkzeug.exceptions import BadRequest

# Import the modules to test - adjust paths as needed
from utils.speech_2_text import speech_to_text
from utils.text_2_speech import text_to_speech
from utils.validation_utils import validate_audio_format, validate_text_input
from utils.error_handlers import handle_bad_request

class TestSpeech2TextService:
    @pytest.fixture
    def speech2text_service(self):
        return speech_to_text()
    
    # @patch('utils.speech_2_text.sr')
    # def test_convert_speech_to_text_success(self, mock_sr, speech2text_service):
    #     # Mock the speech recognition library
    #     mock_recognizer = Mock()
    #     mock_sr.Recognizer.return_value = mock_recognizer
    #     mock_recognizer.recognize_google.return_value = "This is a test transcription"
        
    #     # Create a mock audio file instead of reading from assets
    #     mock_audio_data = io.BytesIO(b"fake audio data")
    #     mock_audio_data.name = "test.mp3"
        
    #     # Test the conversion
    #     result = speech2text_service.convert_speech_to_text(mock_audio_data)
        
    #     # Assertions
    #     assert result["success"] is True
    #     assert result["text"] == "This is a test transcription"
    #     mock_recognizer.recognize_google.assert_called_once()
    
    # @patch('utils.speech_2_text.speech_recognition')
    # def test_convert_speech_to_text_recognition_error(self, mock_sr, speech2text_service):
    #     # Mock the speech recognition library with an error
    #     mock_recognizer = Mock()
    #     mock_sr.Recognizer.return_value = mock_recognizer
    #     mock_recognizer.recognize_google.side_effect = Exception("Recognition error")
        
    #     # Create a mock audio file
    #     mock_audio_data = io.BytesIO(b"fake audio data")
    #     mock_audio_data.name = "test.wav"
        
    #     # Test the conversion with error
    #     result = speech2text_service.convert_speech_to_text(mock_audio_data)
        
    #     # Assertions
    #     assert result["success"] is False
    #     assert "error" in result
    #     assert "Recognition error" in result["error"]
    
    # @patch('utils.speech_2_text.speech_recognition')
    # def test_convert_base64_audio_to_text(self, mock_sr, speech2text_service):
    #     # Mock the speech recognition library
    #     mock_recognizer = Mock()
    #     mock_sr.Recognizer.return_value = mock_recognizer
    #     mock_recognizer.recognize_google.return_value = "Base64 audio transcription"
        
    #     # Create a mock base64 audio data
    #     base64_audio = base64.b64encode(b"fake audio data").decode('utf-8')
        
    #     # Test the conversion
    #     result = speech2text_service.convert_base64_audio_to_text(base64_audio, "audio/wav")
        
    #     # Assertions
    #     assert result["success"] is True
    #     assert result["text"] == "Base64 audio transcription"

class TestText2SpeechService:
    @pytest.fixture
    def text2speech_service(self):
        return text_to_speech()
    
    # @patch('utils.text_to_speech.gTTS')
    # def test_convert_text_to_speech_success(self, mock_gtts, text2speech_service):
    #     # Mock gTTS
    #     mock_tts = Mock()
    #     mock_gtts.return_value = mock_tts
        
    #     # Test the conversion
    #     result = text2speech_service.convert_text_to_speech("Hello, this is a test")
        
    #     # Assertions
    #     assert result["success"] is True
    #     assert "audio_data" in result
    #     mock_tts.save.assert_called_once()
    
    # @patch('utils.text_to_speech.gTTS')
    # def test_convert_text_to_speech_error(self, mock_gtts, text2speech_service):
    #     # Mock gTTS with an error
    #     mock_gtts.side_effect = Exception("TTS error")
        
    #     # Test the conversion with error
    #     result = text2speech_service.convert_text_to_speech("Hello, this is a test")
        
    #     # Assertions
    #     assert result["success"] is False
    #     assert "error" in result
    #     assert "TTS error" in result["error"]
    
    def test_convert_text_to_speech_empty_text(self, text2speech_service):
        # Test with empty text
        result = text2speech_service.convert_text_to_speech("")
        
        # Assertions
        assert result["success"] is False
        assert "error" in result
        assert "Empty text" in result["error"]

class TestValidationUtils:
    def test_validate_audio_format_valid(self):
        # Test with valid formats
        assert validate_audio_format("audio/wav") is True
        assert validate_audio_format("audio/mp3") is True
        assert validate_audio_format("audio/mpeg") is True
    
    def test_validate_audio_format_invalid(self):
        # Test with invalid formats
        with pytest.raises(BadRequest):
            validate_audio_format("image/jpeg")
        
        with pytest.raises(BadRequest):
            validate_audio_format("text/plain")
    
    def test_validate_text_input_valid(self):
        # Test with valid text
        assert validate_text_input("This is a valid text") is True
        assert validate_text_input("Short") is True
    
    def test_validate_text_input_invalid(self):
        # Test with invalid text
        with pytest.raises(BadRequest):
            validate_text_input("")
        
        with pytest.raises(BadRequest):
            validate_text_input(None)
        
        # Test with text that's too long (assuming max length is 1000)
        long_text = "a" * 1001
        with pytest.raises(BadRequest):
            validate_text_input(long_text)

# class TestErrorHandler:
#     def test_handle_bad_request(self):
#         # Test handling BadRequest
#         error = BadRequest("Invalid input")
#         response = handle_bad_request(error)
        
#         # Parse the response data
#         response_data = json.loads(response.data.decode('utf-8'))
        
#         # Assertions
#         assert response.status_code == 400
#         assert response_data["error"] == "Invalid input"
#         assert response_data["success"] is False 