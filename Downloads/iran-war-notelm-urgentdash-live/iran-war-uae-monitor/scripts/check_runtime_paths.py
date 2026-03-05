"""
Runtime path diagnostic helper for canonical project.

Usage:
  python scripts/check_runtime_paths.py
"""

from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path


def get_runtime_paths() -> dict[str, str]:
    root = Path(__file__).resolve().parents[1]
    src = root / "src"
    if str(src) not in sys.path:
        sys.path.insert(0, str(src))

    app_module = importlib.import_module("iran_monitor.app")
    rss_module = importlib.import_module("iran_monitor.scrapers.rss_feed")
    return {
        "cwd": str(Path.cwd().resolve()),
        "canonical_root": str(root.resolve()),
        "main_file": str(Path(app_module.__file__).resolve()),
        "rss_feed_file": str(Path(rss_module.__file__).resolve()),
    }


if __name__ == "__main__":
    print(json.dumps(get_runtime_paths(), ensure_ascii=False, indent=2))
