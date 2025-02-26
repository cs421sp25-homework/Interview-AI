# The basic interface for using LLM
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

class LLMInterface:
    def __init__(self, model_name="gpt-4", temperature=0.7):
        self.model = ChatOpenAI(model_name=model_name, temperature=temperature)

    def invoke(self, messages):
        """
        Invoke the LLM with a list of messages.
        
        Args:
            messages (list): List of messages (e.g., HumanMessage, AIMessage).
        
        Returns:
            list: List of messages returned by the LLM.
        """
        response = self.model.invoke(messages)
        if not isinstance(response, list):
            response = [response]
        return response