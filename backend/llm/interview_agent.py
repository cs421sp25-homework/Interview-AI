import json
from characters.interviewer import Interviewer
from .llm_graph import LLMGraph
from langchain_core.messages import HumanMessage
from langchain_core.messages import SystemMessage


class LLMInterviewAgent:
    """
    An Interview Agent that leverages an LLM to:
      1. Greet the candidate and ask them to introduce themselves.
      2. Dynamically generate new questions based on candidate responses,
         the interviewee's resume, and the company's needs.
      3. Determine when to end the interview based on a simple threshold
         or an LLM signal (e.g., a special token).
    """

    def __init__(self, llm_graph: LLMGraph, question_threshold: int = 5, thread_id = "default_thread"):
        """
        Args:
            llm_graph (LLMGraph): The LLM wrapper (with memory saver) to manage conversation.
            question_threshold (int): Max number of questions to ask before auto-ending.
        """
        self.llm_graph = llm_graph
        self.question_threshold = question_threshold
        self.question_count = 0
        self.interviewer = None
        self.conversation = []
        self.thread_id = thread_id

    def initialize(self, interviewer: Interviewer):
        """
        Initialize the agent with interviewer information and set up system context.
        """
        self.interviewer = interviewer
        self.question_count = 0

        # Build system context about the interviewer
        system_info = []
        if interviewer.name:
            system_info.append(f"Your Name: {interviewer.name}")
        if interviewer.age:
            system_info.append(f"Your Age: {interviewer.age}")
        if interviewer.personality:
            system_info.append(f"Your Personality: {interviewer.personality}")
        if interviewer.language:
            system_info.append(f"Your Language: {interviewer.language}")
        if interviewer.job_description:
            system_info.append(f"Job Description: {interviewer.job_description}")
        if interviewer.company_name:
            system_info.append(f"Company Name: {interviewer.company_name}")
        if interviewer.interviewee_resume:
            system_info.append(f"Interviewee Resume: {interviewer.interviewee_resume}")

        # Combine everything into a system prompt
        system_message_content = (
            "You are an AI interviewer. Below is the context you should consider:\n"
            + "\n".join(system_info)
            + "\n\nYour task:\n"
            "1) Start by greeting the candidate and asking them for a self-introduction.\n"
            "2) For each subsequent user response, craft one relevant follow-up question.\n"
            "3) Consider the candidate's resume, the company's needs, and typical interview flow.\n"
            "4) If you believe the interview has reached a good stopping point, respond ONLY with 'END_INTERVIEW'.\n"
            f"5) Automatically end the interview if there have been {self.question_threshold} questions.\n"
        )

        # Insert the system message to seed the context
        self.llm_graph.invoke(SystemMessage(content=system_message_content), thread_id=self.thread_id)
        

        welcome_message = f"Welcome to your interview for a position at {interviewer.company_name}. I'm excited to learn more about your skills and experience. Could you please start by telling me a bit about yourself and your background?"
        self.conversation.append({"role": "assistant", "content": welcome_message})

    def greet(self) -> str:
        """
        Use the LLM to produce a greeting and prompt the candidate for self-introduction.
        Returns the LLM's greeting text.
        """
        # Ask the LLM to greet the candidate explicitly
        response = self.llm_graph.invoke(
            HumanMessage(content="Please greet the candidate and ask them for a self-introduction."),
            thread_id=self.thread_id
        )
        ai_message = response["messages"][-1]  # The last message should be the AI's response
        self.conversation.append({"role": "assistant", "content": ai_message.content})
        return ai_message.content

    def next_question(self, user_response: str) -> str:
        """
        Pass the candidate's latest response to the LLM and get the next interview question.
        If the LLM decides the interview should end, it will return 'END_INTERVIEW'.
        """
        # Send the candidate's response to the LLM
        response = self.llm_graph.invoke(HumanMessage(content=user_response), thread_id=self.thread_id)
        ai_message = response["messages"][-1]
        next_q = ai_message.content
        self.conversation.append({"role": "assistant", "content": next_q})

        # Count this as a new question only if the LLM hasn't ended the interview
        if next_q.strip() != "END_INTERVIEW":
            self.question_count += 1
        return next_q

    def is_end(self, last_ai_response: str) -> bool:
        """
        Check whether the interview has ended.
          - If the LLM returned 'END_INTERVIEW'
          - Or if we've asked >= question_threshold questions
        """
        # Check LLM's special token
        if "END_INTERVIEW" in last_ai_response:
            return True

        # Check question count threshold
        if self.question_count >= self.question_threshold:
            return True

        return False
    
    def record_conversation_to_json(self, filename="conversation.json"):
        """
        Saves the entire conversation to a JSON file for later review.
        Each item is a dict with "role" and "content".
        """
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(self.conversation, f, indent=2, ensure_ascii=False)

    def end_interview(self) -> str:
        """
        Returns a final statement from the AI or a generic end-of-interview message.
        """
        # You could also ask the LLM to produce a final closing statement
        # For simplicity, we'll do a static message
        closing_remarks = "Thank you for your time. The interview has concluded."
        self.conversation.append({"role": "assistant", "content": closing_remarks})
        return closing_remarks


    # Example usage (not part of the library code)

if __name__ == "__main__":
    """
    Example usage of the LLMInterviewAgent in an interactive terminal session.
    Run:

        poetry run python -m llm.interview_agent_llm

    or from the project root with a direct path:

        poetry run python llm/interview_agent_llm.py

    Then type your responses as though you are the interviewee.
    """
    from dotenv import load_dotenv
    from .llm_graph import LLMGraph
    from characters.interviewer import Interviewer

    load_dotenv()
    # Create an interviewer object (you can adapt these parameters)
    interviewer = Interviewer(
        name="Alice",
        personality="Friendly but professional",
        age="35",
        language="English",
        job_description="Senior Backend Developer",
        company_name="TechCorp",
        interviewee_resume="Candidate has 5 years of Python experience..."
    )

    # Initialize LLM graph
    llm_graph = LLMGraph()

    # Create interview agent
    agent = LLMInterviewAgent(llm_graph=llm_graph, question_threshold=5)
    # Set up system context
    agent.initialize(interviewer)

    # Get the greeting from the LLM
    greeting = agent.greet()
    print(f"[AI]: {greeting}")

    last_ai_response = greeting

    # Interactive loop
    while True:
        if agent.is_end(last_ai_response):
            print("[SYSTEM]: Interview is complete.\n")
            break

        user_input = input("[You]: ").strip()
        if not user_input:
            print("[SYSTEM]: Please provide a response. Type 'quit' to exit.")
            continue

        if user_input.lower() in ("quit", "exit"):
            print("[SYSTEM]: Exiting the interview.")
            break

        last_ai_response = agent.next_question(user_input)
        if last_ai_response.strip() == "END_INTERVIEW":
            print("[AI]: The interview has ended.")
            break

        print(f"[AI]: {last_ai_response}")

    # Optionally record the entire conversation to JSON
    agent.record_conversation_to_json("interview_conversation.json")
    print("[SYSTEM]: Conversation saved to 'interview_conversation.json'.")
    print("[SYSTEM]: Goodbye!")