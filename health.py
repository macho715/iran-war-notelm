"""
헬스체크 API (Phase 1 안정화)
==============================
FastAPI 단일 엔드포인트 GET /health
main.py가 기록한 .health_state.json 을 읽어 마지막 성공 시간/기사 수 노출.
실행: uvicorn health:app --host 0.0.0.0 --port 8000
"""

import json
from pathlib import Path

from fastapi import FastAPI

app = FastAPI(title="Iran-UAE Monitor Health")
HEALTH_STATE_FILE = Path(".health_state.json")


@app.get("/health")
def health():
    """마지막 파이프라인 실행 상태 및 성공 시각/기사 수 반환."""
    if not HEALTH_STATE_FILE.exists():
        return {
            "status": "unknown",
            "message": "아직 한 번도 실행되지 않음",
        }
    try:
        data = json.loads(HEALTH_STATE_FILE.read_text(encoding="utf-8"))
        return {
            "status": data.get("status", "unknown"),
            "last_success_at": data.get("last_success_at"),
            "last_article_count": data.get("last_article_count"),
            "last_error": data.get("last_error"),
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"상태 파일 읽기 실패: {e}",
        }


@app.get("/")
def root():
    """/health 로 리다이렉트 안내."""
    return {"service": "Iran-UAE Monitor", "health": "/health"}
