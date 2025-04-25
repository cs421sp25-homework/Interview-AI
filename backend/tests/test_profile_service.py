from __future__ import annotations

import os
import sys
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

# Make project root importable when tests executed directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


# ---------------------------------------------------------------------------
# Utility: build one full-featured table-mock
# ---------------------------------------------------------------------------
def _build_table(initial_data):
    """Return a mock that mimics .select().eq().execute() & friends."""
    tbl = MagicMock(name="SupabaseTableMock")

    def _wrap(data):
        ns = SimpleNamespace()
        ns.data = data
        return ns

    # SELECT / EQ   (we’ll override .execute.side_effect per-test when needed)
    select_chain = tbl.select.return_value.eq.return_value
    select_chain.execute.return_value = _wrap(initial_data)

    # allow ...eq().eq() for compound filters
    select_chain.eq.return_value.execute.return_value = _wrap(initial_data)

    # UPDATE
    tbl.update.return_value.eq.return_value.execute.return_value = _wrap(
        initial_data
    )

    # INSERT / UPSERT / DELETE
    tbl.insert.return_value.execute.return_value = _wrap(initial_data)
    tbl.upsert.return_value.execute.return_value = _wrap(initial_data)
    tbl.delete.return_value.eq.return_value.execute.return_value = _wrap(
        initial_data
    )
    return tbl


# ---------------------------------------------------------------------------
# Pytest fixtures
# ---------------------------------------------------------------------------
@pytest.fixture()
def supabase_stub():
    """
    Fake Supabase client.

    * `.table(name)` → always the **same** mock per name (cached).
    * `.auth.sign_up` → stubbed to succeed.
    """
    cache: dict[str, MagicMock] = {}

    def _table(name):
        if name not in cache:
            cache[name] = _build_table([])
        return cache[name]

    client = MagicMock(name="SupabaseClientStub")
    client.table.side_effect = _table
    client.auth.sign_up.return_value = {"ok": True}
    return client


@pytest.fixture()
def svc(monkeypatch, supabase_stub):
    """ProfileService wired to our stubbed client."""
    monkeypatch.setattr(
        "services.profile_service.create_client",
        lambda url, key: supabase_stub,
    )
    from services.profile_service import ProfileService

    return ProfileService("fake_url", "fake_key")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------



def test_get_profile_not_found(svc, supabase_stub):
    tbl = supabase_stub.table("profiles")
    tbl.select.return_value.eq.return_value.execute.return_value.data = []

    assert svc.get_profile("none@x") is None


def test_update_profile_happy_path(svc, supabase_stub):
    """Existing user -> upsert called with merged fields."""
    tbl = supabase_stub.table("profiles")

    existing = {"id": 2, "email": "e@x", "first_name": "Old", "last_name": "Name"}
    updated = {"id": 2, "email": "e@x", "first_name": "New", "last_name": "Last"}

    # first SELECT (existence)  → existing
    # second SELECT (after upsert) → updated
    select_chain = tbl.select.return_value.eq.return_value
    select_chain.execute.side_effect = [
        SimpleNamespace(data=[existing]),
        SimpleNamespace(data=[updated]),
    ]

    tbl.upsert.return_value.execute.return_value.data = [updated]

    result = svc.update_profile("e@x", {"firstName": "New", "lastName": "Last"})
    assert result["first_name"] == "New"

    # ensure payload passed to upsert is correct
    payload = tbl.upsert.call_args[0][0]
    assert payload["id"] == 2
    assert payload["first_name"] == "New"
    assert payload["last_name"] == "Last"


def test_update_profile_user_missing(svc, supabase_stub):
    tbl = supabase_stub.table("profiles")
    tbl.select.return_value.eq.return_value.execute.return_value.data = []

    assert svc.update_profile("missing@x", {}) is None
    tbl.upsert.assert_not_called()


def test_create_profile_success(svc, supabase_stub):
    """insert succeeds and auth.sign_up is triggered once."""
    tbl = supabase_stub.table("profiles")
    tbl.insert.return_value.execute.return_value.data = [{"id": 9}]

    data = {
        "email": "new@x",
        "firstName": "Alpha",
        "lastName": "Beta",
        "password": "pwd",
    }

    out = svc.create_profile(data)
    assert out["success"] is True
    supabase_stub.auth.sign_up.assert_called_once()
    tbl.insert.assert_called_once()


def test_map_profile_data_defaults(svc):
    """
    • username auto-derived from email
    • password auto-generated when missing
    • camelCase → snake_case mapping
    """
    profile_dict = {
        "email": "user@example.com",
        "firstName": "Ada",
    }

    prof = svc.map_profile_data(profile_dict)

    assert prof.username == "user"
    assert prof.password  # auto-generated string
    assert prof.first_name == "Ada"
    # created_at should parse as ISO-8601
    datetime.fromisoformat(prof.created_at)