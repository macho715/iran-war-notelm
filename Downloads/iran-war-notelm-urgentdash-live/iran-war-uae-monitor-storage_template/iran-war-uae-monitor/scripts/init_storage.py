from __future__ import annotations

from pathlib import Path

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from iran_monitor.storage import connect_sqlite, ensure_layout, init_db

DB_PATH = ROOT / "db" / "iran_monitor.sqlite"
SCHEMA_PATH = ROOT / "src" / "iran_monitor" / "schema.sql"


def main() -> None:
    ensure_layout(ROOT)
    conn = connect_sqlite(DB_PATH)
    try:
        init_db(conn, SCHEMA_PATH)
        print(f"OK: initialized db at {DB_PATH}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
