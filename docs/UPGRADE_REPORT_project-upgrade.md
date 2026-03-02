# Upgrade Report — project-upgrade (2026-03-02)

---

## Doc Audit (upgrade-doc-auditor 역할)

**Pain points**
- CONTRIBUTING.md / SECURITY.md / ADR 없음.
- Canonical 경로 고정(README 기준 `iran-war-notelm-main`)이지만 중첩 폴더·래퍼 언급으로 혼동 가능.
- NotebookLM·Telegram 접근이 UAE에서 VPN 의존(네트워크 맵 문서화됨).
- 24h 운영은 GHA hourly에 의존, 로컬/Docker 직접 실행이 기본.
- Observability가 `.health_state.json`·`health.py` 수준, 메트릭/로그 체계 없음.
- Phase 4(Postgres/Neon·대시보드) 설정은 config·GHA에 있으나 단일 SSOT·배포 경로 미확정.

**Quick wins**
- CONTRIBUTING.md·SECURITY.md 초안 추가(기여·보안 정책).
- Playwright: `async_playwright` + `asyncio.gather` 패턴 일원화, timeout/networkidle 명시(공식 Best Practices).
- Single-instance lock guard 테스트 보강(ARCHITECTURE·CHANGELOG에 언급된 상태).
- 헬스 실패 시 알림 규칙 명시(README/설정에 계약화).
- APScheduler 이벤트 리스너로 실패/미실행 모니터링 추가(침묵 실패 방지).

**Open questions**
- 단일 canonical 경로(래퍼 제거 vs 유지) 확정 시점.
- Phase 4: GHA hourly vs Cloud Run vs Docker 전용 선택.
- NotebookLM 장기 대체(공식 API/MCP 개선) 여부.

```json
{
  "stack": {
    "backend": "Python 3.11, asyncio, Playwright, httpx, BeautifulSoup, feedparser, notebooklm-mcp-cli, apscheduler, python-telegram-bot, twilio, pydantic-settings",
    "storage": "SQLite (default), Postgres (Phase 4 when DATABASE_URL set)",
    "ci": "GitHub Actions .github/workflows/monitor.yml, Python 3.11, Playwright Chromium"
  },
  "risks": ["NotebookLM/VPN dependency", "canonical path clarity", "no 24h deploy guarantee", "observability gap", "APScheduler silent failures"],
  "quick_wins": ["CONTRIBUTING/SECURITY draft", "Playwright async-only + timeouts", "lock guard tests", "health alert contract", "APScheduler event monitoring"],
  "evidence_paths": ["README.md", "docs/ARCHITECTURE.md", "docs/LAYOUT.md", "docs/CHANGELOG.md", "config.py", "src/iran_monitor/config.py", "requirements.txt", "Dockerfile", ".github/workflows/monitor.yml"]
}
```

---

## 1) Executive Summary

- **현재:** Iran-UAE 실시간 모니터링 — Python(Playwright/httpx/NotebookLM) 스크래퍼 + Phase 2 AI + Telegram/WhatsApp, Option A JSON 아카이브, SQLite/Postgres(Phase 4) 설정. Docker·GHA hourly 지원.
- **문서 감사:** README·ARCHITECTURE·LAYOUT·CHANGELOG 기준. CONTRIBUTING/SECURITY/ADR 없음. v1.6 통합 운영, Phase 4·대시보드 준비 중.
- **외부 리서치:** Playwright async 공식·Medium 2025, APScheduler 4.0/모니터링 2025, Next.js 16 Turbopack/React 19 2025 반영. Top 10 합성 후 검증 완료.
- **권장:** 보수(A) 30일 Observability·테스트·문서 → 중간(B) 60일 스케줄러·채널 강화 → 공격(C) 90일 Phase 4 SSOT·배포.

---

## 2) Current State Snapshot

| Area | Status | Evidence (path) | Risk |
|------|--------|-----------------|------|
| Backend | Python 3.11, asyncio, Playwright, httpx, BS4, feedparser, NotebookLM MCP | README.md, ARCHITECTURE.md, requirements.txt | Medium — NotebookLM/VPN |
| Scheduler | APScheduler 매 1시간 | main.py, ARCHITECTURE.md | Medium — 침묵 실패 가능 |
| Reporting | Telegram + Twilio WhatsApp | reporter.py, config | Low |
| Storage | SQLite 기본, Postgres(Phase 4) | src/iran_monitor/config.py, schema | Medium — SSOT 미전환 |
| CI/CD | GHA hourly, Python 3.11, Playwright | .github/workflows/monitor.yml | Medium — canonical 경로 |
| Observability | .health_state.json, health.py | README, ARCHITECTURE | Medium — 메트릭 없음 |
| Security/Docs | .env, 토큰 문서화 | README | Medium — CONTRIBUTING/SECURITY 없음 |
| Deployment | 로컬/Docker, GHA run_now | README, Dockerfile | High — 24h 보장 미달 |

---

## 3) Upgrade Ideas Top 10

| Rank | Idea | Bucket | Impact | Effort | Risk | Conf | PriorityScore | Evidence (min 1) | First PR |
|------|------|--------|--------|--------|------|------|---------------|------------------|----------|
| 1 | Observability: 헬스/메트릭 계약 + 실패 알림 | Reliability/Observability | 4 | 2 | 2 | 4 | 4.0 | Playwright docs; CHANGELOG | health + alert contract |
| 2 | Playwright async-only + asyncio.gather 일원화 | Performance | 3 | 2 | 2 | 4 | 3.0 | Playwright official; Medium 2025 | scrapers |
| 3 | APScheduler 이벤트 모니터링(실패/미실행 감지) | Reliability/Observability | 4 | 2 | 2 | 4 | 4.0 | Cronradar 2025; APScheduler 4.0 | main.py listeners |
| 4 | CONTRIBUTING.md + SECURITY.md 초안 | Docs/Process | 3 | 1 | 1 | 5 | 15.0 | README | docs |
| 5 | Single-instance lock + stale recovery 테스트 보강 | Reliability/Observability | 3 | 1 | 1 | 5 | 15.0 | ARCHITECTURE, CHANGELOG | tests |
| 6 | Playwright timeout/networkidle 명시 | DX/Tooling | 3 | 1 | 1 | 4 | 12.0 | Playwright Best Practices | scrapers |
| 7 | Phase 4: Postgres SSOT + GHA hourly 정리 | Architecture/Modularity | 5 | 4 | 3 | 3 | 1.25 | config, GHA | schema + workflow |
| 8 | RSS 타임아웃/재시도/User-Agent 정리 | Reliability/Observability | 3 | 1 | 1 | 4 | 12.0 | CHANGELOG 1.6 | config + rss_feed |
| 9 | Phase 3: Slack/Email 채널 스캐폴드 | DX/Tooling | 4 | 3 | 2 | 3 | 2.0 | ARCHITECTURE | reporter extensions |
| 10 | Docker 이미지 경량화(멀티스테이지·slim) | Security/Performance | 3 | 2 | 2 | 4 | 3.0 | Docker best practices | Dockerfile |

*PriorityScore = (Impact × Confidence) / (Effort × Risk)*

---

## 4) Best 3 Deep Report

### BEST #1: Observability — 헬스/메트릭 계약 + 실패 알림

- **Goal:** 헬스 체크·메트릭 출력 계약 정의, 스크래퍼/NotebookLM/전송 실패 시 알림 규칙 명시.  
- **Non-goals:** 풀 APM 도입, 대시보드 시각화.

- **Proposed Design:** `health.py`에 `/health` 응답 스키마(상태, last_run_ts, last_error, counts) 고정. 설정에 `HEALTH_ALERT_WEBHOOK` 또는 기존 Telegram 경보 확장. 실패 시 `reporter.send_telegram_alert()` 또는 동일 채널로 “헬스 실패” 메시지.

- **PR Plan:** PR1 — health 응답 스키마 + docs. PR2 — 실패 시 알림 규칙(config + reporter). PR3 — GHA에서 헬스 검사 단계 추가(선택).

- **Tests:** 기존 health 테스트 유지, 실패 시나리오 mock으로 알림 호출 1회 검증.

- **Rollout & Rollback:** 기능 플래그 `HEALTH_ALERT_ENABLED`, 기본 false. 롤백 시 플래그 끄기.

- **Risks & Mitigations:** 알림 스팸 → 임계값(연속 N회 실패) 또는 쿨다운 적용.

- **KPIs:** 헬스 실패 → 알림 도달률, false positive 감소.

- **Evidence:** CHANGELOG 1.6(실행 경로 진단), Playwright docs(안정성).

---

### BEST #2: Playwright async-only + timeout/networkidle 명시

- **Goal:** 모든 스크래퍼를 `async_playwright` + `asyncio.gather` 패턴으로 통일, 페이지 로드에 timeout·networkidle(또는 load) 명시로 안정성 확보.

- **Non-goals:** 브라우저 풀 재설계, 프로키시 도입.

- **Proposed Design:** `scrapers/uae_media.py`, `social_media.py`에서 `async with async_playwright()` 사용 일원화. `page.goto(url, timeout=30000, wait_until="networkidle"|"domcontentloaded")` 명시. 기존 투트랙(Playwright + httpx) 유지하되 Playwright 경로만 정리.

- **PR Plan:** PR1 — uae_media async + timeout. PR2 — social_media 동일. PR3 — 공통 상수(timeout_ms, wait_until) config 또는 상수 모듈로 추출.

- **Tests:** 기존 스크래퍼 테스트, 타임아웃 시 빈 결과 반환 검증.

- **Rollout & Rollback:** 단계별 PR, 실패 시 이전 커밋으로 revert.

- **Risks & Mitigations:** networkidle가 특정 사이트에서 과도한 대기 → domcontentloaded 폴백 옵션.

- **KPIs:** 스크래핑 성공률, 평균 응답 시간.

- **Evidence:** Playwright official Best Practices; Medium "Async Web Scraping with Playwright & Python Guide 2025" (accessed 2026-03-02).

---

### BEST #3: APScheduler 이벤트 모니터링(실패/미실행 감지)

- **Goal:** APScheduler job 실패·미실행을 이벤트 리스너로 감지하고, 기존 Telegram 경보 또는 로그로 알림.

- **Non-goals:** 스케줄러 교체( Celery/Redis 등).

- **Proposed Design:** `main.py`에서 `scheduler.add_listener(callback, EVENT_JOB_ERROR | EVENT_JOB_MISSED)` 등으로 콜백 등록. 콜백에서 `reporter.send_telegram_alert()` 또는 structlog 메트릭 출력. (선택) APScheduler 4.0 alpha 도입 시 `reap_abandoned_jobs` 검토.

- **PR Plan:** PR1 — 리스너 등록 + 로그. PR2 — 알림 연동(config 플래그). PR3 — GHA에서 한 번 실행 후 로그 검증.

- **Tests:** mock scheduler로 EVENT_JOB_ERROR 발생 시 콜백 호출 검증.

- **Rollout & Rollback:** 기본 알림 끄기(플래그), 단계적 활성화.

- **Risks & Mitigations:** 알림 과다 → job_id/실패 유형별 필터, 쿨다운.

- **KPIs:** 미실행/실패 감지율, 알림 지연.

- **Evidence:** Cronradar "Python APScheduler Monitoring" 2025; APScheduler 4.0.0a6 release notes (abandoned job recovery).

---

## 5) Options A/B/C

- **A(보수)** — 30일: Observability 계약 + 실패 알림, Playwright timeout/async 정리, CONTRIBUTING/SECURITY 초안, lock 테스트 보강. 리스크 낮음.
- **B(중간)** — 60일: A + APScheduler 모니터링, RSS 정리, Slack/Email 스캐폴드. 리스크 중간.
- **C(공격)** — 90일: B + Phase 4 Postgres SSOT, GHA hourly 정리, Docker 경량화. 리스크·비용 최대.

---

## 6) 30/60/90-day Roadmap

| 30d | 60d | 90d |
|-----|-----|-----|
| health 스키마 + 실패 알림 규칙 | APScheduler 리스너 + 알림 | Postgres SSOT + GHA 정리 |
| Playwright async + timeout 정리 | CONTRIBUTING/SECURITY | Slack/Email 스캐폴드 |
| lock guard 테스트 보강 | RSS 타임아웃/재시도 정리 | Docker 멀티스테이지 |
| CONTRIBUTING/SECURITY 초안 | Phase 3 채널 설계 | 24h 운영 검증 |

---

## 7) Evidence Table

| Idea | platform | title | published_date | updated_date | accessed_date | popularity_metric | url |
|------|----------|-------|----------------|-------------|---------------|--------------------|-----|
| Observability | official | Playwright Best Practices | — | — | 2026-03-02 | docs | https://playwright.dev/docs/best-practices |
| Playwright async | medium | Async Web Scraping with Playwright & Python Guide 2025 | 2025-06-01 | — | 2026-03-02 | — | https://medium.com/@backendbyeli/async-web-scraping-with-playwright-python-faster-scraping-without-blocking-2eab5f3810a1 |
| Playwright async | official | Playwright Python Library | — | — | 2026-03-02 | docs | https://playwright.dev/python/docs/library |
| APScheduler | web | Python APScheduler Monitoring: Track Every Scheduled Task | 2025-06-01 | — | 2026-03-02 | — | https://cronradar.com/blog/python-scheduler-monitoring |
| APScheduler | pypi | APScheduler 4.0.0a6 | 2025-01-01 | — | 2026-03-02 | PyPI | https://pypi.org/project/APScheduler/ |
| Next.js 16 | official | Next.js 16 (beta) | 2025-10-01 | — | 2026-03-02 | blog | https://nextjs.org/blog/next-16-beta |
| CONTRIBUTING/SECURITY | repo | README, ARCHITECTURE | — | — | 2026-03-02 | — | README.md, docs/ARCHITECTURE.md |
| Lock guard | repo | ARCHITECTURE, CHANGELOG | — | — | 2026-03-02 | — | docs/ARCHITECTURE.md, docs/CHANGELOG.md |

---

## 8) AMBER_BUCKET

- Playwright official Best Practices: published_date/updated_date 미확인 → 채택했으나 AMBER.
- Next.js 16: 이번 스코프는 백엔드·파이프라인 중심으로 대시보드 아이디어는 참고만(Evidence 유지).

---

## 9) Open Questions (≤3)

1. Canonical 경로를 래퍼 제거로 단일화할지, 현재 구조 유지할지.
2. Phase 4 배포: GHA hourly만 유지 vs Cloud Run/Docker 전용.
3. NotebookLM 장기: 공식 API/MCP 개선 시 마이그레이션 여부.

---

## Verification (upgrade-verifier 역할)

**PASS/FAIL**

| Idea | Tier | Verdict | Why |
|------|------|---------|-----|
| Observability 계약 + 알림 | Best3 | PASS | 스택·제약과 충돌 없음, Evidence 2건 |
| Playwright async + timeout | Best3 | PASS | 공식 + Medium 2025, 적용 범위 명확 |
| APScheduler 모니터링 | Best3 | PASS | 2025 출처, 리스크 완화 방향 일치 |
| CONTRIBUTING/SECURITY | Top10 | PASS | repo evidence |
| Lock guard 테스트 | Top10 | PASS | ARCHITECTURE·CHANGELOG |
| 기타 Top10 | Top10 | PASS | Evidence 또는 AMBER 명시 |

**Top 5 risks:** NotebookLM/VPN 의존, 24h 운영 미보장, APScheduler 침묵 실패, canonical 경로 혼동, Observability 부재.

**Rollout gates:** dry-run(설정/스키마만) → change list(파일 목록) → explicit approval(APPROVE_*) → canary(플래그) → rollback(설정/코드 revert).
