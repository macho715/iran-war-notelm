from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.iran_monitor import app as monitor_app


@pytest.mark.asyncio
async def test_update_hyie_state_writes_state_and_snapshot(tmp_path: Path, monkeypatch):
    async def fake_tier0(*, timeout_sec, now):
        return (
            [
                {
                    "source_id": "tier0_test",
                    "source": "tier0_test",
                    "tier": "TIER0",
                    "indicator_ids": ["I01", "I07"],
                    "score": 0.9,
                    "confirmed": True,
                    "ts": now.isoformat(timespec="seconds"),
                    "summary": "travel advisory raised",
                    "tags": ["kr_alert"],
                }
            ],
            {"tier0_test": {"ok": True, "status": "ok"}},
        )

    async def fake_tier1(*, timeout_sec, now):
        return ([], {})

    async def fake_tier2(*, timeout_sec, now):
        return ([], {})

    monkeypatch.setattr(monitor_app, "collect_tier0_signals", fake_tier0)
    monkeypatch.setattr(monitor_app, "collect_tier1_signals", fake_tier1)
    monkeypatch.setattr(monitor_app, "collect_tier2_signals", fake_tier2)
    monkeypatch.setattr(monitor_app.settings, "HYIE_ENABLED", True, raising=False)
    monkeypatch.setattr(monitor_app.settings, "HYIE_APPEND_REPORTS_JSONL", True, raising=False)
    monkeypatch.setattr(monitor_app.settings, "HYIE_APPEND_URGENTDASH_JSONL", True, raising=False)
    monkeypatch.setattr(monitor_app.settings, "STORAGE_ROOT", str(tmp_path), raising=False)
    monkeypatch.setattr(monitor_app, "HYIE_STATE_FILE", tmp_path / "state" / "hyie_state.json")
    monkeypatch.setattr(monitor_app, "HYIE_STATE_META_FILE", tmp_path / "state" / "hyie_state.meta.json")
    monkeypatch.setattr(monitor_app, "HYIE_INGEST_LOCK_FILE", tmp_path / "state" / "hyie_ingest.lock")
    monkeypatch.setattr(monitor_app, "HYIE_EGRESS_ETA_FILE", tmp_path / "state" / "egress_eta.json")

    flags: list[str] = []
    payload = await monitor_app._update_hyie_state(
        all_articles=[{"title": "Etihad flight suspended", "source": "sample", "link": "https://x"}],
        run_ts="2026-03-04T12:00:00+04:00",
        flags=flags,
    )

    assert payload is not None
    state_file = tmp_path / "state" / "hyie_state.json"
    assert state_file.exists()

    saved = json.loads(state_file.read_text(encoding="utf-8"))
    assert "indicators" in saved
    assert "intel_feed" in saved
    assert "egress_eta_source" in saved

    day = str(saved["state_ts"])[:10]
    jsonl_path = tmp_path / "urgentdash_snapshots" / f"{day}.jsonl"
    assert jsonl_path.exists()

    # 2nd run with identical input should not append duplicate snapshot entries.
    flags_second: list[str] = []
    await monitor_app._update_hyie_state(
        all_articles=[{"title": "Etihad flight suspended", "source": "sample", "link": "https://x"}],
        run_ts="2026-03-04T12:00:00+04:00",
        flags=flags_second,
    )
    assert "HYIE_NO_DELTA" in flags_second
    lines = [line for line in jsonl_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(lines) == 1
