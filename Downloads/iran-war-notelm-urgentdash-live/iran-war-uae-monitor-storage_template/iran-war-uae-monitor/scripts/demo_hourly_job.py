from __future__ import annotations

from pathlib import Path

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from iran_monitor.storage import persist_run
from iran_monitor.storage_adapter import build_article_rows, build_outbox_rows, build_run_payload

DB_PATH = ROOT / "db" / "iran_monitor.sqlite"
SCHEMA_PATH = ROOT / "src" / "iran_monitor" / "schema.sql"


def main() -> None:
    raw_articles = [
        {
            "source": "ExampleWire",
            "title": "Sample incident update",
            "link": "https://example.com/article/1",
        },
        {
            "source": "ExampleLocal",
            "title": "Operations notice",
            "link": "https://example.com/article/2",
        },
    ]

    analysis = {
        "threat_level": "MEDIUM",
        "threat_score": 45,
        "sentiment": "neutral",
        "abu_dhabi_level": "MEDIUM",
        "dubai_level": "LOW",
        "summary": "Abu Dhabi and Dubai updates are being monitored.",
    }
    run = build_run_payload(
        analysis=analysis,
        notebook_url="https://notebooklm.google.com/notebook/EXAMPLE",
        articles=raw_articles,
        flags=[],
    )
    articles = build_article_rows(articles=raw_articles, run_ts=run["run_ts"])

    report_text = (
        f"[{run['run_ts']}] threat={run['threat_level']} score={run['score']}\n"
        f"{run['summary_ad']}\n{run['summary_dxb']}"
    )
    outbox_msgs = build_outbox_rows(report_text=report_text, created_ts=run["run_ts"], include_whatsapp=True)

    result = persist_run(
        ROOT,
        DB_PATH,
        SCHEMA_PATH,
        run=run,
        articles=articles,
        outbox_msgs=outbox_msgs,
        notebook_rotation_cap=48,
    )
    print("OK:", result)


if __name__ == "__main__":
    main()
