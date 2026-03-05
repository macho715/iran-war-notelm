from iran_monitor.storage_adapter import (
    build_article_rows,
    build_outbox_rows,
    build_run_payload,
)


def test_build_run_payload_uses_medium_level_and_evidence_hash():
    articles = [
        {"source": "The National", "title": "Abu Dhabi airport alert", "link": "https://a"},
        {"source": "Khaleej Times", "title": "Dubai flights resumed", "link": "https://b"},
    ]
    analysis = {
        "threat_level": "MEDIUM",
        "threat_score": 55,
        "sentiment": "일반",
        "abu_dhabi_level": "HIGH",
        "dubai_level": "LOW",
        "summary": "상황 점검 필요",
        "recommended_action": "모니터링",
        "key_points": ["포인트 1"],
        "analysis_source": "notebooklm",
    }

    run = build_run_payload(
        analysis=analysis,
        notebook_url="https://notebooklm.google.com/notebook/nb-1",
        articles=articles,
        flags=["SCRAPE_DEGRADED"],
        run_ts="2026-03-01T12:00:00+04:00",
    )

    assert run["threat_level"] == "MEDIUM"
    assert run["score"] == 55
    assert run["run_id"].startswith("r_")
    assert run["evidence"]["links"] == ["https://a", "https://b"]
    assert len(run["evidence"]["hash"]) > 10
    assert run["flags"] == ["SCRAPE_DEGRADED"]


def test_build_article_rows_maps_city_and_tier():
    run_ts = "2026-03-01T12:00:00+04:00"
    articles = [
        {"source": "A", "title": "Missile warning in Abu Dhabi", "link": "https://x"},
        {"source": "B", "title": "Dubai mall normal operation", "link": "https://y"},
        {"source": "C", "title": "Regional update", "link": "https://z"},
    ]
    rows = build_article_rows(articles=articles, run_ts=run_ts)

    assert rows[0]["city"] == "AD"
    assert rows[0]["tier"] in {"T0", "T1"}
    assert rows[1]["city"] == "DXB"
    assert rows[2]["city"] == "OTHER"
    assert all(r["first_seen_ts"] == run_ts for r in rows)


def test_build_outbox_rows_contains_telegram_and_whatsapp():
    rows = build_outbox_rows(
        report_text="sample report",
        created_ts="2026-03-01T12:00:00+04:00",
        include_whatsapp=True,
    )
    channels = [r["channel"] for r in rows]
    assert channels == ["telegram", "whatsapp"]
    assert all(r["payload"] == "sample report" for r in rows)
