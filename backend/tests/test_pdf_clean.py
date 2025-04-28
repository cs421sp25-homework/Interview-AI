import sys, os, inspect
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import os
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Adjust the import path if the module lives elsewhere

from importlib import import_module
import llm.pdf_clean as resume_mod
resume_mod = import_module("llm.pdf_clean"   # ← change to your path if different
                           if "pdf_clean" in inspect.getmodule(inspect.currentframe()).__name__
                           else "llm.pdf_clean")  # fallback


# ---------------------------------------------------------------------------
# download_pdf
# ---------------------------------------------------------------------------
def test_download_pdf_happy(monkeypatch, tmp_path):
    pdf_bytes = b"%PDF-1.4 fake pdf bytes"
    mock_resp = MagicMock(status_code=200, content=pdf_bytes)
    monkeypatch.setattr(resume_mod.requests, "get", lambda *_a, **_k: mock_resp)

    with patch.object(resume_mod, "NamedTemporaryFile") as ntf:
        temp = MagicMock()
        temp.name = str(tmp_path / "resume.pdf")
        ntf.return_value = temp
        path = resume_mod.download_pdf("http://example.com/resume.pdf")

    assert Path(path).exists() is True  # we mocked away the actual write
    ntf.assert_called_once()             # file was created


def test_download_pdf_http_error(monkeypatch):
    monkeypatch.setattr(
        resume_mod.requests, "get", lambda *_a, **_k: MagicMock(status_code=404)
    )
    with pytest.raises(ValueError, match="Status Code: 404"):
        resume_mod.download_pdf("http://bad.url/no.pdf")


# ---------------------------------------------------------------------------
# extract_text_from_pdf
# ---------------------------------------------------------------------------
def test_extract_text_single_page(monkeypatch):
    # Mimic a PyPDFLoader that returns exactly one page
    page = MagicMock()
    page.page_content = "My single-page resume text"
    loader = MagicMock()
    loader.lazy_load.return_value = [page]

    monkeypatch.setattr(resume_mod, "PyPDFLoader", lambda _: loader)
    text = resume_mod.extract_text_from_pdf("/fake/path/resume.pdf")
    assert text == "My single-page resume text"


def test_extract_text_multi_page(monkeypatch):
    # Two pages should raise
    loader = MagicMock()
    loader.lazy_load.return_value = [MagicMock(), MagicMock()]
    monkeypatch.setattr(resume_mod, "PyPDFLoader", lambda _: loader)

    with pytest.raises(ValueError, match="contains 2 pages"):
        resume_mod.extract_text_from_pdf("/fake/path/resume.pdf")


# ---------------------------------------------------------------------------
# generate_prompt
# ---------------------------------------------------------------------------
def test_generate_prompt_contains_schema():
    sample_text = "Experience with Python"
    prompt = resume_mod.generate_prompt(sample_text)
    assert "education_history" in prompt
    assert sample_text in prompt


# ---------------------------------------------------------------------------
# extract_json_from_response
# ---------------------------------------------------------------------------
def test_extract_json_ok():
    data = {"education_history": [], "experience": []}
    wrapped = f"Here is the data:\n{json.dumps(data)}"
    assert resume_mod.extract_json_from_response(wrapped) == data


def test_extract_json_fail():
    with pytest.raises(ValueError, match="Could not extract JSON"):
        resume_mod.extract_json_from_response("no json here")


# ---------------------------------------------------------------------------
# process_resume – end-to-end with heavy mocks
# ---------------------------------------------------------------------------
def test_process_resume_full(monkeypatch, tmp_path):
    # 1) mock download_pdf → returns a tmp file path we control
    fake_pdf = tmp_path / "r.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4 stub")

    monkeypatch.setattr(resume_mod, "download_pdf", lambda url: str(fake_pdf))

    # 2) mock extract_text_from_pdf
    monkeypatch.setattr(
        resume_mod, "extract_text_from_pdf", lambda p: "Some resume text"
    )

    # 3) mock ChatOpenAI.invoke to return JSON
    out_json = {"education_history": [], "experience": []}
    chat_mock = MagicMock()
    chat_mock.invoke.return_value = MagicMock(content=json.dumps(out_json))
    monkeypatch.setattr(resume_mod, "ChatOpenAI", lambda *a, **k: chat_mock)

    result = resume_mod.process_resume("http://example.com/resume.pdf")
    assert result == out_json
    # ensure temp file cleaned up
    assert not fake_pdf.exists()
