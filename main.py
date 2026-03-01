"""
Deprecated compatibility wrapper.

Canonical runtime has moved to:
  C:\\Users\\jichu\\Downloads\\iran-war-notelm-main\\iran-war-uae-monitor
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    legacy_root = Path(__file__).resolve().parent
    canonical_root = legacy_root / "iran-war-uae-monitor"
    target = canonical_root / "scripts" / "run_monitor.py"

    if not target.exists():
        print(f"[DEPRECATED] canonical entrypoint not found: {target}")
        return 1

    print(
        "[DEPRECATED] This root entrypoint is compatibility-only. "
        f"Forwarding to canonical runtime: {canonical_root}"
    )
    return subprocess.call([sys.executable, str(target)], cwd=str(canonical_root))


if __name__ == "__main__":
    raise SystemExit(main())
