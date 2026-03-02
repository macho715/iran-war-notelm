"""
로컬 reports/*.jsonl 기반 NotebookLM 업로드 이력 분석 (API 불필요)

주의:
- 이 스크립트는 "스캔한 로컬 파일"만 기준으로 집계한다.
- NotebookLM 실제 소스 개수와 불일치할 수 있다(다른 프로젝트/호스트 업로드 가능).
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = ROOT.parent


@dataclass
class RunRecord:
    run_id: str
    run_ts: str
    notebook_url: str
    links: set[str]
    flags: set[str]
    project: str
    source_files: set[str]


def _iter_report_jsonl_files(search_root: Path) -> list[Path]:
    files = []
    for path in search_root.rglob("reports/*.jsonl"):
        normalized = str(path).lower()
        if "storage_template" in normalized:
            continue
        if ".venv" in normalized or "__pycache__" in normalized:
            continue
        files.append(path)
    return sorted(set(files))


def _is_run_snapshot(obj: dict) -> bool:
    return isinstance(obj, dict) and ("run_ts" in obj or "run_id" in obj) and (
        "evidence" in obj or "delta" in obj or "notebook_url" in obj
    )


def _extract_links(run: dict) -> set[str]:
    evidence = run.get("evidence", {})
    delta = run.get("delta", {})
    links = evidence.get("links") or delta.get("NEW") or []
    return {str(x).strip() for x in links if str(x).strip()}


def _extract_flags(run: dict) -> set[str]:
    raw = run.get("flags") or []
    if not isinstance(raw, list):
        return set()
    return {str(x).strip() for x in raw if str(x).strip()}


def _project_name(path: Path, search_root: Path) -> str:
    try:
        rel = path.relative_to(search_root)
    except ValueError:
        return path.parent.name
    parts = rel.parts
    if not parts:
        return "(root)"
    first = parts[0]
    if first == "reports":
        return search_root.name
    return first


def _load_runs(files: Iterable[Path], search_root: Path) -> tuple[dict[str, RunRecord], int]:
    runs: dict[str, RunRecord] = {}
    skipped_non_run = 0

    for file_path in files:
        lines = file_path.read_text(encoding="utf-8").splitlines()
        project = _project_name(file_path, search_root)
        for idx, line in enumerate(lines, start=1):
            raw = line.strip()
            if not raw:
                continue
            try:
                obj = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if not _is_run_snapshot(obj):
                skipped_non_run += 1
                continue

            run_id = str(obj.get("run_id") or f"{file_path}#{idx}")
            run_ts = str(obj.get("run_ts") or "")
            notebook_url = str(obj.get("notebook_url") or "").strip()
            links = _extract_links(obj)
            flags = _extract_flags(obj)

            if run_id not in runs:
                runs[run_id] = RunRecord(
                    run_id=run_id,
                    run_ts=run_ts,
                    notebook_url=notebook_url,
                    links=links,
                    flags=flags,
                    project=project,
                    source_files={str(file_path)},
                )
                continue

            # Merge duplicated run_id across multiple report files.
            existing = runs[run_id]
            if not existing.notebook_url and notebook_url:
                existing.notebook_url = notebook_url
            if not existing.run_ts and run_ts:
                existing.run_ts = run_ts
            existing.links.update(links)
            existing.flags.update(flags)
            existing.source_files.add(str(file_path))

    return runs, skipped_non_run


def main() -> int:
    parser = argparse.ArgumentParser(description="Local NotebookLM upload history checker")
    parser.add_argument(
        "--search-root",
        default=str(WORKSPACE_ROOT),
        help="Root directory to scan recursively for reports/*.jsonl (default: workspace root)",
    )
    args = parser.parse_args()

    search_root = Path(args.search_root).resolve()
    if not search_root.exists():
        print(f"Not found: {search_root}")
        return 1

    files = _iter_report_jsonl_files(search_root)
    if not files:
        print(f"No reports/*.jsonl found under: {search_root}")
        return 1

    runs, skipped_non_run = _load_runs(files, search_root)
    all_runs = sorted(runs.values(), key=lambda r: (r.run_ts, r.run_id))
    uploaded_runs = [r for r in all_runs if r.notebook_url]
    failed_runs = [r for r in all_runs if not r.notebook_url]
    uploaded_links: set[str] = set()
    for r in uploaded_runs:
        uploaded_links.update(r.links)

    print("=== NotebookLM 업로드 이력 (로컬 파일 집계 기준) ===\n")
    print("범위 주의: 이 결과는 스캔한 로컬 reports/*.jsonl만 반영합니다.")
    print("NotebookLM 실제 소스와 차이가 날 수 있습니다(다른 프로젝트/호스트 업로드 가능).\n")
    print(f"search_root: {search_root}")
    print(f"스캔 파일 수: {len(files)}")
    for path in files:
        print(f"  - {path}")

    if skipped_non_run:
        print(f"\n참고: run snapshot 형식이 아닌 jsonl 라인 {skipped_non_run}개는 집계에서 제외됨")

    print(f"\n총 run 수(중복 run_id 병합 후): {len(all_runs)}")
    print(f"업로드 성공(notebook_url 있음): {len(uploaded_runs)} run(s)")
    print(f"업로드 실패(notebook_url 없음): {len(failed_runs)} run(s)")

    by_project: dict[str, list[RunRecord]] = {}
    for r in all_runs:
        by_project.setdefault(r.project, []).append(r)
    print("\n프로젝트별 집계:")
    for project, rows in sorted(by_project.items()):
        ok = sum(1 for r in rows if r.notebook_url)
        print(f"  - {project}: total={len(rows)}, upload_ok={ok}, upload_fail={len(rows)-ok}")

    if uploaded_runs:
        print("\n업로드 성공 run:")
        for r in uploaded_runs:
            print(f"  - [{r.project}] {r.run_ts} | links={len(r.links)} | notebook={r.notebook_url}")

    if failed_runs:
        print("\n업로드 실패 run:")
        for r in failed_runs:
            flags = sorted(r.flags)
            print(f"  - [{r.project}] {r.run_ts} | flags={flags}")

    print(f"\n업로드 성공 run 기준 고유 링크 수: {len(uploaded_links)}")

    overlap_count = 0
    for r in failed_runs:
        overlap = r.links & uploaded_links
        overlap_count += len(overlap)

    if overlap_count > 0:
        print(f"\n⚠️ 업로드 실패 run이 성공했다면 중복 가능 링크: {overlap_count}건")
    else:
        print("\n✅ 업로드 성공 run과 실패 run 간 링크 중복 없음")

    print("\n권장: NotebookLM 실제 상태와 대조하려면 아래 스크립트를 함께 실행하세요.")
    print(f"  python {ROOT / 'scripts' / 'check_notebooklm_duplicates.py'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
