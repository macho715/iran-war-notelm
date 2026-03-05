# Best 3 Deep Report — upgrade-deep-synth (2026-03-02)

입력: Current State Snapshot + Top 10 + Evidence Table (docs/UPGRADE_REPORT_project-upgrade.md 기반).

---

## 0) Best3 Gate Summary

| Best# | Idea | Bucket | PriorityScore | EvidenceCount | DateOK | PopularityOK | Final | Reason |
|-------|------|--------|---------------|---------------|--------|--------------|-------|--------|
| 1 | APScheduler 이벤트 모니터링(실패/미실행 감지) | Reliability/Observability | 4.0 | 2 | ✅ | ✅ | PASS | Cronradar 2025-06-01, PyPI 2025-01-01 |
| 2 | Playwright async-only + timeout/networkidle 명시 | Performance/DX | 3.0~12.0 | 2 | AMBER | ✅ | AMBER | Medium 2025-06-01 있음, Playwright official 날짜 없음 |
| 3 | Observability: 헬스/메트릭 계약 + 실패 알림 | Reliability/Observability | 4.0 | 2 | AMBER | ✅ | AMBER | repo + Playwright, published_date 없음 |

*DateOK: 모든 evidence에 published_date 또는 updated_date 존재 여부. AMBER = 일부만 충족.*

---

## 1) BEST #1 Deep Dive — APScheduler 이벤트 모니터링

- **Goal:** APScheduler job 실패·미실행을 이벤트 리스너로 감지하고, 기존 Telegram 경보 또는 로그로 알림. 침묵 실패 제거.
- **Non-goals:** 스케줄러 교체(Celery/Redis), 풀 모니터링 대시보드.

- **Proposed Design:** `main.py`에서 `scheduler.add_listener(callback, EVENT_JOB_ERROR | EVENT_JOB_MISSED)` 등록. 콜백에서 `reporter.send_telegram_alert()` 또는 structlog 메트릭 출력. (선택) APScheduler 4.0 alpha 도입 시 `reap_abandoned_jobs` 검토.

- **PR Plan:**  
  - PR1: 리스너 등록 + structlog/로깅.  
  - PR2: 알림 연동(config 플래그 `SCHEDULER_ALERT_ENABLED`).  
  - PR3: GHA에서 한 번 실행 후 로그 검증.

- **Tests:** Mock scheduler로 `EVENT_JOB_ERROR` 발생 시 콜백 호출 검증. `EVENT_JOB_MISSED` 시 동일.

- **Rollout & Rollback:** 기본 알림 끄기(플래그 false). 단계적 활성화. 롤백 시 리스너 제거 또는 플래그 끄기.

- **Risks & Mitigations:** 알림 과다 → job_id/실패 유형별 필터, 쿨다운(예: 15분당 1회).

- **KPI Targets:** 미실행/실패 감지율 100%, 알림 지연 &lt; 5분.

- **Dependencies / Migration traps:** APScheduler 3.x vs 4.x API 차이. 4.0 alpha는 선택.

- **Evidence (≥2):**  
  - Cronradar "Python APScheduler Monitoring: Track Every Scheduled Task" (2025-06-01, accessed 2026-03-02).  
  - PyPI APScheduler 4.0.0a6 (2025-01-01, abandoned job recovery).

---

## 2) BEST #2 Deep Dive — Playwright async-only + timeout/networkidle 명시

- **Goal:** 모든 스크래퍼를 `async_playwright` + `asyncio.gather` 패턴으로 통일, 페이지 로드에 timeout·networkidle(또는 domcontentloaded) 명시로 안정성 확보.
- **Non-goals:** 브라우저 풀 재설계, 프록시 도입.

- **Proposed Design:** `scrapers/uae_media.py`, `social_media.py`에서 `async with async_playwright()` 사용 일원화. `page.goto(url, timeout=30000, wait_until="networkidle"|"domcontentloaded")` 명시. 기존 투트랙(Playwright + httpx) 유지하되 Playwright 경로만 정리.

- **PR Plan:**  
  - PR1: uae_media async + timeout.  
  - PR2: social_media 동일.  
  - PR3: 공통 상수(timeout_ms, wait_until) config 또는 상수 모듈로 추출.

- **Tests:** 기존 스크래퍼 테스트, 타임아웃 시 빈 결과 반환 검증.

- **Rollout & Rollback:** 단계별 PR, 실패 시 이전 커밋 revert.

- **Risks & Mitigations:** networkidle가 특정 사이트에서 과도한 대기 → domcontentloaded 폴백 옵션.

- **KPI Targets:** 스크래핑 성공률 &gt; 95%, 평균 응답 시간 &lt; 30s.

- **Dependencies / Migration traps:** Playwright Python async_api only; sync API 제거.

- **Evidence (≥2):**  
  - Medium "Async Web Scraping with Playwright & Python Guide 2025" (2025-06-01, accessed 2026-03-02).  
  - Playwright official Best Practices / Python Library (accessed 2026-03-02; published_date AMBER).

---

## 3) BEST #3 Deep Dive — Observability: 헬스/메트릭 계약 + 실패 알림

- **Goal:** 헬스 체크·메트릭 출력 계약 정의, 스크래퍼/NotebookLM/전송 실패 시 알림 규칙 명시.
- **Non-goals:** 풀 APM 도입, 대시보드 시각화.

- **Proposed Design:** `health.py`에 `/health` 응답 스키마(상태, last_run_ts, last_error, counts) 고정. 설정에 `HEALTH_ALERT_WEBHOOK` 또는 기존 Telegram 경보 확장. 실패 시 `reporter.send_telegram_alert()` 또는 동일 채널로 "헬스 실패" 메시지.

- **PR Plan:**  
  - PR1: health 응답 스키마 + docs.  
  - PR2: 실패 시 알림 규칙(config + reporter).  
  - PR3: GHA에서 헬스 검사 단계 추가(선택).

- **Tests:** 기존 health 테스트 유지, 실패 시나리오 mock으로 알림 호출 1회 검증.

- **Rollout & Rollback:** 기능 플래그 `HEALTH_ALERT_ENABLED`, 기본 false. 롤백 시 플래그 끄기.

- **Risks & Mitigations:** 알림 스팸 → 임계값(연속 N회 실패) 또는 쿨다운 적용.

- **KPI Targets:** 헬스 실패 → 알림 도달률, false positive 감소.

- **Dependencies / Migration traps:** 기존 `.health_state.json` 소비처와 스키마 호환 유지.

- **Evidence (≥2):**  
  - CHANGELOG 1.6 (실행 경로 진단).  
  - Playwright docs (안정성; published_date AMBER).

---

## 4) Implementation Notes

- APScheduler 리스너를 먼저 도입해 침묵 실패를 제거한 뒤, Observability 계약 확장.
- Playwright timeout/async 정리는 스크래퍼별로 한 PR씩 적용해 회귀 최소화.
- CONTRIBUTING/SECURITY 초안은 Best3와 병렬로 진행 가능(문서만).
- 모든 알림 경로는 기능 플래그로 끄고, 단계적으로 켜기.
- Best3 적용 후 30일 내 헬스·스케줄러·스크래퍼 로그로 KPI 1차 측정.

---

## 5) JSON Envelope

```json
{
  "best3": [
    {
      "rank": 1,
      "idea": "APScheduler 이벤트 모니터링(실패/미실행 감지)",
      "bucket": "Reliability/Observability",
      "priority_score": 4.0,
      "evidence": [
        {"platform": "web", "title": "Python APScheduler Monitoring: Track Every Scheduled Task", "url": "https://cronradar.com/blog/python-scheduler-monitoring", "published_date": "2025-06-01", "updated_date": null, "accessed_date": "2026-03-02", "popularity_metric": ""},
        {"platform": "pypi", "title": "APScheduler 4.0.0a6", "url": "https://pypi.org/project/APScheduler/", "published_date": "2025-01-01", "updated_date": null, "accessed_date": "2026-03-02", "popularity_metric": "PyPI"}
      ],
      "pr_plan": [
        {"pr": "PR1", "scope": "리스너 등록 + 로깅", "rollback": "리스너 제거"},
        {"pr": "PR2", "scope": "알림 연동 config 플래그", "rollback": "플래그 끄기"},
        {"pr": "PR3", "scope": "GHA 로그 검증", "rollback": "단계 제거"}
      ],
      "kpis": [{"metric": "미실행/실패 감지율", "target": "100%"}, {"metric": "알림 지연", "target": "<5min"}],
      "risks": [{"risk": "알림 과다", "mitigation": "job_id/유형별 필터, 쿨다운"}]
    },
    {
      "rank": 2,
      "idea": "Playwright async-only + timeout/networkidle 명시",
      "bucket": "Performance/DX",
      "priority_score": 3.0,
      "evidence": [
        {"platform": "medium", "title": "Async Web Scraping with Playwright & Python Guide 2025", "url": "https://medium.com/@backendbyeli/async-web-scraping-with-playwright-python-faster-scraping-without-blocking-2eab5f3810a1", "published_date": "2025-06-01", "updated_date": null, "accessed_date": "2026-03-02", "popularity_metric": ""},
        {"platform": "official", "title": "Playwright Python Library", "url": "https://playwright.dev/python/docs/library", "published_date": null, "updated_date": null, "accessed_date": "2026-03-02", "popularity_metric": "docs"}
      ],
      "pr_plan": [
        {"pr": "PR1", "scope": "uae_media async + timeout", "rollback": "revert"},
        {"pr": "PR2", "scope": "social_media 동일", "rollback": "revert"},
        {"pr": "PR3", "scope": "공통 상수 추출", "rollback": "revert"}
      ],
      "kpis": [{"metric": "스크래핑 성공률", "target": ">95%"}, {"metric": "평균 응답 시간", "target": "<30s"}],
      "risks": [{"risk": "networkidle 과대기", "mitigation": "domcontentloaded 폴백"}]
    },
    {
      "rank": 3,
      "idea": "Observability: 헬스/메트릭 계약 + 실패 알림",
      "bucket": "Reliability/Observability",
      "priority_score": 4.0,
      "evidence": [
        {"platform": "repo", "title": "CHANGELOG 1.6", "url": "docs/CHANGELOG.md", "published_date": null, "updated_date": null, "accessed_date": "2026-03-02", "popularity_metric": ""},
        {"platform": "official", "title": "Playwright Best Practices", "url": "https://playwright.dev/docs/best-practices", "published_date": null, "updated_date": null, "accessed_date": "2026-03-02", "popularity_metric": "docs"}
      ],
      "pr_plan": [
        {"pr": "PR1", "scope": "health 스키마 + docs", "rollback": "스키마 유지"},
        {"pr": "PR2", "scope": "실패 알림 규칙", "rollback": "플래그 끄기"},
        {"pr": "PR3", "scope": "GHA 헬스 단계", "rollback": "단계 제거"}
      ],
      "kpis": [{"metric": "알림 도달률", "target": "100%"}, {"metric": "false positive", "target": "감소"}],
      "risks": [{"risk": "알림 스팸", "mitigation": "임계값/쿨다운"}]
    }
  ],
  "meta": {"version": "upgrade-deep-synth.v1", "tz": "Asia/Dubai"}
}
```
