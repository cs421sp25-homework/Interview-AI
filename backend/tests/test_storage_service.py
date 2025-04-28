import pytest
from unittest.mock import MagicMock, patch
from your_app.services.storage_service import StorageService  # adjust import path


@pytest.fixture
def mock_supabase():
    return MagicMock()


@pytest.fixture
def storage_service(mock_supabase):
    with patch('your_app.services.storage_service.create_client', return_value=mock_supabase):
        service = StorageService("fake_url", "fake_key")
    return service


def test_upload_file(storage_service, mock_supabase):
    # Mock the upload response
    mock_supabase.storage.from_.return_value.upload.return_value = {"Key": "fake/path", "status": "success"}
    
    result = storage_service.upload_file(
        bucket_name="my_bucket",
        file_path="docs/file.pdf",
        file_content=b"sample_pdf_content",
        content_type="application/pdf"
    )
    assert result == {"Key": "fake/path", "status": "success"}

    # Ensure the underlying calls are correct
    mock_supabase.storage.from_.assert_called_with("my_bucket")
    mock_supabase.storage.from_.return_value.upload.assert_called_once()


def test_get_public_url(storage_service, mock_supabase):
    # Mock the get_public_url response
    mock_supabase.storage.from_.return_value.get_public_url.return_value = "http://fake_url/my_bucket/docs/file.pdf"
    
    url = storage_service.get_public_url("my_bucket", "docs/file.pdf")
    assert url == "http://fake_url/my_bucket/docs/file.pdf"

    mock_supabase.storage.from_.assert_called_with("my_bucket")
    mock_supabase.storage.from_.return_value.get_public_url.assert_called_once_with("docs/file.pdf")