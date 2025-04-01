import pytest
from unittest.mock import Mock, patch
from ..services.auth_service import AuthService
from ..services.interview_service import InterviewService
from ..services.profile_service import ProfileService
from ..models.user import User
from ..models.interview import Interview

@pytest.fixture
def auth_service():
    return AuthService()

@pytest.fixture
def interview_service():
    return InterviewService()

@pytest.fixture
def profile_service():
    return ProfileService()

class TestAuthService:
    def test_validate_password(self, auth_service):
        """Test password validation logic"""
        # Test valid password
        assert auth_service.validate_password("StrongPass123!") == True
        
        # Test invalid passwords
        assert auth_service.validate_password("short") == False
        assert auth_service.validate_password("no-numbers") == False
        assert auth_service.validate_password("12345678") == False

    def test_validate_email(self, auth_service):
        """Test email validation logic"""
        # Test valid emails
        assert auth_service.validate_email("test@example.com") == True
        assert auth_service.validate_email("user.name+tag@domain.co.uk") == True
        
        # Test invalid emails
        assert auth_service.validate_email("invalid-email") == False
        assert auth_service.validate_email("@nodomain.com") == False
        assert auth_service.validate_email("spaces in@email.com") == False

    @patch('services.auth_service.bcrypt')
    def test_hash_password(self, mock_bcrypt, auth_service):
        """Test password hashing"""
        mock_bcrypt.hashpw.return_value = b"hashed_password"
        hashed = auth_service.hash_password("password123")
        assert hashed == "hashed_password"
        mock_bcrypt.hashpw.assert_called_once()

class TestInterviewService:
    def test_create_interview(self, interview_service):
        """Test interview creation"""
        interview_data = {
            "type": "technical",
            "duration": 30,
            "position": "Software Engineer",
            "difficulty": "intermediate"
        }
        
        interview = interview_service.create_interview(interview_data)
        assert isinstance(interview, Interview)
        assert interview.type == "technical"
        assert interview.duration == 30

    def test_validate_interview_type(self, interview_service):
        """Test interview type validation"""
        assert interview_service.validate_interview_type("technical") == True
        assert interview_service.validate_interview_type("behavioral") == True
        assert interview_service.validate_interview_type("invalid") == False

class TestProfileService:
    def test_update_profile(self, profile_service):
        """Test profile update"""
        user = Mock(spec=User)
        profile_data = {
            "first_name": "John",
            "last_name": "Doe",
            "job_title": "Software Engineer",
            "years_of_experience": 5
        }
        
        updated = profile_service.update_profile(user, profile_data)
        assert updated == True
        assert user.first_name == "John"
        assert user.last_name == "Doe"

    def test_validate_phone_number(self, profile_service):
        """Test phone number validation"""
        assert profile_service.validate_phone_number("123-456-7890") == True
        assert profile_service.validate_phone_number("(123) 456-7890") == True
        assert profile_service.validate_phone_number("invalid") == False 