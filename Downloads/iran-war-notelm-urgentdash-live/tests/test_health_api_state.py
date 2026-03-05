from __future__ import annotations

import json

from fastapi.testclient import TestClient

from src.iran_monitor import health


def test_api_state_returns_warming_up_when_file_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(health, "HYIE_STATE_FILE", tmp_path / "missing_state.json")
    client = TestClient(health.app)

    response = client.get("/api/state")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "warming_up"
    assert payload["degraded"] is True


def test_api_state_returns_payload_when_file_exists(tmp_path, monkeypatch):
    state_file = tmp_path / "hyie_state.json"
    state_file.write_text(
        json.dumps(
            {
                "state_ts": "2026-03-04T12:00:00+04:00",
                "status": "ok",
                "source_health": {"a": {"ok": True, "status": "ok"}},
                "degraded": False,
                "flags": [],
                "intel_feed": [],
                "indicators": [],
                "hypotheses": [],
                "routes": [],
                "checklist": [],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(health, "HYIE_STATE_FILE", state_file)
    client = TestClient(health.app)

    response = client.get("/api/state")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["degraded"] is False
    assert payload["state_ts"] == "2026-03-04T12:00:00+04:00"


def test_api_state_egress_eta_set_and_get(tmp_path, monkeypatch):
    eta_file = tmp_path / "egress_eta.json"
    monkeypatch.setattr(health, "HYIE_EGRESS_ETA_FILE", eta_file)
    client = TestClient(health.app)

    post_response = client.post("/api/state/egress-eta", json={"egress_loss_eta_h": 9.5, "note": "manual override"})
    assert post_response.status_code == 200
    post_payload = post_response.json()
    assert post_payload["ok"] is True
    assert post_payload["egress_loss_eta_h"] == 9.5

    get_response = client.get("/api/state/egress-eta")
    assert get_response.status_code == 200
    get_payload = get_response.json()
    assert get_payload["egress_loss_eta_h"] == 9.5
