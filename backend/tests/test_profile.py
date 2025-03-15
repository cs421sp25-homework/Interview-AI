import pytest
import requests
import json
from unittest.mock import patch, MagicMock
from app import app

@pytest.fixture
def base_url():
    return "http://127.0.0.1:5001/api"

@pytest.fixture
def auth_headers(base_url):
    """Get authentication token for tests"""
    login_payload = {
        "email": "tlin56@jh.edu",
        "password": "12345678"
    }
    login_response = requests.post(f"{base_url}/auth/login", json=login_payload)
    token = login_response.json().get("token")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_static_get_profile(base_url):
    """Test retrieving the static profile."""
    response = requests.get(f"{base_url}/profile")
    assert response.status_code == 200, "Failed to retrieve static profile."
    data = response.json()
    assert "name" in data, "Static profile missing 'name'."
    assert "about" in data, "Static profile missing 'about'."

def test_get_profile_by_email_not_found(base_url):
    """Test retrieving a profile by email when the user does not exist."""
    email = "nonexistent@example.com"
    response = requests.get(f"{base_url}/profile/{email}")
    assert response.status_code == 404, "Expected 404 for non-existent user."
    data = response.json()
    assert "error" in data, "Response should include an error message when user is not found."

def test_update_profile_success(client):
    # Mock data that would be returned from the profile service
    mock_updated_profile = {
        'first_name': 'John',
        'last_name': 'Doe',
        'job_title': 'Software Engineer',
        'email': 'john.doe@example.com',
        'phone': '123-456-7890',
        'key_skills': 'Python,JavaScript,React',
        'about': 'Experienced software engineer',
        'linkedin_url': 'https://linkedin.com/in/johndoe',
        'github_url': 'https://github.com/johndoe',
        'portfolio_url': 'https://johndoe.dev',
        'photo_url': 'https://example.com/photo.jpg',
        'education_history': [
            {'institution': 'MIT', 'degree': 'Computer Science', 'year': '2020'}
        ],
        'resume_experience': [
            {'company': 'Google', 'position': 'Software Engineer', 'duration': '2020-2023'}
        ]
    }
    
    # Mock the profile_service.update_profile method
    with patch('services.profile_service.ProfileService.update_profile', return_value=mock_updated_profile):
        # Test data to send in the request
        update_data = {
            'about': 'Experienced software engineer',
            'job_title': 'Software Engineer'
        }
        
        # Make the request
        response = client.put(
            '/api/profile/john.doe@example.com',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        # Check response
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify the response format matches what we expect
        assert data['message'] == 'Profile updated successfully'
        assert data['data']['name'] == 'John Doe'
        assert data['data']['title'] == 'Software Engineer'
        assert data['data']['email'] == 'john.doe@example.com'
        assert data['data']['phone'] == '123-456-7890'
        assert data['data']['skills'] == ['Python', 'JavaScript', 'React']
        assert data['data']['about'] == 'Experienced software engineer'
        assert data['data']['linkedin'] == 'https://linkedin.com/in/johndoe'
        assert data['data']['github'] == 'https://github.com/johndoe'
        assert data['data']['portfolio'] == 'https://johndoe.dev'
        assert data['data']['photoUrl'] == 'https://example.com/photo.jpg'
        assert len(data['data']['education_history']) == 1
        assert len(data['data']['experience']) == 1

def test_update_profile_not_found(client):
    # Mock the profile_service.update_profile method to return None (user not found)
    with patch('services.profile_service.ProfileService.update_profile', return_value=None):
        # Test data to send in the request
        update_data = {
            'about': 'Experienced software engineer'
        }
        
        # Make the request
        response = client.put(
            '/api/profile/nonexistent@example.com',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        # Check response
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data

def test_update_profile_error(client):
    # Mock the profile_service.update_profile method to raise an exception
    with patch('services.profile_service.ProfileService.update_profile', side_effect=Exception('Database error')):
        # Test data to send in the request
        update_data = {
            'about': 'Experienced software engineer'
        }
        
        # Make the request
        response = client.put(
            '/api/profile/john.doe@example.com',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        # Check response
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data
        assert 'message' in data
        assert data['message'] == 'Database error'
