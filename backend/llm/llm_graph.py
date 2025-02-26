from langgraph.graph import START, MessagesState, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from .llm_interface import LLMInterface

class LLMGraph:
    def __init__(self):
        self.llm_interface = LLMInterface()
        self.workflow = StateGraph(state_schema=MessagesState)
        self._setup_workflow()

    def _setup_workflow(self):
        """Set up the LangGraph workflow."""
        def call_model(state: MessagesState):
            response = self.llm_interface.invoke(state["messages"])
            return {"messages": response}

        self.workflow.add_node("model", call_model)
        self.workflow.add_edge(START, "model")
        self.chat_app = self.workflow.compile(checkpointer=MemorySaver())

    def invoke(self, input_message, thread_id="default_thread"):
        """
        Invoke the LangGraph application with a new message.
        
        Args:
            input_message (HumanMessage): The user's input message.
            thread_id (str): The thread ID for persistent memory.
        
        Returns:
            dict: Output from the LangGraph application.
        """
        config = {"configurable": {"thread_id": thread_id}}
        return self.chat_app.invoke({"messages": [input_message]}, config)