from iran_monitor.reporter import build_report_text


def test_report_includes_phase2_meta_and_city_sections():
    articles = [
        {"source": "The National", "title": "Missile alert in Abu Dhabi airport zone", "link": "https://news/1"},
        {"source": "Khaleej Times", "title": "Dubai flights delayed after security alert", "link": "https://news/2"},
        {"source": "Gulf News", "title": "Regional military attack update", "link": "https://news/3"},
        {"source": "Wire", "title": "Regional update", "link": "https://news/2"},
    ]
    analysis = {
        "threat_level": "HIGH",
        "threat_score": 76,
        "sentiment": "긴급",
        "abu_dhabi_level": "HIGH",
        "dubai_level": "MEDIUM",
        "summary": "미사일 경보와 항공 지연이 동시 발생",
        "recommended_action": "불필요한 이동 중단",
        "key_points": ["아부다비 공항 경보", "두바이 일부 항공편 지연"],
        "analysis_source": "notebooklm",
    }

    report = build_report_text(
        articles,
        analysis=analysis,
        notebook_url="https://notebooklm.google.com/notebook/nb1",
    )

    assert "Phase 2 AI 위협 평가" in report
    assert "*HIGH* (76/100)" in report
    assert "1순위 (아부다비)" in report
    assert "2순위 (두바이)" in report
    assert "🔗 *주요 링크*" in report
    assert "https://news/1" in report
    assert "https://news/2" in report
    assert "https://news/3" in report
    assert "https://notebooklm.google.com/notebook/nb1" not in report
    assert report.count("https://news/2") == 1


def test_report_omits_link_section_when_no_priority_links():
    articles = [
        {"source": "Local", "title": "General economic briefing", "link": "https://news/a"},
        {"source": "Local", "title": "Community update", "link": "https://news/b"},
    ]

    report = build_report_text(
        articles,
        analysis={"threat_level": "LOW", "threat_score": 10, "sentiment": "일반"},
        notebook_url="https://notebooklm.google.com/notebook/nb2",
    )

    assert "🔗 *주요 링크*" not in report
    assert "https://news/a" not in report
    assert "https://news/b" not in report
    assert "https://notebooklm.google.com/notebook/nb2" not in report
