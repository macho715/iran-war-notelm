from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from iran_monitor.app import hourly_job


if __name__ == "__main__":
    asyncio.run(hourly_job())
