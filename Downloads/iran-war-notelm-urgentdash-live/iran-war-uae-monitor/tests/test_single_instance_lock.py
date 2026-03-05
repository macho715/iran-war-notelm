import json
from pathlib import Path

from iran_monitor import app


def test_single_instance_lock_blocks_second_acquire(monkeypatch, tmp_path):
    monkeypatch.setattr(app.settings, "SINGLE_INSTANCE_GUARD_ENABLED", True, raising=False)
    monkeypatch.setattr(app.settings, "STORAGE_ROOT", str(tmp_path), raising=False)
    monkeypatch.setattr(app.settings, "SINGLE_INSTANCE_LOCK_FILE", "state/monitor.lock", raising=False)

    try:
        assert app._acquire_single_instance_lock() is True
        assert app._lock_file_path().exists()

        # Same process re-acquire should be blocked as "already running"
        assert app._acquire_single_instance_lock() is False
    finally:
        app._release_single_instance_lock()

    assert not app._lock_file_path().exists()


def test_single_instance_lock_recovers_stale_file(monkeypatch, tmp_path):
    monkeypatch.setattr(app.settings, "SINGLE_INSTANCE_GUARD_ENABLED", True, raising=False)
    monkeypatch.setattr(app.settings, "STORAGE_ROOT", str(tmp_path), raising=False)
    monkeypatch.setattr(app.settings, "SINGLE_INSTANCE_LOCK_FILE", "state/monitor.lock", raising=False)

    lock_path = app._lock_file_path()
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    # Highly unlikely PID to be alive; treated as stale
    lock_path.write_text(json.dumps({"pid": 999999, "created_at": "2026-03-01T00:00:00"}), encoding="utf-8")

    try:
        assert app._acquire_single_instance_lock() is True
        payload = json.loads(lock_path.read_text(encoding="utf-8"))
        assert int(payload["pid"]) > 0
    finally:
        app._release_single_instance_lock()

    assert not lock_path.exists()


def test_single_instance_lock_treats_pid_probe_error_as_stale(monkeypatch, tmp_path):
    monkeypatch.setattr(app.settings, "SINGLE_INSTANCE_GUARD_ENABLED", True, raising=False)
    monkeypatch.setattr(app.settings, "STORAGE_ROOT", str(tmp_path), raising=False)
    monkeypatch.setattr(app.settings, "SINGLE_INSTANCE_LOCK_FILE", "state/monitor.lock", raising=False)

    lock_path = app._lock_file_path()
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_path.write_text(json.dumps({"pid": 424242, "created_at": "2026-03-01T00:00:00"}), encoding="utf-8")

    def _boom(_pid: int) -> bool:
        raise OSError("pid probe failed")

    monkeypatch.setattr(app, "_pid_exists", _boom)

    try:
        assert app._acquire_single_instance_lock() is True
        payload = json.loads(lock_path.read_text(encoding="utf-8"))
        assert int(payload["pid"]) > 0
    finally:
        app._release_single_instance_lock()

    assert not lock_path.exists()
