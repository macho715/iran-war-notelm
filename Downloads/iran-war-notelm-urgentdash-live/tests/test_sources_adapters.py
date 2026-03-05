from __future__ import annotations

from datetime import datetime, timezone

import pytest

from src.iran_monitor.sources import common


@pytest.mark.asyncio
async def test_collect_source_specs_handles_timeout(monkeypatch):
    async def fake_fetch(client, url):
        return "timeout", "", None, "timed out"

    monkeypatch.setattr(common, "_fetch_text", fake_fetch)

    specs = [
        common.SourceSpec(
            source_id="s1",
            name="source1",
            url="https://example.com",
            tier="TIER0",
            indicator_ids=("I01",),
            keywords=("travel",),
        )
    ]
    signals, health = await common.collect_source_specs(
        specs,
        timeout_sec=0.1,
        checked_at=datetime.now(timezone.utc),
    )

    assert signals == []
    assert health["s1"]["ok"] is False
    assert health["s1"]["status"] == "timeout"


@pytest.mark.asyncio
async def test_collect_source_specs_builds_signal(monkeypatch):
    async def fake_fetch(client, url):
        return "ok", "ordered departure and do not travel", 200, None

    monkeypatch.setattr(common, "_fetch_text", fake_fetch)

    specs = [
        common.SourceSpec(
            source_id="s2",
            name="source2",
            url="https://example.com",
            tier="TIER0",
            indicator_ids=("I01",),
            keywords=("travel", "ordered departure"),
            critical_keywords=("ordered departure",),
        )
    ]

    signals, health = await common.collect_source_specs(
        specs,
        timeout_sec=0.1,
        checked_at=datetime.now(timezone.utc),
    )
    assert len(signals) == 1
    assert signals[0]["indicator_ids"] == ["I01"]
    assert signals[0]["confirmed"] is True
    assert health["s2"]["ok"] is True
