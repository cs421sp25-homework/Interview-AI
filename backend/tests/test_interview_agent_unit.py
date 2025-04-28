# tests/test_interview_agent_unit.py
"""
Unit-level coverage for LLMInterviewAgent
────────────────────────────────────────
▪  initialize()     – verifies system prompt construction
▪  greet()          – ensures greeting routed to LLM
▪  next_question()  – hikes question_count, handles END_INTERVIEW token
▪  is_end()         – checks both token & threshold logic
▪  end_interview()  – exercises translation branch when language ≠ English
All LLM calls are mocked, so the tests run offline & fast.
"""
import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest



import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from characters.interviewer import Interviewer
from llm.interview_agent import LLMInterviewAgent

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def dummy_llm_graph():
    """
    A MagicMock that mimics `.invoke()` and echoes back the prompt text.
    It also returns a Spanish translation when asked.
    """
    graph = MagicMock()

    def _fake_invoke(msg, thread_id=None):
        content = msg.content
        # crude detection of a translation request
        if content.startswith("Translate"):
            translated = "[ES] " + content.split("\n\n", 1)[-1]
            return {"messages": [MagicMock(content=translated)]}
        # otherwise just echo with [AI]:
        return {"messages": [MagicMock(content="[AI] " + content[:40])]}  # clip for brevity

    graph.invoke.side_effect = _fake_invoke
    return graph


@pytest.fixture(scope="function")
def spanish_interviewer():
    return Interviewer(
        name="Alice",
        personality="Friendly",
        age="35",
        language="Spanish",
        job_description="Backend Developer",
        company_name="Acme Corp",
        interviewee_resume="Experienced in Python & Django.",
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
def test_initialize_builds_system_prompt(dummy_llm_graph, spanish_interviewer):
    """initialize() should send ONE SystemMessage with all interviewer fields."""
    agent = LLMInterviewAgent(dummy_llm_graph, question_threshold=3)
    agent.initialize(spanish_interviewer)

    # LLM called exactly once with a SystemMessage
    assert dummy_llm_graph.invoke.call_count == 1
    sent_msg = dummy_llm_graph.invoke.call_args[0][0]
    assert "AI interviewer" in sent_msg.content
    # resume and company name should be embedded
    assert "Acme Corp" in sent_msg.content
    assert "Python & Django" in sent_msg.content
    # local conversation list gets the canned welcome message
    assert agent.conversation[-1]["role"] == "assistant"


def test_greet_adds_to_conversation(dummy_llm_graph, spanish_interviewer):
    agent = LLMInterviewAgent(dummy_llm_graph)
    agent.initialize(spanish_interviewer)

    greeting = agent.greet()
    assert greeting.startswith("[AI] "), "Mock LLM should prepend [AI]"
    assert agent.conversation[-1]["content"] == greeting
    # greet triggers a SECOND LLM call
    assert dummy_llm_graph.invoke.call_count == 2


def test_next_question_increments_count(dummy_llm_graph, spanish_interviewer):
    agent = LLMInterviewAgent(dummy_llm_graph, question_threshold=2)
    agent.initialize(spanish_interviewer)

    q1 = agent.next_question("My name is Bob.")
    assert agent.question_count == 1
    assert q1.startswith("[AI]")

    # Send END_INTERVIEW to verify count does NOT increment
    dummy_llm_graph.invoke.side_effect = lambda m, thread_id=None: {
        "messages": [MagicMock(content="END_INTERVIEW")]
    }
    q2 = agent.next_question("Some answer")
    assert q2 == "END_INTERVIEW"
    assert agent.question_count == 1  # should not change


def test_is_end_token_and_threshold(dummy_llm_graph, spanish_interviewer):
    agent = LLMInterviewAgent(dummy_llm_graph, question_threshold=1)
    agent.initialize(spanish_interviewer)

    # Simulate one normal Q → threshold met
    agent.question_count = 1
    assert agent.is_end("Some normal response") is True

    # Token alone should also end
    assert agent.is_end("blah END_INTERVIEW blah") is True

    # Neither token nor threshold
    agent.question_count = 0
    assert agent.is_end("carry on") is False


def test_end_interview_translation(dummy_llm_graph, spanish_interviewer, tmp_path):
    """
    With interviewer.language == Spanish the agent should translate closing remarks.
    Also verify record_conversation_to_json actually writes a file.
    """
    agent = LLMInterviewAgent(dummy_llm_graph)
    agent.initialize(spanish_interviewer)

    closing = agent.end_interview()
    assert closing.startswith("[ES]"), "Should return translated Spanish text"
    # final message appended
    assert agent.conversation[-1]["content"] == closing

    # record to disk & re-read
    json_path = tmp_path / "conv.json"
    agent.record_conversation_to_json(json_path)
    saved = json.loads(Path(json_path).read_text())
    # At least the first and last messages should be there
    assert saved[0]["role"] == "assistant"
    assert saved[-1]["content"] == closing


