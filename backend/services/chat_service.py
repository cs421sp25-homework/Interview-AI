from langchain_core.messages import HumanMessage
from llm.llm_graph import LLMGraph

class ChatService:
    def __init__(self):
        self.llm_graph = LLMGraph()

    def process_chat(self, user_message, thread_id="default_thread"):
        """
        Process a chat message and return the AI's response.
        
        Args:
            user_message (str): The user's input message.
            thread_id (str): The thread ID for persistent memory.
        
        Returns:
            str: The AI's response.
        """
        input_message = HumanMessage(content=user_message)
        output = self.llm_graph.invoke(input_message, thread_id)
        if output.get("messages"):
            return output["messages"][-1].content
        else:
            raise ValueError("No response from model.")