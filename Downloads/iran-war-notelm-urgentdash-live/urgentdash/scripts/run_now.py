#!/usr/bin/env python
"""Canonical one-shot runner with optional dry-run."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for base in [here.parent, *here.parents]:
        if (base / "src").is_dir() and (base / "main.py").exists():
            return base
    return here.parents[2]


ROOT = _repo_root()
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import main as _main


_run_once = _main._run_once


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run monitor one cycle")
    parser.add_argument("--dry-run", action="store_true", help="Run once without outbound send")
    parser.add_argument("--telegram-send", action="store_true", help="Skip approval gate and send immediately")
    parser.add_argument("--json-archive", action="store_true", help="Force JSON archive on")
    parser.add_argument("--json-archive-off", action="store_true", help="Force JSON archive off")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    json_archive = True if args.json_archive else (False if args.json_archive_off else None)
    _run_once(telegram_send=args.telegram_send, dry_run=args.dry_run, json_archive=json_archive)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
