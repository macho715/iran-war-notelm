"""
실시간 이란-UAE 전황 모니터링 시스템 (Full Pipeline)
=======================================================
1. UAE 언론(Gulf News, Khaleej Times, The National) 및 SNS 실시간 스크랩
2. 중복 제거 후 NotebookLM에 자동 업로드
3. Phase 2 AI 분석(위협/감성/도시별 리스크)
4. HIGH/CRITICAL 즉시 경보 + 정기 보고
5. 매시간 자동 반복 (APScheduler)
"""

import asyncio
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from notebooklm_tools.core.auth import AuthManager
from notebooklm_tools.core.client import NotebookLMClient

from config import settings
from phase2_ai import (
    AnalysisResult,
    analyze_with_notebooklm_or_fallback,
    fallback_analyze,
    should_send_immediate_alert,
)
from reporter import send_telegram_alert, send_telegram_report
from scrapers.social_media import scrape_social_media
from scrapers.uae_media import scrape_uae_media

logger = structlog.get_logger()

# ─── 상태 관리: 이미 보고한 기사를 추적 (중복 방지) ───────────────────────────
_seen_hashes: set[str] = set()

# NotebookLM 노트북 ID를 파일에 저장해서 재시작해도 동일 프로젝트 재사용
NOTEBOOKLM_ID_FILE = Path(".notebooklm_id")
NOTEBOOK_TITLE = "실시간 이란-UAE 보안 브리핑 (자동화)"


def _article_hash(article: dict) -> str:
    """기사 제목+링크 기반 고유 해시 생성"""
    key = (article.get("title", "") + article.get("link", "")).strip().lower()
    return hashlib.md5(key.encode()).hexdigest()


def _filter_new(articles: list[dict]) -> list[dict]:
    """이전에 보고하지 않은 새 기사만 반환"""
    new = []
    for a in articles:
        h = _article_hash(a)
        if h not in _seen_hashes:
            _seen_hashes.add(h)
            new.append(a)
    return new


def _load_notebook_id() -> str | None:
    """파일에서 저장된 노트북 ID 읽기"""
    if NOTEBOOKLM_ID_FILE.exists():
        nb_id = NOTEBOOKLM_ID_FILE.read_text(encoding="utf-8").strip()
        if nb_id:
            return nb_id
    return None


def _save_notebook_id(nb_id: str) -> None:
    """노트북 ID를 파일에 저장 (재시작해도 유지)"""
    NOTEBOOKLM_ID_FILE.write_text(nb_id, encoding="utf-8")
    logger.info("노트북 ID 파일 저장", id=nb_id)


def _extract_id(obj: Any) -> str:
    """Notebook/Source 오브젝트에서 id 추출"""
    if isinstance(obj, dict):
        return obj.get("notebook_id") or obj.get("id", str(obj))
    if hasattr(obj, "model_dump"):
        d = obj.model_dump()
        return d.get("notebook_id") or d.get("id", str(obj))
    if hasattr(obj, "dict"):
        d = obj.dict()
        return d.get("notebook_id") or d.get("id", str(obj))
    return getattr(obj, "id", None) or getattr(obj, "notebook_id", str(obj))


def _create_notebook_client() -> NotebookLMClient:
    """NotebookLM 인증 세션으로 클라이언트 생성"""
    auth = AuthManager()
    profile = auth.load_profile()
    return NotebookLMClient(
        cookies=profile.cookies,
        csrf_token=profile.csrf_token,
        session_id=profile.session_id,
    )


def _get_or_create_notebook(client: NotebookLMClient) -> str:
    """파일→목록 검색→신규생성 순으로 단일 노트북 유지"""
    nb_id = _load_notebook_id()
    if nb_id:
        logger.info("저장된 NotebookLM 노트북 ID 재사용", id=nb_id)
        return nb_id

    try:
        notebooks = client.list_notebooks()
        matched: list[str] = []
        for nb in notebooks:
            nb_title = getattr(nb, "title", "") or ""
            if NOTEBOOK_TITLE in nb_title or "이란-UAE" in nb_title:
                matched.append(_extract_id(nb))

        if matched:
            nb_id = matched[0]
            for dup_id in matched[1:]:
                try:
                    client.delete_notebook(dup_id)
                    logger.info("중복 NotebookLM 노트북 삭제", id=dup_id)
                except Exception:
                    pass
            logger.info("기존 NotebookLM 노트북 선택", id=nb_id)
            _save_notebook_id(nb_id)
            return nb_id
    except Exception as e:
        logger.warning("노트북 목록 조회 실패", error=str(e))

    nb = client.create_notebook(NOTEBOOK_TITLE)
    nb_id = _extract_id(nb)
    logger.info("새 NotebookLM 노트북 생성", id=nb_id)
    _save_notebook_id(nb_id)
    return nb_id


def _upload_to_notebooklm(articles: list[dict]) -> dict[str, str] | None:
    """
    기사 목록을 텍스트 소스로 NotebookLM에 업로드.
    반환: {"notebook_id": str, "source_id": str, "notebook_url": str}
    """
    if not articles:
        return None

    try:
        with _create_notebook_client() as client:
            nb_id = _get_or_create_notebook(client)
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            content_lines = [f"# UAE 이란 전황 업데이트 — {now_str}\n"]
            for a in articles:
                content_lines.append(f"**[{a['source']}]** {a['title']}\n링크: {a['link']}\n")
            content = "\n".join(content_lines)

            source = client.add_text_source(nb_id, content, title=f"업데이트 {now_str}")
            source_id = _extract_id(source)
            client.wait_for_source_ready(nb_id, source_id)
            logger.info("NotebookLM 소스 업로드 완료", source_id=source_id)
            return {
                "notebook_id": nb_id,
                "source_id": source_id,
                "notebook_url": f"https://notebooklm.google.com/notebook/{nb_id}",
            }
    except Exception as e:
        logger.warning("NotebookLM 업로드 실패", error=str(e))
        return None


def _fallback_analysis(articles: list[dict]) -> AnalysisResult:
    return fallback_analyze(
        articles,
        threshold_medium=settings.THREAT_THRESHOLD_MEDIUM,
        threshold_high=settings.THREAT_THRESHOLD_HIGH,
        threshold_critical=settings.THREAT_THRESHOLD_CRITICAL,
    )


def _analyze_phase2(articles: list[dict], notebook_context: dict[str, str] | None) -> AnalysisResult:
    """Phase 2 분석: NotebookLM query 우선, 실패 시 fallback."""
    if not settings.PHASE2_ENABLED:
        return _fallback_analysis(articles)

    notebook_id = (notebook_context or {}).get("notebook_id")
    if not notebook_id:
        return _fallback_analysis(articles)

    try:
        with _create_notebook_client() as client:
            return analyze_with_notebooklm_or_fallback(
                client=client,
                notebook_id=notebook_id,
                articles=articles,
                timeout=float(settings.PHASE2_QUERY_TIMEOUT_SEC),
                language=settings.PHASE2_REPORT_LANGUAGE,
                threshold_medium=settings.THREAT_THRESHOLD_MEDIUM,
                threshold_high=settings.THREAT_THRESHOLD_HIGH,
                threshold_critical=settings.THREAT_THRESHOLD_CRITICAL,
            )
    except Exception as e:
        logger.warning("Phase2 NotebookLM 분석 실패, fallback 전환", error=str(e))
        return _fallback_analysis(articles)


def _build_immediate_alert_message(analysis: AnalysisResult, notebook_url: str | None = None) -> str:
    lines = [
        f"🚨 즉시 경보: UAE 위협 레벨 {analysis['threat_level']} ({analysis['threat_score']}/100)",
        f"감성: {analysis['sentiment']}",
        f"아부다비: {analysis['abu_dhabi_level']} | 두바이: {analysis['dubai_level']}",
        f"권고: {analysis['recommended_action']}",
    ]
    if notebook_url:
        lines.append(f"NotebookLM: {notebook_url}")
    return "\n".join(lines)


def _maybe_create_podcast_scaffold(notebook_context: dict[str, str] | None) -> None:
    """Phase2 팟캐스트 스캐폴드: 생성 요청만 하고 배포/전송은 하지 않음."""
    if not settings.PHASE2_PODCAST_ENABLED:
        return

    notebook_id = (notebook_context or {}).get("notebook_id")
    if not notebook_id:
        logger.warning("팟캐스트 스캐폴드 생략: notebook_id 없음")
        return

    try:
        with _create_notebook_client() as client:
            result = client.create_audio_overview(
                notebook_id=notebook_id,
                language=settings.PHASE2_REPORT_LANGUAGE if settings.PHASE2_REPORT_LANGUAGE else "ko",
                focus_prompt="UAE resident safety daily audio briefing",
            )
            logger.info(
                "Phase2 팟캐스트 스캐폴드 생성 요청 완료",
                artifact_id=(result or {}).get("artifact_id") if isinstance(result, dict) else None,
            )
    except Exception as e:
        logger.warning("Phase2 팟캐스트 스캐폴드 실패", error=str(e))


# ─── 메인 파이프라인 ─────────────────────────────────────────────────────────

async def hourly_job() -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    logger.info(f"🚨 [{now}] 이란 전쟁 UAE 모니터링 시작")

    try:
        logger.info("뉴스 스크랩 시작...")
        try:
            uae_articles, social_articles = await asyncio.gather(
                scrape_uae_media(),
                scrape_social_media(),
                return_exceptions=True,
            )
        except Exception as e:
            logger.error("스크랩 실패", error=str(e))
            uae_articles, social_articles = [], []

        if isinstance(uae_articles, Exception):
            logger.warning("UAE 미디어 스크랩 실패", error=str(uae_articles))
            uae_articles = []
        if isinstance(social_articles, Exception):
            logger.warning("소셜미디어 스크랩 실패", error=str(social_articles))
            social_articles = []

        all_articles = list(uae_articles) + list(social_articles)
        logger.info("기사 수집 완료", total=len(all_articles))

        new_articles = _filter_new(all_articles)
        logger.info("신규 기사 필터링 완료", new_count=len(new_articles))
        if not new_articles:
            logger.info("새로운 소식 없음, 보고 생략")
            return

        loop = asyncio.get_event_loop()
        notebook_context = await loop.run_in_executor(None, _upload_to_notebooklm, new_articles)
        analysis = await loop.run_in_executor(None, _analyze_phase2, new_articles, notebook_context)

        notebook_url = (notebook_context or {}).get("notebook_url")
        if should_send_immediate_alert(analysis, settings.PHASE2_ALERT_LEVELS):
            await send_telegram_alert(_build_immediate_alert_message(analysis, notebook_url=notebook_url))

        if settings.PHASE2_PODCAST_ENABLED:
            await loop.run_in_executor(None, _maybe_create_podcast_scaffold, notebook_context)

        await send_telegram_report(new_articles, analysis=analysis, notebook_url=notebook_url)
        logger.info("✅ 보고 완료", threat_level=analysis["threat_level"], analysis_source=analysis["analysis_source"])

    except Exception as e:
        logger.exception("파이프라인 실패")
        await send_telegram_alert(f"⚠️ Iran-UAE Monitor 파이프라인 실패\n\n{type(e).__name__}: {e}")


async def main() -> None:
    import subprocess
    import sys

    subprocess.run(
        [sys.executable, "-m", "playwright", "install", "chromium", "--with-deps"],
        capture_output=True,
    )

    logger.info("🚀 이란-UAE 모니터링 시스템 시작 (매시간 자동 보고)")
    scheduler = AsyncIOScheduler()
    scheduler.add_job(hourly_job, "interval", hours=1, next_run_time=datetime.now())
    scheduler.start()

    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        logger.info("시스템 종료")
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
