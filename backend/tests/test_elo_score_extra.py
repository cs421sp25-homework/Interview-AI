from __future__ import annotations

import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

# ──────────────────────────────────────────────────────────────────────────────
# add project root to path
# ──────────────────────────────────────────────────────────────────────────────
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

# ──────────────────────────────────────────────────────────────────────────────
# helpers – fake supabase
# ──────────────────────────────────────────────────────────────────────────────
_TABLE_CACHE: dict[str, MagicMock] = {}


def _table(name: str) -> MagicMock:
    """Return (and cache) a stub table object with all the usual chains mocked."""
    if name in _TABLE_CACHE:
        return _TABLE_CACHE[name]

    tbl = MagicMock(name=f"Table<{name}>")

    def wrap(data):
        ns = SimpleNamespace(data=data)
        return ns

    # select → eq → execute
    sel_eq = tbl.select.return_value.eq.return_value
    sel_eq.execute.return_value = wrap([])

    # select → order → limit → execute
    tbl.select.return_value.order.return_value.limit.return_value.execute.return_value = wrap(
        []
    )
    # select → order(desc) → limit(1) (used for “next id” query)
    tbl.select.return_value.order.return_value.limit.return_value.execute.return_value = wrap(
        []
    )

    # insert / update / upsert / delete
    for m in ("insert", "update", "upsert", "delete"):
        getattr(tbl, m).return_value.execute.return_value = wrap([])

    _TABLE_CACHE[name] = tbl
    return tbl


def _fake_create(_url, _key):
    client = MagicMock(name="SupabaseClient")
    client.table.side_effect = _table
    return client


# ──────────────────────────────────────────────────────────────────────────────
# autouse patch – every function-scope test gets a patched supabase
# ──────────────────────────────────────────────────────────────────────────────
@pytest.fixture(autouse=True)
def _patch_supabase(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://dummy")
    monkeypatch.setenv("SUPABASE_KEY", "dummy-key")

    # patch the supabase module BEFORE importing service
    monkeypatch.setitem(sys.modules, "supabase", MagicMock(create_client=_fake_create))

    import importlib

    mod = importlib.import_module("services.elo_calculator")
    importlib.reload(mod)  # ensure it sees our fake supabase
    yield mod
    _TABLE_CACHE.clear()


# ──────────────────────────────────────────────────────────────────────────────
# helper fixture that gives a ready service
# ──────────────────────────────────────────────────────────────────────────────
@pytest.fixture
def svc(_patch_supabase):
    return _patch_supabase.SupabaseEloService()


# ──────────────────────────────────────────────────────────────────────────────
# tests
# ──────────────────────────────────────────────────────────────────────────────
def test_get_user_elo_fallback_base(svc, _patch_supabase):
    """Absent user → returns module‐level BASE_ELO."""
    assert svc.get_user_elo("absent@x") == _patch_supabase.BASE_ELO


def test_get_user_elo_existing(svc):
    tbl = _table("elo_scores")
    tbl.select.return_value.eq.return_value.execute.return_value.data = [{"eloscore": 1500}]
    assert svc.get_user_elo("known@x") == 1500


@pytest.mark.parametrize(
    "cur,score,rel",
    [(800, 80, "up"), (1600, 30, "down"), (1200, 60, "draw")],
)
def test_calculate_elo_branches(svc, _patch_supabase, cur, score, rel):
    new = svc.calculate_elo(cur, score, "medium")
    if rel == "up":
        assert new > cur
    elif rel == "down":
        assert new < cur
    else:  # draw-ish
        assert abs(new - cur) <= _patch_supabase.K_FACTOR_DEFAULT


def test_update_elo_new_user_flow(svc):
    out = svc.update_elo_score("new@x", 90, "New User", difficulty="easy")
    assert out["new_elo"] > out["old_elo"]
    _table("elo_scores").insert.assert_called()
    _table("elo_history").insert.assert_called()


def test_update_elo_existing_user_flow(svc):
    tbl = _table("elo_scores")
    tbl.select.return_value.eq.return_value.execute.return_value.data = [{"id": 1, "eloscore": 1400}]
    out = svc.update_elo_score("vet@x", 20, "Vet", difficulty="hard")
    assert out["new_elo"] < 1400
    tbl.update.assert_called()
    _table("elo_history").insert.assert_called()


def test_leaderboard(svc):
    tbl = _table("elo_scores")
    tbl.select.return_value.order.return_value.range.return_value.execute.return_value.data = [
        {"rank": 1, "name": "Top", "eloscore": 2020}
    ]
    board = svc.get_leaderboard(limit=1)
    assert board[0]["rank"] == 1


def test_user_history_formatting(svc):
    tbl = _table("elo_history")
    tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
        {"eloscore": 1234, "created_at": "2025-02-28T09:00:00"}
    ]
    hist = svc.get_user_elo_history("user@x", limit=5)
    assert hist == [{"date": "2025-02-28", "score": 1234}]