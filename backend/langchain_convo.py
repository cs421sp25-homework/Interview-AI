from flask import Flask, request, jsonify
from langchain_openai import ChatOpenAI
from langgraph.graph import START, MessagesState, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import os

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")

os.environ["OPENAI_API_KEY"] = openai_api_key


model = ChatOpenAI(model_name="gpt-4o-mini", temperature=0.7)
workflow = StateGraph(state_schema=MessagesState)

def call_model(state: MessagesState):
    # state["messages"] is a list of previous messages.
    response = model.invoke(state["messages"])
    # Ensure the response is a list (it should be a list of messages).
    if not isinstance(response, list):
        response = [response]
    return {"messages": response}

# Add a single node to the graph that calls the model.
workflow.add_edge(START, "model")
workflow.add_node("model", call_model)


memory = MemorySaver()
# Compile the graph into a runnable application.
chat_app = workflow.compile(checkpointer=memory)


app = Flask(__name__)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data or "input" not in data:
        return jsonify({"error": "Missing input message"}), 400

    user_message = data["input"]

    # Optionally allow the client to specify a thread_id. This enables separate
    # conversation histories. Use "default_thread" if none is provided.
    thread_id = data.get("thread_id", "default_thread")
    config = {"configurable": {"thread_id": thread_id}}

    # Wrap the user's input into a HumanMessage.
    input_message = HumanMessage(content=user_message)

    # Invoke our LangGraph application with the new message.
    # The persistent memory (keyed by thread_id) will include previous messages.
    output = chat_app.invoke({"messages": [input_message]}, config)

    # Extract the AI’s response (assumed to be the last message in the list).
    if output.get("messages"):
        last_message = output["messages"][-1]
        return jsonify({"response": last_message.content})
    else:
        return jsonify({"error": "No response from model."}), 500

if __name__ == '__main__':
    app.run(debug=True)