import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "backup_urgentdash.py"
EXAMPLE_SNAPSHOT = ROOT / "urgentdash" / "urgentdash_snapshot.example.json"


def _run_backup(args: list[str], *, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(ROOT),
        env=merged_env,
        timeout=20,
    )


def _line_value(output: str, prefix: str) -> str | None:
    for line in output.splitlines():
        if line.startswith(prefix):
            return line[len(prefix) :].strip()
    return None


def test_backup_urgentdash_help_includes_dry_run():
    r = _run_backup(["--help"])
    output = f"{r.stdout}\n{r.stderr}"
    assert r.returncode == 0
    assert "--dry-run" in output


def test_backup_urgentdash_dry_run_validates_and_does_not_write(tmp_path: Path):
    r = _run_backup(
        [str(EXAMPLE_SNAPSHOT), "--dry-run"],
        env={"STORAGE_ROOT": str(tmp_path)},
    )
    output = f"{r.stdout}\n{r.stderr}"
    assert r.returncode == 0
    assert "Dry-run OK:" in output
    assert "Would save:" in output
    assert "Would append:" in output
    assert not (tmp_path / "urgentdash_snapshots").exists()


def test_backup_urgentdash_real_run_writes_json_and_jsonl(tmp_path: Path):
    r = _run_backup([str(EXAMPLE_SNAPSHOT)], env={"STORAGE_ROOT": str(tmp_path)})
    output = f"{r.stdout}\n{r.stderr}"
    assert r.returncode == 0

    saved = _line_value(output, "Saved:")
    appended = _line_value(output, "Appended:")
    assert saved is not None
    assert appended is not None

    json_path = Path(saved)
    jsonl_path = Path(appended)
    assert json_path.exists()
    assert json_path.name.endswith("-00.json")
    assert jsonl_path.exists()
    assert json_path.parts[-3] == "urgentdash_snapshots"
    assert jsonl_path.parent.name == "urgentdash_snapshots"
    lines = jsonl_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) >= 1


def test_backup_urgentdash_missing_required_key_fails(tmp_path: Path):
    payload = json.loads(EXAMPLE_SNAPSHOT.read_text(encoding="utf-8"))
    payload.pop("checklist", None)
    bad = tmp_path / "bad_snapshot.json"
    bad.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    r = _run_backup([str(bad), "--dry-run"], env={"STORAGE_ROOT": str(tmp_path)})
    output = f"{r.stdout}\n{r.stderr}"
    assert r.returncode != 0
    assert "missing required top-level key" in output
    assert "checklist" in output
