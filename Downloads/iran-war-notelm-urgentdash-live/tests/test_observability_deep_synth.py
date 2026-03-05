import asyncio
from datetime import datetime

from fastapi.testclient import TestClient
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_MISSED, JobExecutionEvent

from src.iran_monitor import app as monitor_app
from src.iran_monitor import health
from src.iran_monitor.app import _on_scheduler_event
from src.iran_monitor.scrapers import social_media
import pytest


def test_health_response_includes_extended_fields(tmp_path, monkeypatch):
    state_file = tmp_path / "health_state.json"
    state_file.write_text(
        '{"status":"ok","last_success_at":"2026-03-01T10:00:00","last_run_ts":"2026-03-01T10:00:00","last_article_count":5,"counts":{"new_count":2,"total_count":4},"last_error":"none"}',
        encoding="utf-8",
    )
    monkeypatch.setattr(health, "HEALTH_STATE_FILE", state_file)

    client = TestClient(health.app)
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["last_run_ts"] == "2026-03-01T10:00:00"
    assert payload["last_article_count"] == 5
    assert payload["counts"]["new_count"] == 2
    assert payload["counts"]["total_count"] == 4


def test_health_response_aliases_last_run_from_last_success(tmp_path, monkeypatch):
    state_file = tmp_path / "health_state.json"
    state_file.write_text('{"status":"ok","last_success_at":"2026-03-01T11:00:00"}', encoding="utf-8")
    monkeypatch.setattr(health, "HEALTH_STATE_FILE", state_file)

    client = TestClient(health.app)
    payload = client.get("/health").json()

    assert payload["status"] == "ok"
    assert payload["last_run_ts"] == "2026-03-01T11:00:00"
    assert payload["counts"] == {}


class _DummyChromium:
    def __init__(self, fail):
        self._fail = fail

    async def launch(self, *args, **kwargs):
        if self._fail:
            raise RuntimeError("launch failed")
        return _DummyBrowser()


class _DummyPage:
    async def goto(self, *args, **kwargs):
        return None

    async def query_selector_all(self, *args, **kwargs):
        return []


class _DummyContext:
    async def new_page(self):
        return _DummyPage()

    async def close(self):
        return None


class _DummyBrowser:
    def __init__(self):
        self.closed = False

    async def new_context(self):
        return _DummyContext()

    async def close(self):
        self.closed = True


class _DummyPlaywright:
    def __init__(self, fail: bool = False):
        self.chromium = _DummyChromium(fail)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


def _dummy_async_playwright_factory(*args, **kwargs):
    return _DummyPlaywright(fail=True)


@pytest.mark.asyncio
async def test_social_media_exception_returns_empty(monkeypatch):
    monkeypatch.setattr(social_media, "settings", social_media.settings)
    monkeypatch.setattr(social_media, "async_playwright", _dummy_async_playwright_factory)

    items = await social_media.scrape_social_media()
    assert items == []


@pytest.mark.asyncio
async def test_scheduler_event_alert_respects_flag(monkeypatch):
    calls = []

    async def fake_send_alert(message: str) -> bool:
        calls.append(message)
        return True

    monkeypatch.setattr(monitor_app, "send_telegram_alert", fake_send_alert)

    # enabled
    monkeypatch.setattr(monitor_app.settings, "SCHEDULER_ALERT_ENABLED", True, raising=False)

    event = JobExecutionEvent(
        EVENT_JOB_ERROR,
        job_id="hourly_job",
        jobstore="default",
        scheduled_run_time=datetime.now(),
        retval=None,
        exception=RuntimeError("boom"),
        traceback="RuntimeError: boom",
    )
    _on_scheduler_event(event)
    await asyncio.sleep(0)
    assert len(calls) == 1

    # disabled
    calls.clear()
    monkeypatch.setattr(monitor_app.settings, "SCHEDULER_ALERT_ENABLED", False, raising=False)
    _on_scheduler_event(event)
    await asyncio.sleep(0)
    assert len(calls) == 0


@pytest.mark.asyncio
async def test_scheduler_missed_event_alerts_when_enabled(monkeypatch):
    calls = []

    async def fake_send_alert(message: str) -> bool:
        calls.append(message)
        return True

    monkeypatch.setattr(monitor_app, "send_telegram_alert", fake_send_alert)
    monkeypatch.setattr(monitor_app.settings, "SCHEDULER_ALERT_ENABLED", True, raising=False)

    event = JobExecutionEvent(
        EVENT_JOB_MISSED,
        job_id="hourly_job",
        jobstore="default",
        scheduled_run_time=datetime.now(),
        retval=None,
        exception=None,
        traceback=None,
    )

    _on_scheduler_event(event)
    await asyncio.sleep(0)

    assert len(calls) == 1
