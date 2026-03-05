#!/usr/bin/env python3
"""
On-demand NotebookLM actions (report summary, podcast, slides) via notebooklm-mcp-cli.

This utility supports execution-only mode for dry-run and returns a JSON contract
for both success and failure.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _check_nlm_available() -> tuple[bool, str]:
    """Return (ok, error_message)."""
    nlm = shutil.which("nlm")
    if not nlm:
        return False, (
            "notebooklm-mcp-cli (nlm) not found in PATH. "
            "Install: pip install notebooklm-mcp-cli or uv tool install notebooklm-mcp-cli. "
            "Then run 'nlm login'. See docs/CURSOR_MCP_SETUP.md"
        )
    try:
        r = subprocess.run(
            [nlm, "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if r.returncode != 0 and "login" in (r.stderr or "").lower():
            return False, (
                "nlm login may have expired. Run 'nlm login' and retry. "
                "See docs/runbooks/NOTEBOOKLM_MCP_RUNBOOK.md (인증 갱신)."
            )
    except subprocess.TimeoutExpired:
        return False, "nlm --help timed out. Check notebooklm-mcp-cli installation."
    except Exception as e:  # pragma: no cover - defensive
        return False, f"nlm check failed: {e}. Run 'nlm login' if needed. See docs/CURSOR_MCP_SETUP.md"
    return True, ""


def _read_default_notebook_id(root: Path) -> str | None:
    path = root / ".notebooklm_id"
    if not path.exists():
        return None
    try:
        value = path.read_text(encoding="utf-8").strip()
        return value or None
    except Exception:
        return None


def _read_notebook_id_from_env() -> str | None:
    """Return notebook ID from NOTEBOOKLM_NOTEBOOK_ID environment variable, if set."""
    raw = os.environ.get("NOTEBOOKLM_NOTEBOOK_ID", "").strip()
    return _to_notebook_id(raw) if raw else None


def _to_notebook_id(raw: str | None) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    if not raw:
        return None
    marker = "/notebook/"
    if marker in raw:
        raw = raw.rsplit(marker, 1)[-1]
    return raw.split("?", 1)[0].strip("/\t \n\r") or None


def _make_result(
    *,
    ok: bool,
    run_id: str,
    action: str,
    notebook_id: str | None,
    source_id: str | None,
    details: str | None = None,
    notebook_url: str | None = None,
    command: list[str] | None = None,
    error: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "ok": ok,
        "run_id": run_id,
        "action": action,
    }
    if ok:
        payload.update(
            {
                "notebook_id": notebook_id,
                "source_id": source_id,
                "notebook_url": notebook_url,
            }
        )
    else:
        payload.update(
            {
                "error": error or "unknown error",
                "details": details,
                "notebook_id": notebook_id,
                "source_id": source_id,
            }
        )
    if command is not None:
        payload["command"] = command
    return payload


def _print_result(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False))


def _make_run_id(prefix: str = "notebooklm") -> str:
    return f"{prefix}_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"


def _build_command(
    nlm: str,
    action: str,
    notebook_id: str,
    source_id: str | None,
    use_mcp: bool,
) -> list[str]:
    command_map = {
        "report": ["report", "create"],
        "podcast": ["audio", "create"],
        "slides": ["slides", "create"],
    }
    cmd = [nlm, *command_map[action], notebook_id]
    if source_id:
        cmd.extend(["--source-ids", source_id])
    if action == "report":
        cmd.extend(["--format", "Briefing Doc", "--confirm", "-y"])
    elif action == "podcast":
        cmd.extend(["--format", "deep_dive", "--confirm", "-y"])
    else:
        cmd.extend(["--format", "detailed_deck", "--confirm", "-y"])

    if use_mcp:
        # keep explicit branch for observability; command itself is still nlm CLI.
        cmd.append("--ai")
    return cmd


def main() -> int:
    parser = argparse.ArgumentParser(
        description="On-demand NotebookLM actions (report, podcast, slides) via nlm CLI."
    )
    parser.add_argument(
        "--action",
        choices=["report", "podcast", "slides"],
        default="report",
        help="Action: report (summary), podcast, or slides (default: report)",
    )
    parser.add_argument(
        "--notebook-id",
        default=None,
        help="Notebook ID (optional; else uses .notebooklm_id)",
    )
    parser.add_argument(
        "--source-id",
        default=None,
        help="Source ID to scope generation (optional; otherwise 전체 소스 사용)",
    )
    parser.add_argument(
        "--use-mcp",
        action="store_true",
        help="Use MCP-oriented execution mode (uses nlm CLI with MCP-compatible arguments)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not call NotebookLM; only validate args and print action plan.",
    )
    parser.add_argument(
        "--run-id",
        default=None,
        help="Optional run correlation id (for dashboard/operator trace).",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    run_id = args.run_id or _make_run_id("notebooklm_on_demand")
    notebook_id = (
        _to_notebook_id(args.notebook_id)
        or _read_default_notebook_id(root)
        or _read_notebook_id_from_env()
    )
    if not notebook_id:
        if not args.dry_run:
            _print_result(
                _make_result(
                    ok=False,
                    run_id=run_id,
                    action=args.action,
                    notebook_id=None,
                    source_id=args.source_id,
                    error=(
                        "notebook_id is required when source-id is not enough. "
                        "Run 'python main.py' once to generate .notebooklm_id or provide --notebook-id."
                    ),
                )
            )
            return 1
        notebook_id = "DRY_RUN_PLACEHOLDER"

    if args.dry_run:
        cmd = _build_command(
            nlm="nlm",
            action=args.action,
            notebook_id=notebook_id,
            source_id=args.source_id,
            use_mcp=args.use_mcp,
        )
        print(
            "DRY-RUN: action plan generated\n"
            f"run_id={run_id}\n"
            f"action={args.action}\n"
            f"notebook_id={notebook_id}\n"
            f"source_id={args.source_id or '<none>'}\n"
            f"mode={'mcp' if args.use_mcp else 'auto'}\n"
            f"command={ ' '.join(cmd) }",
            file=sys.stderr,
        )
        _print_result(
            _make_result(
                ok=True,
                run_id=run_id,
                action=args.action,
                notebook_id=notebook_id,
                source_id=args.source_id,
                notebook_url=f"https://notebooklm.google.com/notebook/{notebook_id}",
                command=cmd,
            )
        )
        return 0

    ok, err = _check_nlm_available()
    if not ok:
        _print_result(
            _make_result(
                ok=False,
                run_id=run_id,
                action=args.action,
                notebook_id=notebook_id,
                source_id=args.source_id,
                error=err,
            )
        )
        return 1

    nlm = shutil.which("nlm")
    if not nlm:
        _print_result(
            _make_result(
                ok=False,
                run_id=run_id,
                action=args.action,
                notebook_id=notebook_id,
                source_id=args.source_id,
                error=(
                    "nlm command not found. Install notebooklm-mcp-cli and run 'nlm login'. "
                    "See docs/CURSOR_MCP_SETUP.md"
                ),
            )
        )
        return 1

    cmd = _build_command(
        nlm=nlm,
        action=args.action,
        notebook_id=notebook_id,
        source_id=args.source_id,
        use_mcp=args.use_mcp,
    )
    timeout = int(os.environ.get("NOTEBOOKLM_ON_DEMAND_TIMEOUT_SEC", "300"))

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if result.returncode != 0:
            _print_result(
                _make_result(
                    ok=False,
                    run_id=run_id,
                    action=args.action,
                    notebook_id=notebook_id,
                    source_id=args.source_id,
                    command=cmd,
                    details=(result.stderr or result.stdout or "").strip(),
                    error=f"nlm exited with code {result.returncode}",
                )
            )
            return result.returncode

        if result.stderr:
            print(result.stderr.strip(), file=sys.stderr)
        _print_result(
            _make_result(
                ok=True,
                run_id=run_id,
                action=args.action,
                notebook_id=notebook_id,
                source_id=args.source_id,
                notebook_url=f"https://notebooklm.google.com/notebook/{notebook_id}",
                command=cmd,
            )
        )
        return 0
    except FileNotFoundError:
        _print_result(
            _make_result(
                ok=False,
                run_id=run_id,
                action=args.action,
                notebook_id=notebook_id,
                source_id=args.source_id,
                error=(
                    "nlm command not found. Install notebooklm-mcp-cli and run 'nlm login'. "
                    "See docs/CURSOR_MCP_SETUP.md"
                ),
            )
        )
        return 1
    except subprocess.TimeoutExpired:
        _print_result(
            _make_result(
                ok=False,
                run_id=run_id,
                action=args.action,
                notebook_id=notebook_id,
                source_id=args.source_id,
                error="NotebookLM command timed out. Check network and nlm login.",
            )
        )
        return 1
    except Exception as e:  # pragma: no cover - defensive
        _print_result(
            _make_result(
                ok=False,
                run_id=run_id,
                action=args.action,
                notebook_id=notebook_id,
                source_id=args.source_id,
                error=f"Error running nlm: {e}. See docs/runbooks/NOTEBOOKLM_MCP_RUNBOOK.md",
            )
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
