# tests/test_config_service.py
"""
Unit tests for services.config_service.ConfigService.

All Supabase access is mocked – tests execute fully offline.
"""
from __future__ import annotations

import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

# Allow `import services...` when running tests directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


# ---------------------------------------------------------------------------
# helper – one mock-table with full select/insert/update/delete chains
# ---------------------------------------------------------------------------
def _make_table(initial_data):
    tbl = MagicMock(name="SupabaseTableMock")

    def _wrap(data):
        ns = SimpleNamespace()
        ns.data = data
        return ns

    # SELECT chain (.select().eq().eq().execute())
    sel_chain = tbl.select.return_value.eq.return_value
    sel_chain.execute.return_value = _wrap(initial_data)
    # allow two .eq() calls
    sel_chain.eq.return_value.execute.return_value = _wrap(initial_data)

    # INSERT / UPDATE / DELETE
    tbl.insert.return_value.execute.return_value = _wrap(initial_data)
    tbl.update.return_value.eq.return_value.execute.return_value = _wrap(
        initial_data
    )
    tbl.delete.return_value.eq.return_value.execute.return_value = _wrap(
        initial_data
    )
    return tbl


# ---------------------------------------------------------------------------
# fixtures
# ---------------------------------------------------------------------------
@pytest.fixture()
def supabase_stub():
    """Fake Supabase client with per-table cache."""
    cache: dict[str, MagicMock] = {}

    def _table(name):
        if name not in cache:
            cache[name] = _make_table([])
        return cache[name]

    client = MagicMock(name="SupabaseClientStub")
    client.table.side_effect = _table
    return client


@pytest.fixture()
def cfg_svc(monkeypatch, supabase_stub):
    """ConfigService wired to the stubbed client."""
    monkeypatch.setattr(
        "services.config_service.create_client",
        lambda url, key: supabase_stub,
    )
    from services.config_service import ConfigService

    return ConfigService("fake_url", "fake_key")


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------
def test_get_single_config_found(cfg_svc, supabase_stub):
    tbl = supabase_stub.table("interview_config")
    row = {"id": 7, "interview_name": "Foo", "email": "a@b"}
    tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        row
    ]

    got = cfg_svc.get_single_config("Foo", "a@b")
    assert got == row

    # verify query chain
    tbl.select.assert_called_once_with("*")
    # first eq = on interview_name, second on email
    assert tbl.select.return_value.eq.call_args_list[0][0][0] == "interview_name"
    assert tbl.select.return_value.eq.return_value.eq.call_args_list[0][0][0] == "email"





def test_get_configs_list(cfg_svc, supabase_stub):
    tbl = supabase_stub.table("interview_config")
    rows = [{"id": 1}, {"id": 2}]
    tbl.select.return_value.eq.return_value.execute.return_value.data = rows

    out = cfg_svc.get_configs("me@x")
    assert out == rows


def test_get_configs_none(cfg_svc, supabase_stub):
    tbl = supabase_stub.table("interview_config")
    tbl.select.return_value.eq.return_value.execute.return_value.data = []

    assert cfg_svc.get_configs("nobody") is None


def test_create_config_success_strips_id(cfg_svc, supabase_stub):
    tbl = supabase_stub.table("interview_config")
    tbl.insert.return_value.execute.return_value.data = [{"id": 42}]

    data = {"id": 999, "interview_name": "NewCfg", "email": "u@x"}
    new_id = cfg_svc.create_config(data)

    assert new_id == 42
    # inserted payload must NOT contain "id"
    inserted_payload = tbl.insert.call_args[0][0]
    assert "id" not in inserted_payload


def test_create_config_failure_returns_none(cfg_svc, supabase_stub):
    tbl = supabase_stub.table("interview_config")
    tbl.insert.return_value.execute.return_value.data = []

    assert cfg_svc.create_config({"interview_name": "X", "email": "y"}) is None


def test_update_config_happy(cfg_svc, supabase_stub):
    tbl = supabase_stub.table("interview_config")
    updated = {"id": 5, "question_type": "technical"}
    tbl.update.return_value.eq.return_value.execute.return_value.data = [updated]

    out = cfg_svc.update_config(5, {"question_type": "technical"})
    assert out == updated

    # ensure .update called with supplied dict
    tbl.update.assert_called_once_with({"question_type": "technical"})


def test_update_config_not_found(cfg_svc, supabase_stub):
    tbl = supabase_stub.table("interview_config")
    tbl.update.return_value.eq.return_value.execute.return_value.data = []

    assert cfg_svc.update_config(99, {}) is None


def test_delete_config_success(cfg_svc, supabase_stub):
    tbl = supabase_stub.table("interview_config")
    tbl.delete.return_value.eq.return_value.execute.return_value.data = ["ok"]

    assert cfg_svc.delete_config(3) is True


def test_delete_config_no_row(cfg_svc, supabase_stub):
    tbl = supabase_stub.table("interview_config")
    tbl.delete.return_value.eq.return_value.execute.return_value.data = []

    assert cfg_svc.delete_config(11) is False
