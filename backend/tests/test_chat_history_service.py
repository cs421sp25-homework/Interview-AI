import pytest
import json
from unittest.mock import patch, MagicMock
from services.chat_history_service import ChatHistoryService  # adjust import path


@pytest.fixture
def mock_supabase():
    """Mock Supabase client."""
    return MagicMock()

@pytest.fixture
def chat_history_service(mock_supabase):
    """Instantiate ChatHistoryService with a mocked Supabase client."""
    with patch('services.chat_history_service.create_client', return_value=mock_supabase):
        service = ChatHistoryService("fake_url", "fake_key")
    return service

def test_save_chat_history_skip_welcome(chat_history_service, mock_supabase):
    """
    If we only have a single 'ai' message (a welcome message),
    the service should skip saving and return `skipped=True`.
    """
    thread_id = "test_thread"
    user_email = "user@example.com"
    messages = [{"sender": "ai", "text": "Welcome to the interview..."}]  # Single AI message

    result = chat_history_service.save_chat_history(
        thread_id=thread_id,
        user_email=user_email,
        messages=messages
    )
    assert result.get("skipped") is True, "Should skip saving if only one AI welcome message."

def test_save_chat_history_new_record(chat_history_service, mock_supabase):
    """
    If there's no existing record for a given thread_id, a new record should be inserted.
    """
    # Mock: existing record check returns empty data
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    # Mock the insert operation
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{'id': 123}]

    result = chat_history_service.save_chat_history(
        thread_id="new_thread",
        user_email="new_user@example.com",
        messages=[{"sender": "user", "text": "Hello!"}, {"sender": "ai", "text": "Hi there!"}]
    )
    assert result["success"] is True
    assert result["interview_id"] == 123

    # Check we tried to insert
    mock_supabase.table.return_value.insert.assert_called_once()

def test_save_chat_history_existing_fewer_messages(chat_history_service, mock_supabase):
    """
    If there's an existing record with more messages than the new list,
    the service should skip updating to avoid overwriting with fewer messages.
    """
    existing_data = {
        'id': 999,
        'log': json.dumps([
            {"sender": "user", "text": "Hello!"},
            {"sender": "ai", "text": "Hi there!"},
            {"sender": "user", "text": "More chat..."}
        ])
    }
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [existing_data]

    # Attempt to save with fewer messages (only 2)
    result = chat_history_service.save_chat_history(
        thread_id="existing_thread",
        user_email="existing_user@example.com",
        messages=[
            {"sender": "user", "text": "Hello!"},
            {"sender": "ai", "text": "Hi there!"}
        ]
    )
    assert result.get("skipped") is True
    assert result.get("interview_id") == 999

    # No call to update
    mock_supabase.table.return_value.update.assert_not_called()

def test_save_chat_history_existing_update(chat_history_service, mock_supabase):
    """
    If an existing record is found with fewer/equal messages, we update it.
    """
    existing_data = {
        'id': 1001,
        'log': json.dumps([
            {"sender": "user", "text": "Hello!"},
            {"sender": "ai", "text": "Hi there!"}
        ])
    }
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [existing_data]
    # Suppose update returns no data, but we can still assume success
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": 1001}]

    new_messages = [
        {"sender": "user", "text": "Hello!"},
        {"sender": "ai", "text": "Hi again!"},
        {"sender": "user", "text": "Continuing chat..."}
    ]
    result = chat_history_service.save_chat_history(
        thread_id="existing_thread",
        user_email="existing_user@example.com",
        messages=new_messages
    )
    assert result["success"] is True
    assert result["interview_id"] == 1001
    # Check that update was called
    mock_supabase.table.return_value.update.assert_called_once()

def test_save_chat_history_exception(chat_history_service, mock_supabase):
    """
    If there's an error while saving, we return success=False.
    """
    mock_supabase.table.return_value.select.side_effect = Exception("Database error!")
    result = chat_history_service.save_chat_history(
        thread_id="err_thread",
        user_email="err_user@example.com",
        messages=[{"sender": "user", "text": "Hello"}]
    )
    assert result["success"] is False
    assert "error" in result

def test_get_chat_history_found(chat_history_service, mock_supabase):
    """
    If a record is found, return the parsed 'log' array.
    """
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {'log': json.dumps([{"sender": "user", "text": "Hello"}])}
    ]
    history = chat_history_service.get_chat_history("thread_123")
    assert len(history) == 1
    assert history[0]["sender"] == "user"
    assert history[0]["text"] == "Hello"

def test_get_chat_history_none(chat_history_service, mock_supabase):
    """
    If no record is found, return None.
    """
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    history = chat_history_service.get_chat_history("unknown_thread")
    assert history is None

def test_get_chat_history_exception(chat_history_service, mock_supabase):
    """
    If there's an exception retrieving data, return None.
    """
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("DB error")
    history = chat_history_service.get_chat_history("err_thread")
    assert history is None

def test_delete_chat_history_success(chat_history_service, mock_supabase):
    """
    If deletion is successful, return True.
    """
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [{'id': 1}]
    deleted = chat_history_service.delete_chat_history("thread_abc")
    assert deleted is True

def test_delete_chat_history_exception(chat_history_service, mock_supabase):
    """
    If there's an error during deletion, return False.
    """
    mock_supabase.table.return_value.delete.side_effect = Exception("Deletion error!")
    deleted = chat_history_service.delete_chat_history("err_thread")
    assert deleted is False

@patch("your_app.services.chat_history_service.OpenAI")  # mock the OpenAI class
def test_save_analysis_success(mock_openai_class, chat_history_service, mock_supabase):
    """
    Test the 'save_analysis' method’s normal flow where analysis is returned
    as valid JSON, and results are upserted to the DB.
    """
    # Mock supabase upsert
    mock_supabase.table.return_value.upsert.return_value.execute.return_value.data = [{"status": "ok"}]

    # Prepare the mock OpenAI instance & response
    mock_openai_instance = MagicMock()
    mock_chat_completion = MagicMock()
    # We'll simulate a correct JSON response
    mock_chat_completion.choices[0].message.content = json.dumps({
        "technical": 0.8,
        "communication": 0.9,
        "confidence": 0.75,
        "problem_solving": 0.85,
        "resume_strength": 0.7,
        "leadership": 0.6
    })
    mock_openai_instance.chat.completions.create.return_value = mock_chat_completion
    mock_openai_class.return_value = mock_openai_instance

    # Strengths, weaknesses, and feedback calls:
    # We'll mock them to return a valid JSON list or a string
    # For demonstration, let's just return the same mock each time
    def mock_create(*args, **kwargs):
        response = MagicMock()
        if "strengths_prompt" in str(kwargs.get("messages")):  # we might check message contents
            response.choices[0].message.content = json.dumps(["Strong communication", "Good problem-solving"])
        elif "weaknesses_prompt" in str(kwargs.get("messages")):
            response.choices[0].message.content = json.dumps(["Needs more detail", "Should speak more confidently"])
        else:
            # The first call is the main analysis
            # The second scenario or third is the feedback
            # We can differentiate by checking "analysis_prompt" in the messages
            # or just set a default:
            response.choices[0].message.content = "Overall a solid performance."
        return response

    mock_openai_instance.chat.completions.create.side_effect = mock_create

    # Call save_analysis
    messages = [
        {"sender": "user", "text": "Hello."},
        {"sender": "ai", "text": "Hi there!"},
        {"sender": "user", "text": "Let's talk."},
        # Enough messages to skip the "too few" condition
    ]
    result = chat_history_service.save_analysis(
        interview_id=999,
        user_email="analysis_user@example.com",
        messages=messages,
        config_name="Interview Session",
        config_id="some_config_id"
    )
    assert result["success"] is True
    # Check that we upserted the analysis
    mock_supabase.table.return_value.upsert.assert_called_once()

@patch("your_app.services.chat_history_service.OpenAI")
def test_save_analysis_insufficient_messages(mock_openai_class, chat_history_service):
    """
    If fewer than 3 messages exist, we skip the analysis.
    """
    messages = [{"sender": "user", "text": "Just 1 message"}]
    result = chat_history_service.save_analysis(101, "user@example.com", messages)
    assert result.get("skipped") is True
    assert result["success"] is True

@patch("your_app.services.chat_history_service.OpenAI")
def test_save_analysis_exception(mock_openai_class, chat_history_service, mock_supabase):
    """
    If an exception happens mid-analysis, return success=False.
    """
    # Force an exception
    mock_supabase.table.return_value.upsert.side_effect = Exception("DB write error!")
    messages = [
        {"sender": "user", "text": "Hello."},
        {"sender": "ai", "text": "Hi!"},
        {"sender": "user", "text": "What's up?"}
    ]
    result = chat_history_service.save_analysis(102, "user@example.com", messages)
    assert result["success"] is False
    assert "error" in result
