import pytest

import main


@pytest.mark.asyncio
async def test_hourly_job_sends_immediate_alert_on_high(monkeypatch):
    alerts = []
    reports = []

    async def fake_scrape_uae_media():
        return [{"source": "The National", "title": "Missile attack near Abu Dhabi", "link": "https://a1"}]

    async def fake_scrape_social_media():
        return []

    def fake_upload_to_notebooklm(articles):
        return {"notebook_id": "nb-1", "source_id": "src-1", "notebook_url": "https://notebooklm.google.com/notebook/nb-1"}

    def fake_analyze_phase2(articles, notebook_context):
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

    async def fake_send_report(articles, analysis=None, notebook_url=None):
        reports.append({"articles": articles, "analysis": analysis, "notebook_url": notebook_url})

    monkeypatch.setattr(main, "scrape_uae_media", fake_scrape_uae_media)
    monkeypatch.setattr(main, "scrape_social_media", fake_scrape_social_media)
    monkeypatch.setattr(main, "_upload_to_notebooklm", fake_upload_to_notebooklm)
    monkeypatch.setattr(main, "_analyze_phase2", fake_analyze_phase2)
    monkeypatch.setattr(main, "send_telegram_alert", fake_send_alert)
    monkeypatch.setattr(main, "send_telegram_report", fake_send_report)
    monkeypatch.setattr(main.settings, "PHASE2_PODCAST_ENABLED", False, raising=False)
    monkeypatch.setattr(main.settings, "PHASE2_ALERT_LEVELS", "HIGH,CRITICAL", raising=False)

    main._seen_hashes.clear()
    await main.hourly_job()

    assert len(alerts) == 1
    assert len(reports) == 1
    assert reports[0]["analysis"]["threat_level"] == "HIGH"


@pytest.mark.asyncio
async def test_hourly_job_skips_immediate_alert_on_low(monkeypatch):
    alerts = []
    reports = []

    async def fake_scrape_uae_media():
        return [{"source": "Gulf News", "title": "Daily UAE update in Dubai", "link": "https://b1"}]

    async def fake_scrape_social_media():
        return []

    def fake_upload_to_notebooklm(articles):
        return {"notebook_id": "nb-2", "source_id": "src-2", "notebook_url": "https://notebooklm.google.com/notebook/nb-2"}

    def fake_analyze_phase2(articles, notebook_context):
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

    async def fake_send_report(articles, analysis=None, notebook_url=None):
        reports.append({"articles": articles, "analysis": analysis, "notebook_url": notebook_url})

    monkeypatch.setattr(main, "scrape_uae_media", fake_scrape_uae_media)
    monkeypatch.setattr(main, "scrape_social_media", fake_scrape_social_media)
    monkeypatch.setattr(main, "_upload_to_notebooklm", fake_upload_to_notebooklm)
    monkeypatch.setattr(main, "_analyze_phase2", fake_analyze_phase2)
    monkeypatch.setattr(main, "send_telegram_alert", fake_send_alert)
    monkeypatch.setattr(main, "send_telegram_report", fake_send_report)
    monkeypatch.setattr(main.settings, "PHASE2_PODCAST_ENABLED", False, raising=False)
    monkeypatch.setattr(main.settings, "PHASE2_ALERT_LEVELS", "HIGH,CRITICAL", raising=False)

    main._seen_hashes.clear()
    await main.hourly_job()

    assert len(alerts) == 0
    assert len(reports) == 1
    assert reports[0]["analysis"]["threat_level"] == "LOW"
