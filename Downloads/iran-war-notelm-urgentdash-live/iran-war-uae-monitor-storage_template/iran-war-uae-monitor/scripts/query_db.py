from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "db" / "iran_monitor.sqlite"


def main() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT run_ts, threat_level, score, substr(run_id,1,24) AS run_id_short
            FROM runs
            ORDER BY run_ts DESC
            LIMIT 10
            """
        ).fetchall()
        for r in rows:
            print(f"{r['run_ts']} | {r['threat_level']} | {r['score']} | {r['run_id_short']}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
