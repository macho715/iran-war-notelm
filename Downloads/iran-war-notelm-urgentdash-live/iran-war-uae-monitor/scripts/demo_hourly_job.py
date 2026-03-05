from __future__ import annotations

from pathlib import Path

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from iran_monitor.storage import iso_now, make_run_id, persist_run, sha1_hex

DB_PATH = ROOT / "db" / "iran_monitor.sqlite"
SCHEMA_PATH = ROOT / "src" / "iran_monitor" / "schema.sql"


def main() -> None:
    run_ts = iso_now()
    run_id = make_run_id(run_ts)

    articles = [
        {
            "canonical_url": "https://example.com/article/1",
            "source": "ExampleWire",
            "title": "Sample incident update",
            "city": "AD",
            "tier": "T1",
            "first_seen_ts": run_ts,
            "last_seen_ts": run_ts,
        },
        {
            "canonical_url": "https://example.com/article/2",
            "source": "ExampleLocal",
            "title": "Operations notice",
            "city": "DXB",
            "tier": "T2",
            "first_seen_ts": run_ts,
            "last_seen_ts": run_ts,
        },
    ]

    evidence_links = [a["canonical_url"] for a in articles]
    evidence_hash = sha1_hex("".join(sorted(evidence_links)))

    run = {
        "run_id": run_id,
        "run_ts": run_ts,
        "threat_level": "MED",
        "score": 45,
        "sentiment": "neutral",
        "summary_ad": "Abu Dhabi: no verified critical changes.",
        "summary_dxb": "Dubai: monitoring ongoing.",
        "delta": {"NEW": evidence_links, "UPDATED": [], "REMOVED": []},
        "flags": [],
        "evidence": {"links": evidence_links, "hash": evidence_hash},
        "notebook_url": "https://notebooklm.google.com/notebook/EXAMPLE",
        "pack_id": f"pack_{run_id}",
    }

    # outbox: write payload elsewhere; here we just queue
    outbox_msgs = [
        {
            "channel": "telegram",
            "payload": f"[{run_ts}] threat={run['threat_level']} score={run['score']}\n{run['summary_ad']}\n{run['summary_dxb']}",
        }
    ]

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
