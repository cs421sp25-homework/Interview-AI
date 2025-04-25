import pytest
from unittest.mock import MagicMock, patch, mock_open
import os
import tempfile
import json
from io import BytesIO

# Import service modules
from services.authorization_service import AuthorizationService
from services.chat_history_service import ChatHistoryService
from services.chat_service import ChatService
from services.config_service import ConfigService
from services.elo_calculator import SupabaseEloService
from services.profile_service import ProfileService
from services.resume_service import ResumeService
from services.storage_service import StorageService
from services.audio_processing import AudioProcessingService
from services.file_storage import FileStorageService

@pytest.fixture
def supabase_client():
    mock_client = MagicMock()
    # Configure the mock to return appropriate values for common methods
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.execute.return_value = {"data": []}
    return mock_client

class TestAuthorizationService:
    def test_initialization(self):
        """Test that AuthorizationService initializes correctly with required parameters"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        
        with patch('services.authorization_service.create_client', return_value=MagicMock()):
            auth_service = AuthorizationService(supabase_url, supabase_key)
            assert auth_service.supabase is not None
    
    def test_get_user(self, supabase_client):
        """Test the get_user method"""
        with patch('services.authorization_service.create_client', return_value=supabase_client):
            service = AuthorizationService(
                supabase_url="https://example.supabase.co",
                supabase_key="test-key"
            )
            
            # Mock the response
            mock_user_data = {
                "id": "user123",
                "email": "test@example.com",
                "name": "Test User"
            }
            supabase_client.table().select().eq().execute.return_value = {
                "data": [mock_user_data]
            }
            
            user = service.get_user("user123")
            assert user is not None
            assert user.get("id") == "user123"
            assert user.get("email") == "test@example.com"

    def test_check_user_exists(self, supabase_client):
        """Test that check_user_exists works correctly"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        
        with patch('services.authorization_service.create_client', return_value=supabase_client):
            auth_service = AuthorizationService(supabase_url, supabase_key)
            
            # ... existing code ...

    def test_check_email_exists(self, supabase_client):
        """Test that check_email_exists works correctly"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        
        with patch('services.authorization_service.create_client', return_value=supabase_client):
            auth_service = AuthorizationService(supabase_url, supabase_key)
            
            # ... existing code ...

class TestChatHistoryService:
    def test_initialization(self):
        """Test that ChatHistoryService initializes correctly with required parameters"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        
        with patch('services.chat_history_service.create_client', return_value=MagicMock()):
            chat_history_service = ChatHistoryService(supabase_url, supabase_key)
            assert chat_history_service.supabase is not None
            assert chat_history_service.table_name == 'interview_logs'
    
    def test_get_chat_history(self, supabase_client):
        """Test that get_chat_history retrieves messages correctly"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        
        with patch('services.chat_history_service.create_client', return_value=supabase_client):
            chat_history_service = ChatHistoryService(supabase_url, supabase_key)
            
            # ... existing code ...

class TestSupabaseEloService:
    def test_initialization(self):
        """Test that SupabaseEloService initializes correctly"""
        with patch('services.elo_calculator.create_client', return_value=MagicMock()):
            with patch('services.elo_calculator.SUPABASE_URL', 'https://example.supabase.co'):
                with patch('services.elo_calculator.SUPABASE_KEY', 'fake-api-key'):
                    elo_service = SupabaseEloService()
                    assert elo_service.supabase is not None
    
    def test_get_user_elo(self, supabase_client):
        """Test that get_user_elo retrieves ELO rating correctly"""
        with patch('services.elo_calculator.create_client', return_value=supabase_client):
            with patch('services.elo_calculator.SUPABASE_URL', 'https://example.supabase.co'):
                with patch('services.elo_calculator.SUPABASE_KEY', 'fake-api-key'):
                    elo_service = SupabaseEloService()
                    
                    # ... existing code ...

class TestAudioProcessingService:
    def test_convert_to_wav(self):
        """Test that convert_to_wav converts audio to WAV format correctly"""
        audio_service = AudioProcessingService()
        
        # Create a mock audio file
        mock_audio_bytes = b"mock audio data"
        mock_audio_file = BytesIO(mock_audio_bytes)
        
        # Test with mocked pydub functionality
        with patch("services.audio_processing.AudioSegment") as MockAudioSegment:
            mock_segment = MagicMock()
            MockAudioSegment.from_file.return_value = mock_segment
            mock_segment.export.return_value = BytesIO(b"converted wav data")
            
            # ... existing code ...

class TestProfileService:
    def test_initialization(self):
        """Test that ProfileService initializes correctly with required parameters"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        
        with patch('services.profile_service.create_client', return_value=MagicMock()):
            profile_service = ProfileService(supabase_url, supabase_key)
            assert profile_service.supabase is not None
    
    def test_get_user_profile(self, supabase_client):
        """Test that get_user_profile retrieves profile data correctly"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        
        with patch('services.profile_service.create_client', return_value=supabase_client):
            profile_service = ProfileService(supabase_url, supabase_key)
            
            # ... existing code ...

class TestResumeService:
    def test_initialization(self):
        """Test that ResumeService initializes correctly with required parameters"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        
        with patch('services.resume_service.create_client', return_value=MagicMock()):
            resume_service = ResumeService(supabase_url, supabase_key)
            assert resume_service.supabase is not None
    
    def test_save_resume(self, supabase_client):
        """Test that save_resume saves resume data correctly"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        
        with patch('services.resume_service.create_client', return_value=supabase_client):
            resume_service = ResumeService(supabase_url, supabase_key)
            
            # ... existing code ...

class TestStorageService:
    def test_initialization(self):
        """Test that StorageService initializes correctly with required parameters"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        bucket_name = "test-bucket"
        
        with patch('services.storage_service.create_client', return_value=MagicMock()):
            storage_service = StorageService(supabase_url, supabase_key, bucket_name)
            assert storage_service.supabase is not None
            assert storage_service.bucket_name == bucket_name
    
    def test_upload_file(self, supabase_client):
        """Test that upload_file uploads a file correctly"""
        supabase_url = "https://example.supabase.co"
        supabase_key = "fake-api-key"
        bucket_name = "test-bucket"
        
        with patch('services.storage_service.create_client', return_value=supabase_client):
            storage_service = StorageService(supabase_url, supabase_key, bucket_name)
            
            # ... existing code ...

class TestConfigService:
    # ... existing code ...
    pass  # Placeholder to ensure proper indentation

class TestChatService:
    def test_initialization(self):
        """Test that ChatService initializes correctly with required parameters"""
        with patch('services.chat_service.OpenAI', return_value=MagicMock()):
            chat_service = ChatService(api_key="fake-api-key")
            assert chat_service.client is not None
    
    def test_generate_response(self):
        """Test that generate_response calls the OpenAI API correctly"""
        with patch('services.chat_service.OpenAI') as MockOpenAI:
            # ... existing code ...
            pass  # Placeholder to ensure proper indentation

# Similar patterns for the remaining services... 