"""
Runtime path diagnostic helper.

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
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
    main_file = root / "main.py"
    rss_module = importlib.import_module("scrapers.rss_feed")
    return {
        "cwd": str(Path.cwd().resolve()),
        "canonical_root": str(root),
        "main_file": str(main_file.resolve()),
        "rss_feed_file": str(Path(rss_module.__file__).resolve()),
    }


if __name__ == "__main__":
    print(json.dumps(get_runtime_paths(), ensure_ascii=False, indent=2))
