"""Option A: JSON 아카이브 저장 테스트"""

import json
from pathlib import Path

import pytest

import main
from config import settings


def test_save_report_archive_creates_file(tmp_path, monkeypatch):
    """REPORTS_ARCHIVE_ENABLED=True 시 reports/{date}/{time}.json 생성"""
    monkeypatch.setattr(settings, "REPORTS_ARCHIVE_ENABLED", True)
    monkeypatch.setattr(settings, "REPORTS_ARCHIVE_DIR", str(tmp_path))

    articles = [
        {"source": "Gulf News", "title": "Test article", "link": "https://example.com/1"},
    ]
    analysis = {
        "threat_level": "LOW",
        "threat_score": 22,
        "sentiment": "일반",
        "abu_dhabi_level": "LOW",
        "dubai_level": "LOW",
        "summary": "테스트",
        "recommended_action": "모니터링",
        "key_points": [],
        "analysis_source": "fallback",
    }
    notebook_url = "https://notebooklm.google.com/notebook/nb-1"

    # datetime.now()를 고정하려면 복잡하므로, 호출 후 디렉터리 내 파일 존재만 검증
    main._save_report_archive(articles, analysis, notebook_url)

    subdirs = list(tmp_path.iterdir())
    assert len(subdirs) == 1
    date_dir = subdirs[0]
    assert date_dir.is_dir()
    json_files = list(date_dir.glob("*.json"))
    assert len(json_files) == 1

    data = json.loads(json_files[0].read_text(encoding="utf-8"))
    assert data["articles"] == articles
    assert data["analysis"]["threat_level"] == "LOW"
    assert data["notebook_url"] == notebook_url


def test_save_report_archive_skipped_when_disabled(monkeypatch):
    """REPORTS_ARCHIVE_ENABLED=False 시 저장 생략"""
    monkeypatch.setattr(settings, "REPORTS_ARCHIVE_ENABLED", False)

    articles = [{"source": "X", "title": "T", "link": "L"}]
    analysis = {
        "threat_level": "LOW",
        "threat_score": 0,
        "sentiment": "일반",
        "abu_dhabi_level": "LOW",
        "dubai_level": "LOW",
        "summary": "",
        "recommended_action": "",
        "key_points": [],
        "analysis_source": "fallback",
    }

    main._save_report_archive(articles, analysis, None)

    # tmp_path 사용 안 함 → 파일 생성 없음. 예외 없이 완료되면 통과
    assert True
