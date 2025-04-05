import pytest
from unittest.mock import patch, MagicMock
from services.chat_service import ChatService  # adjust import path


@pytest.fixture
def mock_llm_graph():
    """Mock LLMGraph object."""
    return MagicMock()

@pytest.fixture
def chat_service(mock_llm_graph):
    """Patch ChatService so it uses a mocked LLMGraph."""
    with patch('your_app.services.chat_service.LLMGraph', return_value=mock_llm_graph):
        service = ChatService()
    return service

def test_process_chat_success(chat_service, mock_llm_graph):
    """
    If LLMGraph.invoke returns a dictionary with a messages list,
    the last message's content is returned.
    """
    # Mock the LLMGraph return
    mock_llm_graph.invoke.return_value = {
        "messages": [
            MagicMock(content="First AI reply"),
            MagicMock(content="Final AI reply")
        ]
    }
    response = chat_service.process_chat("Hello AI", thread_id="test_thread")
    assert response == "Final AI reply", "Should return the content of the last AI message."

def test_process_chat_no_messages(chat_service, mock_llm_graph):
    """
    If the model returns no messages, raise ValueError.
    """
    mock_llm_graph.invoke.return_value = {"messages": []}
    with pytest.raises(ValueError, match="No response from model."):
        chat_service.process_chat("Hello?", "thread_123")

def test_process_chat_exception(chat_service, mock_llm_graph):
    """
    If an exception occurs, ensure it propagates or is handled.
    """
    mock_llm_graph.invoke.side_effect = Exception("Something went wrong!")
    with pytest.raises(Exception, match="Something went wrong!"):
        chat_service.process_chat("Error test", "thread_err")
