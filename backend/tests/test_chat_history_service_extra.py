"""
Extra coverage for ChatHistoryService
─────────────────────────────────────
• save_chat_history – audio_metadata branch & update-when-longer path
• get_chat_history  – empty-string log ➜ returns []
• save_analysis     – weak-question insert/update, JSON-parse fallback
"""

import json
import datetime
from unittest.mock import MagicMock, patch

import pytest
import sys, pathlib, os

ROOT = pathlib.Path(__file__).resolve().parents[1]   # ← one level above tests/
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT)) 

# -------------- common fixtures -------------------------------------------------
@pytest.fixture
def mock_supabase():
    return MagicMock()


@pytest.fixture
def svc(mock_supabase):
    with patch("services.chat_history_service.create_client",
               return_value=mock_supabase):
        from services.chat_history_service import ChatHistoryService
        return ChatHistoryService("url", "key")


# ---------- save_chat_history: audio metadata + update branch -------------------
def test_save_chat_history_update_longer(svc, mock_supabase):
    """Existing record has 2 msgs – new list has 4, so we update."""
    old_log = json.dumps([{"sender": "user"}, {"sender": "ai"}])
    mock_supabase.table.return_value.select.return_value.eq.return_value \
        .execute.return_value.data = [{"id": 55, "log": old_log}]

    # pretend .update succeeds
    mock_supabase.table.return_value.update.return_value.eq.return_value \
        .execute.return_value.data = [{"id": 55}]

    # include audioUrl + storagePath to hit audio_metadata branch
    new_msgs = [
        {"sender": "user", "text": "hi", "audioUrl": "http://...", "storagePath": "s3://a"},
        {"sender": "ai",   "text": "hello"},
        {"sender": "user", "text": "more"},
        {"sender": "ai",   "text": "ok"},
    ]
    out = svc.save_chat_history("tid", "me@mail.com", new_msgs)

    assert out == {"success": True, "interview_id": 55}
    # update must be called (not insert)
    mock_supabase.table.return_value.update.assert_called_once()
    # audio_metadata stored as JSON string with length 1
    saved_json = mock_supabase.table.return_value.update.call_args[0][0]["audio_metadata"]
    assert json.loads(saved_json)[0]["storagePath"] == "s3://a"


# ---------------- get_chat_history: empty string log ----------------------------
def test_get_chat_history_empty_string(svc, mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value \
        .execute.return_value.data = [{"log": ""}]

    assert svc.get_chat_history("tid") == []


# ---------- save_analysis: weak-question insert vs update & fallback ------------

@pytest.fixture
def patched_openai(monkeypatch):
    """Return a mocked OpenAI() instance whose .chat.completions.create() we control."""
    from services import chat_history_service as mod
    client = MagicMock()
    monkeypatch.setattr(mod, "OpenAI", lambda: client)
    return client


def _make_choice(content):
    msg = MagicMock()
    msg.content = content
    choice = MagicMock(message=msg)
    return choice


def test_save_analysis_weak_q_insert_and_update(
        svc, mock_supabase, patched_openai, monkeypatch):
    """
    • first weak-questions pass returns new Q → insert
    • second call (same Q) triggers update path
    """
    # --- mock the analysis “scores” call -------------
    main_scores = MagicMock()
    main_scores.parsed = MagicMock(
        technical=1, communication=1, confidence=1,
        problem_solving=1, resume_strength=1, leadership=1)
    patched_openai.beta.chat.completions.parse.return_value = MagicMock(
        choices=[MagicMock(message=main_scores)])

    # --- strengths / weaknesses simple valid JSON ----
    patched_openai.chat.completions.create.side_effect = [
        MagicMock(choices=[_make_choice(json.dumps(["s1", "s2"]))]),  # strengths
        MagicMock(choices=[_make_choice(json.dumps(["w1"]))]),        # weaknesses
        MagicMock(choices=[_make_choice("Good job")]),                # specific feedback
        # weak-question list
        MagicMock(choices=[_make_choice(json.dumps([
            {"question": "Why our company?"}
        ]))])
    ]

    # First call – table 'interview_questions' empty -> insert
    mock_supabase.table.return_value.select.return_value.eq.return_value \
        .eq.return_value.eq.return_value.execute.return_value.data = []
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{"id": 1}]

    messages = [{"sender": "user", "text": "A"}, {"sender": "ai", "text": "B"},
                {"sender": "user", "text": "C"}]

    ok = svc.save_analysis(1, "u@mail.com", messages, session_id="S")
    assert ok["success"] is True
    mock_supabase.table.return_value.insert.assert_called()          # weak-question insert

    # Second call – same weak question exists → update path
    mock_supabase.table.return_value.select.return_value.eq.return_value \
        .eq.return_value.eq.return_value.execute.return_value.data = [{"id": 99}]
    patched_openai.chat.completions.create.side_effect = [
        MagicMock(choices=[_make_choice(json.dumps(["s1"]))]),
        MagicMock(choices=[_make_choice(json.dumps(["w1"]))]),
        MagicMock(choices=[_make_choice("Fine")]),
        MagicMock(choices=[_make_choice(json.dumps([{"question": "Why our company?"}]))]),
    ]
    ok2 = svc.save_analysis(2, "u@mail.com", messages, session_id="S")
    assert ok2["success"] is True
    mock_supabase.table.return_value.update.assert_called()          # weak-question update


def test_save_analysis_strengths_parse_fallback(
        svc, mock_supabase, patched_openai, monkeypatch):
    """
    Strengths call returns NON-JSON; service should fall back to default list.
    """
    # minimal mocks for early exit
    main_scores = MagicMock()
    main_scores.parsed = MagicMock(
        technical=.5, communication=.5, confidence=.5,
        problem_solving=.5, resume_strength=.5, leadership=.5)
    patched_openai.beta.chat.completions.parse.return_value = MagicMock(
        choices=[MagicMock(message=main_scores)])

    # strengths returns plain text -> JSONDecodeError path
    patched_openai.chat.completions.create.side_effect = [
        MagicMock(choices=[_make_choice("plain text")]),  # strengths bad
        MagicMock(choices=[_make_choice(json.dumps(["w"]))]),  # weaknesses ok
        MagicMock(choices=[_make_choice("feedback")]),    # specific
        MagicMock(choices=[_make_choice("[]")])           # weak questions
    ]

    mock_supabase.table.return_value.upsert.return_value.execute.return_value.data = [{"ok": 1}]
    messages = [{"sender": "user", "text": "A"}, {"sender": "ai", "text": "B"},
                {"sender": "user", "text": "C"}]

    res = svc.save_analysis(3, "u@mail.com", messages)
    assert res["success"] is True    # should not crash despite bad strengths JSON


def test_save_chat_history_welcome_skip(svc):
    out = svc.save_chat_history("t1", "e@x", [{"sender": "ai", "text": "Welcome!"}])
    assert out == {"success": True, "skipped": True}


# --- save_chat_history existing longer → skip update -------------------------

def test_save_chat_history_existing_longer_skip(svc, mock_supabase):
    existing = json.dumps([1, 2, 3, 4])
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": 7, "log": existing}
    ]
    result = svc.save_chat_history("t2", "e@x", [{"sender": "user", "text": "hi"}])
    assert result["skipped"] is True
    # insert/update should NOT be called
    assert not mock_supabase.table.return_value.update.called
    assert not mock_supabase.table.return_value.insert.called


# --- save_chat_history new insert path --------------------------------------

def test_save_chat_history_insert_new(svc, mock_supabase):
    # select returns empty ⇒ new row
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    # mock insert returning id=99
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": 99}
    ]
    msgs = [{"sender": "user", "text": "hi"}, {"sender": "ai", "text": "hello"}]
    res = svc.save_chat_history("t3", "m@x", msgs)
    assert res == {"success": True, "interview_id": 99}
    assert mock_supabase.table.return_value.insert.called


# --- get_chat_history not found ---------------------------------------------

def test_get_chat_history_not_found(svc, mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    assert svc.get_chat_history("nope") is None


# --- delete_chat_history success & failure ----------------------------------

def test_delete_chat_history_success(svc, mock_supabase):
    assert svc.delete_chat_history("tid") is True
    mock_supabase.table.return_value.delete.assert_called()


def test_delete_chat_history_failure(svc, mock_supabase):
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.side_effect = Exception("boom")
    assert svc.delete_chat_history("tid2") is False


# --- save_analysis skips when <3 messages -----------------------------------

def test_save_analysis_skip_too_few_msgs(svc, patched_openai):
    msgs = [{"sender": "user", "text": "A"}, {"sender": "ai", "text": "B"}]
    res = svc.save_analysis(4, "u@x", msgs)
    assert res == {"success": True, "skipped": True}


# --- save_analysis weak‑questions bad JSON handled --------------------------

