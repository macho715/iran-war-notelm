from __future__ import annotations

from src.iran_monitor.state_engine import build_state_payload


def test_build_state_payload_core_fields():
    signals = [
        {
            "source_id": "tier0_us_embassy_uae",
            "source": "US Embassy UAE",
            "tier": "TIER0",
            "indicator_ids": ["I01", "I07"],
            "score": 0.92,
            "confirmed": True,
            "ts": "2026-03-04T12:00:00+04:00",
            "summary": "US Embassy UAE: ordered departure advisory",
            "tags": ["kr_alert"],
        },
        {
            "source_id": "tier0_etihad_updates",
            "source": "Etihad",
            "tier": "TIER0",
            "indicator_ids": ["I02"],
            "score": 0.88,
            "confirmed": True,
            "ts": "2026-03-04T12:00:00+04:00",
            "summary": "Etihad update: flights suspended",
            "tags": ["air_update"],
        },
        {
            "source_id": "tier1_reuters_world",
            "source": "Reuters",
            "tier": "TIER1",
            "indicator_ids": ["I03"],
            "score": 0.91,
            "confirmed": True,
            "ts": "2026-03-04T12:00:00+04:00",
            "summary": "Reuters: missile and drone strike near UAE",
            "tags": ["strike"],
        },
    ]
    source_health = {
        "tier0_us_embassy_uae": {"ok": True, "status": "ok"},
        "tier0_etihad_updates": {"ok": True, "status": "ok"},
        "tier1_reuters_world": {"ok": True, "status": "ok"},
    }

    payload = build_state_payload(signals=signals, source_health=source_health)

    assert payload["status"] == "ok"
    assert payload["degraded"] is False
    assert len(payload["indicators"]) == 7
    assert payload["evidence_conf"] > 0
    assert "intel_feed" in payload and payload["intel_feed"]
    assert payload["egress_loss_eta"] is not None
    assert payload["egress_eta_source"].startswith("estimated_")
    assert payload["intel_feed"][0]["tsIso"].startswith("2026-03-04T")
    i01 = [row for row in payload["indicators"] if row["id"] == "I01"][0]
    assert i01["cv"] is True
    assert i01["tsIso"].startswith("2026-03-04T")


def test_build_state_payload_degraded_with_source_failures():
    payload = build_state_payload(
        signals=[],
        source_health={
            "s1": {"ok": False, "status": "timeout", "tier": "TIER0", "priority": "critical"},
            "s2": {"ok": False, "status": "timeout", "tier": "TIER0", "priority": "critical"},
            "s3": {"ok": False, "status": "http_non_2xx", "tier": "TIER0", "priority": "critical"},
            "s4": {"ok": True, "status": "ok"},
        },
    )

    assert payload["degraded"] is True
    assert payload["status"] == "degraded"
    assert payload["triggers"]["comms_degraded"] is True


def test_build_state_payload_manual_egress_eta_override():
    payload = build_state_payload(
        signals=[],
        source_health={},
        manual_egress_eta_h=6.0,
    )
    assert payload["egress_loss_eta"] == 6.0
    assert payload["egress_eta_source"] == "manual"
    assert payload["urgency"] is not None
