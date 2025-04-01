import pytest
from unittest.mock import Mock, patch
from flask import Flask
from controllers.auth_controller import auth_bp
from controllers.interview_controller import interview_bp
from controllers.profile_controller import profile_bp

@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(interview_bp, url_prefix='/api/interview')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    return app

@pytest.fixture
def client(app):
    return app.test_client()

class TestAuthController:
    def test_login_validation(self, client):
        """Test login endpoint input validation"""
        # Test missing fields
        response = client.post('/api/auth/login', json={})
        assert response.status_code == 400
        assert b"required" in response.data

        # Test invalid email
        response = client.post('/api/auth/login', json={
            "email": "invalid-email",
            "password": "password123"
        })
        assert response.status_code == 400
        assert b"valid email" in response.data

    @patch('services.auth_service.AuthService.authenticate')
    def test_login_success(self, mock_authenticate, client):
        """Test successful login"""
        mock_authenticate.return_value = True
        response = client.post('/api/auth/login', json={
            "email": "test@example.com",
            "password": "correctpassword123"
        })
        assert response.status_code == 200
        assert b"Login successful" in response.data

class TestInterviewController:
    def test_create_interview_validation(self, client):
        """Test interview creation endpoint validation"""
        # Test missing fields
        response = client.post('/api/interview/create', json={})
        assert response.status_code == 400
        assert b"required" in response.data

        # Test invalid interview type
        response = client.post('/api/interview/create', json={
            "type": "invalid",
            "duration": 30,
            "position": "Software Engineer"
        })
        assert response.status_code == 400
        assert b"invalid interview type" in response.data

    @patch('services.interview_service.InterviewService.create_interview')
    def test_create_interview_success(self, mock_create, client):
        """Test successful interview creation"""
        mock_create.return_value = Mock(id=1)
        response = client.post('/api/interview/create', json={
            "type": "technical",
            "duration": 30,
            "position": "Software Engineer",
            "difficulty": "intermediate"
        })
        assert response.status_code == 201
        assert b"created" in response.data

class TestProfileController:
    @patch('services.profile_service.ProfileService.get_profile')
    def test_get_profile(self, mock_get_profile, client):
        """Test profile retrieval"""
        mock_profile = {
            "first_name": "John",
            "last_name": "Doe",
            "job_title": "Software Engineer"
        }
        mock_get_profile.return_value = mock_profile
        
        response = client.get('/api/profile')
        assert response.status_code == 200
        assert response.json == mock_profile

    @patch('services.profile_service.ProfileService.update_profile')
    def test_update_profile(self, mock_update_profile, client):
        """Test profile update"""
        mock_update_profile.return_value = True
        profile_data = {
            "first_name": "John",
            "last_name": "Doe",
            "job_title": "Software Engineer"
        }
        
        response = client.put('/api/profile/update', json=profile_data)
        assert response.status_code == 200
        assert b"updated successfully" in response.data 