# Best 3 Deep Report (Expanded) — upgrade-deep-synth

> Input: Current Snapshot + Top10 + Evidence | Output: Full Deep Dive template per Best3

---

## Best 1: GHA pip Cache 적용

**Evidence:** E3 (GitHub official), E4 (actions/cache v4 deprecation) — 2 independent sources ✓

### Goal
- 15분/1시간 주기 GHA 워크플로우에서 `pip install` 시간 단축
- 실행 안정성 및 Actions 분 단위 비용 절감

### Non-goals
- pip 외 캐시(Playwright browsers, node_modules 등) 확장
- self-hosted runner 또는 외부 캐시 서비스 도입

### Proposed Design

| Component | Interface | Responsibility |
|-----------|-----------|----------------|
| setup-python@v5 | `cache: "pip"` | pip 패키지 캐시 자동 생성/복원 |
| actions/cache@v4 | (미사용 시) — | setup-python이 내부적으로 cache 활용 |
| workflow YAML | env, steps | Python 버전, requirements.txt 경로 일치 |

**Data flow:**
```
Checkout → setup-python (cache: "pip") → pip install -r requirements.txt
                ↓
        Cache key: runner.os + "pip" + hashFiles("**/requirements.txt")
        Hit → restore ~/.cache/pip
        Miss → install 후 저장
```

**Interfaces:**
- `urgentdash-live-publish.yml`: 이미 `cache: "pip"` 사용 중 — 유지
- `monitor.yml`: `setup-python` step에 `cache: "pip"` 추가
- `requirements.txt` 경로: repo 루트 — `hashFiles("requirements.txt")` 사용

### PR Plan
- **PR1:** `monitor.yml`에 `cache: "pip"` 추가. `setup-python` 기존 `python-version`, `cache` 옵션 명시.
- **PR2:** `actions/cache` 직접 사용 시(없으면 생략) v4.2.0+로 pin. Discussion #1510 준수.
- **PR3:** README 또는 docs에 "GHA 캐시 동작" 1~2문장 문서화.

### Tests
- **Unit:** N/A (YAML 변경)
- **Integration:** `workflow_dispatch`로 monitor 1회 실행. `pip install` 단계 시간 로그 비교(캐시 miss 1회, hit 1회).
- **Security:** 캐시에 secrets 미포함 확인. pip cache path는 `~/.cache/pip`만 대상.

### Rollout & Rollback
- **Rollout:** PR 머지 → 다음 scheduled run부터 적용.
- **Rollback:** `cache: "pip"` 제거 후 즉시 원복. 캐시 eviction 정책(7일 미접근 시 삭제)에 의해 자동 정리.
- **Feature flag:** 없음.

### Risks & Mitigations
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| 캐시 corruption | 낮음 | hashFiles로 requirements 변경 시 새 캐시 생성 |
| 저장 한도 초과 | 낮음 | 기본 10GB/repo, eviction 자동 |
| v4 미사용으로 deprecated 경고 | 낮음 | setup-python@v5는 내부 cache v2 사용. actions/cache 직접 쓰면 v4.2+ |

### KPIs
| Metric | Baseline | Target |
|--------|----------|--------|
| `pip install` 단계 소요 | ~60–90s (miss) | ~10–20s (hit) |
| monitor workflow 총 시간 | ~5–8분 | ~4–6분 |
| 15분 주기 실패률 | 현재 | 동일 또는 개선 |

### Dependencies / Migration traps
- **Migration trap:** `requirements.txt`가 여러 경로에 있으면 `hashFiles` 불일치 → 캐시 miss 유지. 현재 루트 1개만 사용하므로 문제 없음.
- **Dependency:** setup-python@v5, GitHub Hosted Runner.

---

## Best 2: Structured JSON Logging (structlog 활용)

**Evidence:** E5 (FastAPI Observability 4 pillars — logging 1st), internal: 이미 `structlog` in requirements.txt — 2 sources ✓

### Goal
- API 요청·상태 계산·에러를 JSON 구조화 로그로 출력
- request_id / trace_id 상관으로 장애 추적 가능
- 기존 stdout 로그를 파싱·집계 가능하게 함

### Non-goals
- 로그 수집·저장 인프라 구축 (ELK, Loki 등)
- 비즈니스 이벤트 전용 로깅 레이어

### Proposed Design

| Component | Interface | Responsibility |
|-----------|-----------|----------------|
| structlog | `structlog.configure(...)` | JSON 렌더러, 프로세스 바인딩 |
| FastAPI middleware | `Request` → `request_id` | 요청별 고유 ID 주입 |
| health app | `logger.info()`, `logger.error()` | 상태 조회·에러 로그 |

**Data flow:**
```
Request → Middleware (request_id) → Endpoint → structlog.info("state_fetched", ...)
                                                    ↓
                                            JSON stdout → (선택) 파일/수집기
```

**Interfaces:**
- 로그 스키마: `{"timestamp":"...", "level":"info", "event":"state_fetched", "request_id":"...", "duration_ms":...}`
- 기존 `print()` 호출: 단계적 `logger.info()` 전환

### PR Plan
- **PR1:** `structlog` configure (JSON, timestamper). `get_logger()` 팩토리 추가.
- **PR2:** FastAPI middleware로 `request_id` 생성·바인딩. `/api/state`, `/api/state/conflict-stats` 로깅 추가.
- **PR3:** 기존 `print` in `health.py`, `update_hyie_state_now.py` 등 → `logger` 전환. Runbook에 로그 형식 설명 추가.

### Tests
- **Unit:** structlog config 로드 시 JSON 출력 포맷 검증 (regex or json.loads).
- **Integration:** `GET /api/state` 후 stdout에서 `request_id`, `event` 존재 확인.
- **Security:** 로그에 PII/secrets 미포함. `redact_keys` 설정 검토.

### Rollout & Rollback
- **Rollout:** PR 병합 → 재배포. 기존 stdout 소비자(로그 수집기)는 JSON 파싱으로 전환 가능.
- **Rollback:** structlog configure 제거, 기존 print 복원.
- **Feature flag:** `STRUCTLOG_JSON=true` (default true). false 시 human-readable 포맷.

### Risks & Mitigations
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| 로그 볼륨 증가 | 중간 | 샘플링 또는 debug 레벨 제한 |
| 기존 로그 파서 호환 | 낮음 | 점진적 전환, 옵션으로 human 포맷 유지 |

### KPIs
| Metric | Target |
|--------|--------|
| 로그 파싱 성공률 | 100% (valid JSON) |
| request_id 상관 | 모든 API 요청에 부여 |
| 로그 오버헤드 | <5ms/request |

### Dependencies / Migration traps
- **Dependency:** structlog (이미 requirements.txt에 있음).
- **Trap:** uvicorn 기본 로깅과 충돌 가능 → uvicorn `log_config`에서 structlog 연동 또는 별도 핸들러.

---

## Best 3: Babel Standalone → Vite Production Build

**Evidence:** E1 (Babel official — production에 standalone 비권장), E2 (MoldStud — Vite production, Babel 대비 개선) — 2 sources ✓  
*(E2는 AMBER이지만 E1과 함께 공식+커뮤니티 조합으로 Best3 채택)*

### Goal
- 프로덕션에서 Babel standalone 제거, 사전 빌드 번들로 전환
- 초기 로드 시간·번들 크기 개선
- 번들 해싱·캐시 전략 적용 가능

### Non-goals
- React 18 → 19 업그레이드
- SSR/SSG 도입
- 기존 Babel 기반 개발용 HTML 완전 삭제 (legacy URL 유지 가능)

### Proposed Design

| Component | Interface | Responsibility |
|-----------|-----------|----------------|
| Vite | `vite build` | ES modules → 번들, Tree-shaking |
| React plugin | Vite config | JSX 변환, React 최적화 |
| index.html | 진입점 | root div, script module |
| dist/ | 출력 | index.html, assets/[hash].js, [hash].css |

**Data flow:**
```
index.html + App.jsx → Vite build → dist/index.html + assets/*.js
                                                   ↓
                              Python http.server 또는 Nginx가 dist/ 서빙
```

**Interfaces:**
- 기존 `INTEL_FEED`, `INDICATORS` 등: ES module 또는 window 전역으로 주입 (현재와 동일 패턴)
- `/api/state` fetch: URL은 환경변수 또는 빌드 시 `import.meta.env`로 주입

### PR Plan
- **PR1:** `package.json`, `vite.config.ts`, `index.html` (Vite entry), `src/App.jsx` (hyie-erc2-dashboard.jsx 이전).
- **PR2:** `npm run build` 스크립트. `sync_bundle_from_repo.ps1`에 `npm run build` 및 `dist/` → `urgentdash/` 복사 단계 추가.
- **PR3:** `start_local_dashboard.ps1`이 `dist/` 또는 `urgentdash/` 서빙 선택. `index_vite.html` 경로 문서화.

### Tests
- **Unit:** (선택) 핵심 normalize 함수에 대한 Jest/Vitest.
- **Integration:** `npm run build` 성공, `dist/index.html` 존재.
- **E2E:** Playwright로 `http://localhost:3000/` 로드 → `#root` 렌더, `/api/state` fetch 성공 확인.

### Rollout & Rollback
- **Rollout:** `index_1.html` 유지, 새 경로 `/` 또는 `/vite`로 Vite 빌드 서빙. 점진적 트래픽 전환.
- **Rollback:** 진입 URL을 `index_1.html`로 되돌리기.
- **Canary:** 일부 사용자만 새 경로로 라우팅 (현재 단일 대시보드라 불필요할 수 있음).

### Risks & Mitigations
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Node 미설치 환경 | 중간 | CI에서 빌드 후 산출물만 커밋 또는 artifact 배포 |
| API base URL | 낮음 | 상대 경로 `/api/state` 사용 시 동일 오리진에서 동작 |
| 기존 인라인 데이터 | 중간 | 빌드 시 정적 JSON 주입 또는 fetch로 통일 |

### KPIs
| Metric | Baseline (Babel CDN) | Target (Vite) |
|--------|----------------------|---------------|
| 초기 JS 크기 | React+Babel ~500KB+ | 번들 ~150–250KB (gzip) |
| FCP / LCP | 측정 필요 | 20% 이상 개선 |
| Build 시간 | N/A | <30s |

### Dependencies / Migration traps
- **Dependencies:** Node 18+, npm/pnpm, vite, @vitejs/plugin-react.
- **Migration trap 1:** `index_1.html`에 인라인된 `INTEL_FEED` 등 — `hyie-erc2-dashboard.jsx`는 이미 상수 포함. 빌드 시 하드코딩 또는 fetch로 일원화.
- **Migration trap 2:** `cong` vs `congestion` 필드명 — API/state와 일치시키기.

---

## Summary Table

| Best | Evidence | PriorityScore | Effort | Risk |
|------|----------|---------------|--------|------|
| 1. GHA pip cache | E3, E4 | 20.0 | 1 | 1 |
| 2. Structured JSON logging | E5, internal | 20.0 | 1 | 1 |
| 3. Babel→Vite | E1, E2 | 4.17 | 3 | 2 |

**권장 적용 순서:** Best 1 → Best 2 → Best 3 (Effort 낮은 것부터, Risk 누적 최소화).
