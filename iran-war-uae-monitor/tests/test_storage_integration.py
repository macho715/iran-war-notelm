import sqlite3
from pathlib import Path

from iran_monitor.storage import persist_run


def test_persist_run_writes_json_jsonl_db_outbox_ledger(tmp_path):
    root = tmp_path
    db_path = root / "db" / "iran_monitor.sqlite"
    schema_path = Path(__file__).resolve().parents[1] / "src" / "iran_monitor" / "schema.sql"

    run = {
        "run_id": "r_20260301_120000_abcd1234",
        "run_ts": "2026-03-01T12:00:00+04:00",
        "threat_level": "MEDIUM",
        "score": 45,
        "sentiment": "일반",
        "summary_ad": "Abu Dhabi(MEDIUM): summary",
        "summary_dxb": "Dubai(LOW): summary",
        "delta": {"NEW": ["https://a"], "UPDATED": [], "REMOVED": []},
        "flags": [],
        "evidence": {"links": ["https://a"], "hash": "h1"},
        "notebook_url": "https://notebooklm.google.com/notebook/nb-1",
        "pack_id": "pack_1",
    }
    articles = [
        {
            "canonical_url": "https://a",
            "source": "The National",
            "title": "Alert in Abu Dhabi",
            "city": "AD",
            "tier": "T1",
            "first_seen_ts": run["run_ts"],
            "last_seen_ts": run["run_ts"],
        }
    ]
    outbox_msgs = [
        {"channel": "telegram", "payload": "sample text", "created_ts": run["run_ts"]},
        {"channel": "whatsapp", "payload": "sample text", "created_ts": run["run_ts"]},
    ]

    result = persist_run(
        root,
        db_path,
        schema_path,
        run=run,
        articles=articles,
        outbox_msgs=outbox_msgs,
        notebook_rotation_cap=48,
    )

    report_path = Path(result["report_path"])
    jsonl_path = Path(result["jsonl_path"])
    assert report_path.exists()
    assert jsonl_path.exists()
    assert (root / "ledger").exists()
    assert (root / "state" / "seen_articles.json").exists()

    conn = sqlite3.connect(str(db_path))
    try:
        runs_count = conn.execute("SELECT COUNT(*) FROM runs").fetchone()[0]
        article_count = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
        link_count = conn.execute("SELECT COUNT(*) FROM run_articles").fetchone()[0]
        outbox_count = conn.execute("SELECT COUNT(*) FROM outbox").fetchone()[0]
    finally:
        conn.close()

    assert runs_count == 1
    assert article_count == 1
    assert link_count == 1
    assert outbox_count == 2
