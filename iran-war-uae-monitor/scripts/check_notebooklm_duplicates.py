"""
NotebookLM 소스 중복 체크 스크립트

- 노트북 내 소스 목록 조회
- 각 소스에서 기사 링크 추출
- 동일 링크가 여러 소스에 있는지 검사
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from notebooklm_tools.core.auth import AuthManager
from notebooklm_tools.core.client import NotebookLMClient

NOTEBOOK_ID_FILE = ROOT / ".notebooklm_id"
LINK_PATTERN = re.compile(r"링크:\s*(https?://[^\s\n]+)", re.IGNORECASE)


def extract_links_from_text(text: str) -> list[str]:
    """텍스트에서 '링크: URL' 패턴 추출"""
    return list(set(LINK_PATTERN.findall(text)))


def main() -> int:
    if not NOTEBOOK_ID_FILE.exists():
        print(f"ERROR: {NOTEBOOK_ID_FILE} not found")
        return 1

    notebook_id = NOTEBOOK_ID_FILE.read_text(encoding="utf-8").strip()
    if not notebook_id:
        print("ERROR: notebook ID is empty")
        return 1

    print(f"Notebook ID: {notebook_id}")
    print("Connecting to NotebookLM...")

    try:
        auth = AuthManager()
        profile = auth.load_profile()
        client = NotebookLMClient(
            cookies=profile.cookies,
            csrf_token=profile.csrf_token,
            session_id=profile.session_id,
        )
    except Exception as e:
        print(f"ERROR: Auth failed: {e}")
        return 1

    with client:
        try:
            sources = client.get_notebook_sources_with_types(notebook_id)
        except Exception as e:
            print(f"ERROR: list sources failed: {e}")
            return 1

        if not sources:
            print("No sources found. Notebook may be empty.")
            return 0

        print(f"\nFound {len(sources)} source(s)")

        # source_id -> (title, links)
        source_links: dict[str, tuple[str, list[str]]] = {}
        # link -> [source_ids]
        link_to_sources: dict[str, list[str]] = {}

        for src in sources:
            if isinstance(src, dict):
                src_id = src.get("id") or src.get("source_id") or ""
                title = src.get("title") or src.get("name") or "(no title)"
            else:
                src_id = getattr(src, "id", None) or getattr(src, "source_id", str(src))
                title = getattr(src, "title", "") or getattr(src, "name", "") or "(no title)"

            try:
                fulltext_obj = client.get_source_fulltext(src_id)
                fulltext = (
                    str(fulltext_obj.get("text", "") or fulltext_obj.get("content", ""))
                    if isinstance(fulltext_obj, dict)
                    else str(fulltext_obj)
                )
            except Exception as e:
                print(f"  WARN: Could not get fulltext for {title}: {e}")
                fulltext = ""

            links = extract_links_from_text(fulltext)
            source_links[src_id] = (title, links)

            for link in links:
                link_to_sources.setdefault(link, []).append(src_id)

        # Report
        print("\n--- Source summary ---")
        for src_id, (title, links) in source_links.items():
            print(f"  [{title}]: {len(links)} links")

        # Duplicate check
        duplicates = {k: v for k, v in link_to_sources.items() if len(v) > 1}
        if duplicates:
            print(f"\n--- DUPLICATE LINKS ({len(duplicates)} links in multiple sources) ---")
            for link, src_ids in list(duplicates.items())[:10]:
                titles = [source_links[sid][0] for sid in src_ids]
                print(f"  {link[:60]}...")
                print(f"    -> {titles}")
            if len(duplicates) > 10:
                print(f"  ... and {len(duplicates) - 10} more")
        else:
            print("\n--- No duplicate links across sources ---")

        total_links = len(link_to_sources)
        unique_in_sources = sum(len(links) for _, links in source_links.values())
        print(f"\nTotal unique links: {total_links}")
        print(f"Total link occurrences in sources: {unique_in_sources}")
        if unique_in_sources > total_links:
            print(f"  -> {unique_in_sources - total_links} duplicate occurrences")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
