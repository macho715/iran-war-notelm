"""Tests for scripts/notebooklm_on_demand.py (--help and --dry-run only; no NotebookLM calls)."""

import json
import subprocess
import sys


def _run(args):
    return subprocess.run(
        [sys.executable, "scripts/notebooklm_on_demand.py", *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=10,
        cwd=None,
    )


def _result_from_outputs(*, r) -> dict:
    merged = f"{r.stdout}\n{r.stderr}".strip()
    for line in merged.splitlines()[::-1]:
        line = line.strip()
        if line.startswith("{"):
            return json.loads(line)
    return {}


def test_notebooklm_on_demand_help():
    """Script must exit 0 and print help."""
    r = _run(["--help"])
    output = (r.stdout or "") + (r.stderr or "")
    assert r.returncode == 0
    assert "action" in output or "--action" in output
    assert "report" in output or "podcast" in output
    assert "dry-run" in output or "dry_run" in output


def test_notebooklm_on_demand_dry_run():
    """Script with --dry-run must exit 0 and not call NotebookLM."""
    r = _run(["--action", "report", "--dry-run"])
    output = (r.stdout or "") + (r.stderr or "")
    assert r.returncode == 0
    assert "DRY-RUN" in output or "dry" in output.lower()
    data = _result_from_outputs(r=r)
    assert data and data.get("ok") is True
    assert data.get("action") == "report"


def test_notebooklm_on_demand_dry_run_podcast():
    """Script with --action podcast --dry-run must exit 0."""
    r = _run(["--action", "podcast", "--dry-run"])
    assert r.returncode == 0
    data = _result_from_outputs(r=r)
    assert data and data.get("ok") is True


def test_notebooklm_on_demand_dry_run_mcp_mode():
    """--use-mcp + --source-id with dry-run prints MCP execution plan."""
    r = _run(["--action", "report", "--use-mcp", "--source-id", "src-123", "--dry-run"])
    output = (r.stdout or "") + (r.stderr or "")
    assert r.returncode == 0
    assert "mode=mcp" in output
    data = _result_from_outputs(r=r)
    assert data and data.get("ok") is True
    assert data.get("source_id") == "src-123"


def test_notebooklm_on_demand_invalid_action_rejected():
    """Invalid action should return parser error with non-zero exit."""
    r = _run(["--action", "invalid"])
    assert r.returncode != 0
