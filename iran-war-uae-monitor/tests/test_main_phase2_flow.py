import pytest

from iran_monitor import app


@pytest.mark.asyncio
async def test_hourly_job_sends_immediate_alert_on_high(monkeypatch):
    alerts: list[str] = []
    sent_reports: list[str] = []
    persisted: list[dict] = []

    async def fake_scrape_uae_media():
        return [{"source": "The National", "title": "Missile attack near Abu Dhabi", "link": "https://a1"}]

    async def fake_scrape_social_media():
        return []

    async def fake_scrape_rss():
        return []

    def fake_upload_to_notebooklm(_articles):
        return {
            "notebook_id": "nb-1",
            "source_id": "src-1",
            "notebook_url": "https://notebooklm.google.com/notebook/nb-1",
        }

    def fake_analyze_phase2(_articles, _notebook_context):
        return {
            "threat_level": "HIGH",
            "threat_score": 78,
            "sentiment": "긴급",
            "abu_dhabi_level": "HIGH",
            "dubai_level": "MEDIUM",
            "summary": "테스트 분석",
            "recommended_action": "실내 대기",
            "key_points": ["테스트 포인트"],
            "analysis_source": "notebooklm",
        }

    async def fake_send_alert(message: str):
        alerts.append(message)
        return True

    async def fake_send_report_text(report: str):
        sent_reports.append(report)
        return {"telegram": True, "whatsapp": True}

    def fake_persist_storage(*, analysis, articles, report_text, notebook_url, flags):
        persisted.append(
            {
                "analysis": analysis,
                "articles": articles,
                "report_text": report_text,
                "notebook_url": notebook_url,
                "flags": flags,
            }
        )

    monkeypatch.setattr(app, "scrape_uae_media", fake_scrape_uae_media)
    monkeypatch.setattr(app, "scrape_social_media", fake_scrape_social_media)
    monkeypatch.setattr(app, "scrape_rss", fake_scrape_rss)
    monkeypatch.setattr(app, "_upload_to_notebooklm", fake_upload_to_notebooklm)
    monkeypatch.setattr(app, "_analyze_phase2", fake_analyze_phase2)
    monkeypatch.setattr(app, "send_telegram_alert", fake_send_alert)
    monkeypatch.setattr(app, "send_report_text", fake_send_report_text)
    monkeypatch.setattr(app, "_persist_storage", fake_persist_storage)
    monkeypatch.setattr(app, "_write_health_state", lambda *args, **kwargs: None)
    monkeypatch.setattr(app.settings, "PHASE2_PODCAST_ENABLED", False, raising=False)
    monkeypatch.setattr(app.settings, "PHASE2_ALERT_LEVELS", "HIGH,CRITICAL", raising=False)

    app._seen_hashes.clear()
    await app.hourly_job()

    assert len(alerts) == 1
    assert len(sent_reports) == 1
    assert len(persisted) == 1
    assert persisted[0]["analysis"]["threat_level"] == "HIGH"


@pytest.mark.asyncio
async def test_hourly_job_skips_immediate_alert_on_low(monkeypatch):
    alerts: list[str] = []
    sent_reports: list[str] = []
    persisted: list[dict] = []

    async def fake_scrape_uae_media():
        return [{"source": "Gulf News", "title": "Daily UAE update in Dubai", "link": "https://b1"}]

    async def fake_scrape_social_media():
        return []

    async def fake_scrape_rss():
        return []

    def fake_upload_to_notebooklm(_articles):
        return {
            "notebook_id": "nb-2",
            "source_id": "src-2",
            "notebook_url": "https://notebooklm.google.com/notebook/nb-2",
        }

    def fake_analyze_phase2(_articles, _notebook_context):
        return {
            "threat_level": "LOW",
            "threat_score": 25,
            "sentiment": "일반",
            "abu_dhabi_level": "LOW",
            "dubai_level": "LOW",
            "summary": "테스트 분석",
            "recommended_action": "일상 모니터링",
            "key_points": ["테스트 포인트"],
            "analysis_source": "fallback",
        }

    async def fake_send_alert(message: str):
        alerts.append(message)
        return True

    async def fake_send_report_text(report: str):
        sent_reports.append(report)
        return {"telegram": True, "whatsapp": True}

    def fake_persist_storage(*, analysis, articles, report_text, notebook_url, flags):
        persisted.append(
            {
                "analysis": analysis,
                "articles": articles,
                "report_text": report_text,
                "notebook_url": notebook_url,
                "flags": flags,
            }
        )

    monkeypatch.setattr(app, "scrape_uae_media", fake_scrape_uae_media)
    monkeypatch.setattr(app, "scrape_social_media", fake_scrape_social_media)
    monkeypatch.setattr(app, "scrape_rss", fake_scrape_rss)
    monkeypatch.setattr(app, "_upload_to_notebooklm", fake_upload_to_notebooklm)
    monkeypatch.setattr(app, "_analyze_phase2", fake_analyze_phase2)
    monkeypatch.setattr(app, "send_telegram_alert", fake_send_alert)
    monkeypatch.setattr(app, "send_report_text", fake_send_report_text)
    monkeypatch.setattr(app, "_persist_storage", fake_persist_storage)
    monkeypatch.setattr(app, "_write_health_state", lambda *args, **kwargs: None)
    monkeypatch.setattr(app.settings, "PHASE2_PODCAST_ENABLED", False, raising=False)
    monkeypatch.setattr(app.settings, "PHASE2_ALERT_LEVELS", "HIGH,CRITICAL", raising=False)

    app._seen_hashes.clear()
    await app.hourly_job()

    assert len(alerts) == 0
    assert len(sent_reports) == 1
    assert len(persisted) == 1
    assert persisted[0]["analysis"]["threat_level"] == "LOW"
