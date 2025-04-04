import pytest
from unittest.mock import MagicMock, patch
from services.auth_service import AuthorizationService  # adjust import path to match your project structure


@pytest.fixture
def mock_supabase():
    """Returns a mock Supabase client."""
    return MagicMock()


@pytest.fixture
def auth_service(mock_supabase):
    """Instantiate the AuthorizationService with a mock supabase client."""
    # We patch create_client so that it returns mock_supabase
    # But if you prefer, you can also patch it globally in a test or conftest.
    with patch('services.authorization_service.create_client', return_value=mock_supabase):
        service = AuthorizationService("fake_url", "fake_key")
    return service


def test_check_user_exists(auth_service, mock_supabase):
    # Setup mock return from supabase
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{'username': 'johndoe'}]
    
    exists = auth_service.check_user_exists("johndoe")
    assert exists is True, "User should exist if supabase returns data."
    
    # Test the negative case
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    exists = auth_service.check_user_exists("non_existent_user")
    assert exists is False, "User should not exist if supabase returns no data."


def test_check_email_exists(auth_service, mock_supabase):
    # Suppose supabase returns one row for an existing email
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{'email': 'test@example.com'}]
    exists = auth_service.check_email_exists("test@example.com")
    assert exists is True
    
    # Now supabase returns no rows
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    exists = auth_service.check_email_exists("no_such_user@example.com")
    assert exists is False


def test_check_user_login(auth_service, mock_supabase):
    # If the email doesn't exist, it should immediately return False
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    assert auth_service.check_user_login("unknown@example.com", "some_password") is False

    # If email exists, check the password
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{'email': 'user@example.com'}]
    # Next call checks password match
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{'email': 'user@example.com', 'password': 'correct_pass'}]
    assert auth_service.check_user_login("user@example.com", "correct_pass") is True

    # For an incorrect password
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    assert auth_service.check_user_login("user@example.com", "wrong_pass") is False


def test_get_user_from_session(auth_service, mock_supabase):
    # Mock a success response from supabase.auth.get_user
    mock_user = MagicMock()
    mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

    session_id = "valid_session_token"
    user = auth_service.get_user_from_session(session_id)

    mock_supabase.auth.get_user.assert_called_once_with(session_id)
    assert user == mock_user, "Should return the user from the supabase response."

    # Now simulate an exception
    mock_supabase.auth.get_user.side_effect = Exception("Some error")
    user = auth_service.get_user_from_session(session_id)
    assert user is None, "Should return None if an exception occurs."


def test_get_current_user(auth_service, mock_supabase):
    # Mock get_session to return a valid session
    mock_session = MagicMock()
    mock_session.session = MagicMock(access_token="valid_access_token")
    mock_supabase.auth.get_session.return_value = mock_session

    # Mock get_user with user info
    mock_user = MagicMock()
    mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

    user = auth_service.get_current_user()
    mock_supabase.auth.get_session.assert_called_once()
    mock_supabase.auth.get_user.assert_called_with("valid_access_token")
    assert user == mock_user

    # If session is None, return None
    mock_session.session = None
    user = auth_service.get_current_user()
    assert user is None, "Should return None if no active session."

    # If get_user fails, return None
    mock_supabase.auth.get_user.side_effect = Exception("Error!")
    user = auth_service.get_current_user()
    assert user is None


def test_get_user_from_token(auth_service, mock_supabase):
    mock_user = MagicMock()
    mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

    user = auth_service.get_user_from_token("some_access_token")
    mock_supabase.auth.get_user.assert_called_once_with("some_access_token")
    assert user == mock_user, "Should return user if supabase returns user."

    # If an exception is raised
    mock_supabase.auth.get_user.side_effect = Exception("Error fetching user")
    user = auth_service.get_user_from_token("token_that_crashes")
    assert user is None, "Should return None on exception."
