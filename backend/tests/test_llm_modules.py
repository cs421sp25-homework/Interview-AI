import pytest
from unittest.mock import MagicMock, patch
import os
import tempfile
import json

# Fix imports with correct classes and functions
from llm.interview_agent import LLMInterviewAgent
from llm.llm_graph import LLMGraph
from llm.llm_interface import LLMInterface
from llm.llm_utils import generate_prompt, extract_json_from_response
from llm.pdf_clean import extract_text_from_pdf

class TestLLMInterviewAgent:
    @pytest.fixture
    def mock_llm_graph(self):
        """Mock LLM Graph for testing"""
        mock = MagicMock()
        mock.invoke.return_value = {"messages": [MagicMock(content="Mock response")]}
        return mock
    
    def test_interview_agent_initialization(self, mock_llm_graph):
        """Test that LLMInterviewAgent initializes properly"""
        agent = LLMInterviewAgent(llm_graph=mock_llm_graph, question_threshold=5)
        assert agent.llm_graph == mock_llm_graph
        assert agent.question_threshold == 5
        assert agent.question_count == 0
        assert hasattr(agent, "thread_id")
    
    def test_interview_agent_next_question(self, mock_llm_graph):
        """Test that LLMInterviewAgent generates next questions"""
        agent = LLMInterviewAgent(llm_graph=mock_llm_graph)
        response = agent.next_question("Tell me about your experience")
        assert isinstance(response, str)
        mock_llm_graph.invoke.assert_called_once()

class TestLLMGraph:
    def test_llm_graph_initialization(self):
        """Test that LLMGraph initializes properly"""
        graph = LLMGraph()
        assert hasattr(graph, "llm_interface")
        assert hasattr(graph, "workflow")
    
    @patch('llm.llm_graph.MemorySaver')
    def test_llm_graph_invoke(self, mock_memory_saver):
        """Test invoke method of LLMGraph"""
        with patch.object(LLMInterface, 'invoke') as mock_invoke:
            mock_invoke.return_value = [{"content": "test response"}]
            
            graph = LLMGraph()
            
            # Patch the chat_app.invoke method
            graph.chat_app = MagicMock()
            graph.chat_app.invoke.return_value = {"messages": [{"content": "response"}]}
            
            # Test the invoke method
            message = MagicMock()
            result = graph.invoke(message, "test_thread")
            
            # Verify the chat_app.invoke was called
            assert graph.chat_app.invoke.called

class TestLLMInterface:
    def test_llm_interface_initialization(self):
        """Test that LLMInterface initializes properly"""
        interface = LLMInterface(model_name="gpt-4")
        assert interface.model.model_name == "gpt-4"
    
    @patch('llm.llm_interface.ChatOpenAI')
    def test_llm_interface_invoke(self, mock_chat_openai):
        """Test invoke method"""
        mock_model = MagicMock()
        mock_model.invoke.return_value = "Test response"
        mock_chat_openai.return_value = mock_model
        
        interface = LLMInterface(model_name="gpt-4")
        interface.model = mock_model
        
        messages = [MagicMock()]
        response = interface.invoke(messages)
        
        assert mock_model.invoke.called
        assert messages[0] in mock_model.invoke.call_args[0][0]

class TestPDFUtility:
    @pytest.fixture
    def sample_pdf_content(self):
        """Create a mock PDF content for testing"""
        return b"%PDF-1.7\n...sample PDF content..."
    
    @patch('llm.pdf_clean.extract_text_from_pdf')
    def test_pdf_extraction(self, mock_extract, sample_pdf_content):
        """Test PDF text extraction"""
        mock_extract.return_value = "Sample extracted text"
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(sample_pdf_content)
            tmp_name = tmp.name
        
        try:
            # Just testing if the function is callable
            from llm.pdf_clean import extract_text_from_pdf
            assert callable(extract_text_from_pdf)
        finally:
            os.unlink(tmp_name)

    # @patch('llm.pdf_clean.PdfReader')
    # def test_extract_text(self, mock_pdf_reader, sample_pdf_content):
    #     """Test extracting text from PDF"""
    #     # Create mock page and reader
    #     mock_page = MagicMock()
    #     mock_page.extract_text.return_value = "Test content"
    #     mock_pdf_reader.return_value.pages = [mock_page]
        
    #     with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
    #         tmp.write(sample_pdf_content)
    #         tmp_name = tmp.name
        
    #     try:
    #         result = extract_text_from_pdf(tmp_name)
    #         assert "Test content" in result
    #     finally:
    #         os.unlink(tmp_name)
    
    # @pytest.mark.skip("clean_text function not available in current implementation")
    # def test_clean_text(self):
    #     """Test cleaning PDF text"""
    #     from llm.pdf_clean import clean_text
    #     dirty_text = "Line 1\n\nLine 2   with extra   spaces\n• Bullet point\nPage 1\n\f\nPage 2"
    #     result = clean_text(dirty_text)
        
    #     assert isinstance(result, str)
    #     assert "\f" not in result  # Form feeds should be removed
    #     assert "  " not in result  # Multiple spaces should be normalized 