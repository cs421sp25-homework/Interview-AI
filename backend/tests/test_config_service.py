import pytest
from unittest.mock import MagicMock, patch
from services.config_service import ConfigService  # adjust import path


@pytest.fixture
def mock_supabase():
    return MagicMock()


@pytest.fixture
def config_service(mock_supabase):
    with patch('services.config_service.create_client', return_value=mock_supabase):
        service = ConfigService("fake_url", "fake_key")
    return service


def test_get_single_config(config_service, mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {'id': 1, 'interview_name': 'test_interview', 'email': 'user@example.com'}
    ]

    config = config_service.get_single_config("test_interview", "user@example.com")
    assert config is not None, "Expected config data for existing entry."
    assert config['id'] == 1

    # Test the scenario where no data is returned
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    config = config_service.get_single_config("unknown_interview", "unknown@example.com")
    assert config is None, "Expected None if no config is found."


def test_get_configs(config_service, mock_supabase):
    # If supabase returns a list of configs
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {'id': 1}, {'id': 2}
    ]
    configs = config_service.get_configs("user@example.com")
    assert len(configs) == 2, "Should return the list of configs."

    # If supabase returns an empty list
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    configs = config_service.get_configs("no_configs@example.com")
    assert configs is None, "Should return None if no data is found."


def test_create_config(config_service, mock_supabase):
    # Suppose insertion succeeded
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{'id': 123}]
    config_id = config_service.create_config({'interview_name': 'SomeName', 'email': 'user@example.com'})
    assert config_id == 123, "Expected the newly inserted config ID."

    # If insertion fails
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = []
    config_id = config_service.create_config({'interview_name': 'FailName', 'email': 'fail@example.com'})
    assert config_id is None, "Should return None on failure."

    # If an exception is raised
    mock_supabase.table.return_value.insert.side_effect = Exception("DB error")
    config_id = config_service.create_config({'interview_name': 'ErrorName', 'email': 'error@example.com'})
    assert config_id is None, "Should gracefully handle exception and return None."


def test_update_config(config_service, mock_supabase):
    # Suppose update succeeded
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {'id': 1, 'interview_name': 'UpdatedName'}
    ]
    updated = config_service.update_config(1, {'interview_name': 'UpdatedName'})
    assert updated is not None
    assert updated['interview_name'] == 'UpdatedName'

    # Suppose no data returned, indicating failure or no match
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = []
    updated = config_service.update_config(99, {'interview_name': 'None'})
    assert updated is None


def test_delete_config(config_service, mock_supabase):
    # Suppose deletion returns data (one row)
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [{'id': 1}]
    result = config_service.delete_config(1)
    assert result is True, "Should return True on successful delete."

    # Suppose nothing is returned (no match or failure)
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = []
    result = config_service.delete_config(999)
    assert result is False, "Should return False if no rows were deleted."
