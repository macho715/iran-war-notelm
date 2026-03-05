# Project Upgrade Report — dashboard_bundle

> Scope: `dashboard_bundle` | refreshed_date: 2026-03-04

---

## 1. Executive Summary

`dashboard_bundle`는 HyIE-ERC² 실시간 대시보드 번들이다. 현재 상태를 코드 기준으로 재검증한 결과, 업그레이드 방향은 유지하되 우선순위를 다음처럼 재정렬하는 것이 맞다.

1. **Data path 정렬(API-first)**: UI가 `/api/state`를 먼저 조회해야 observability 효과가 실제로 발생한다.
2. **FastAPI observability 최소 도입**: `/metrics` 노출과 `/api/state` source 추적(`X-State-Source`)을 기본선으로 적용한다.
3. **Vite 전환 설계 고정**: 즉시 전환 대신 `dist/` 기준 설계를 확정하고 fallback(Babel) 정책을 문서화한다.

---

## 2. Current State Snapshot (Code-Verified)

| 항목 | 값 |
|---|---|
| 경로 | `dashboard_bundle/` |
| 메인 UI | `dashboard_bundle/ui/index_v2.html` |
| 레거시 UI | `dashboard_bundle/legacy/index_1.html` |
| React UI 코드 | `dashboard_bundle/ui/hyie-erc2-dashboard.jsx` |
| API | `src/iran_monitor/health.py` (`/health`, `/api/state`, `/api/state/conflict-stats`, `/api/state/egress-eta`) |
| 데이터 소스 우선순위 | **API-first**: `/api/state` → raw live state → relative fallback |
| 정적 서빙 | Python `http.server` (port 3000) |
| 로컬 실행 | `dashboard_bundle/start_local_dashboard.ps1` |
| GHA 워크플로 | `monitor.yml`, `urgentdash-live-publish.yml`, `backup-urgentdash.yml` |
| Python 캐시 | `actions/setup-python@v5` + `cache: pip` (이미 적용됨) |
| requirements 위치 | 루트 `requirements.txt` 단일 기준 |

---

## 3. Reality Check (기존 리포트 대비)

1. **Babel standalone 사용 진단은 유효**
- 레거시 UI는 Babel runtime transpile 구조다.

2. **데이터 소스 흐름은 이전 문서와 불일치했음(수정 완료)**
- 기존 문구: `/api/state` 우선
- 실제 코드(수정 전): raw 우선
- 현재 코드: `/api/state` 우선으로 정렬됨.

3. **GHA pip cache는 “미적용”이 아니라 “이미 적용” 상태**
- 3개 워크플로 모두 `setup-python@v5` + `cache: pip` 사용.

4. **Vite Node 요구사항 문구 업데이트 필요**
- 기존 `Node 18+` 표기는 최신 Vite 기준과 불일치 가능.
- 문서 기준은 `Node 20.19+ 또는 22.12+`로 관리.

---

## 4. Best 3 Deep Report (Updated)

### Best 1: Babel Standalone → Vite Build (Design-Freeze)

**Goal**
- 프로덕션 번들 사전 빌드(`dist/`)로 전환하고 초기 로드/운영 일관성 개선.

**Decision**
- 산출물 경로는 `dist/` 고정.
- `index_1.html`은 비상 fallback(legacy)로 유지.

**Dependencies**
- Node `20.19+` 또는 `22.12+` 기준.

**Status**
- 설계 고정 완료, 실제 빌드 전환은 별도 구현 PR.

---

### Best 2: GHA pip Cache (Already Satisfied + Policy)

**Goal**
- 설치 시간/실패율 안정화.

**Current**
- `setup-python@v5` + `cache: pip`가 이미 적용되어 있음.

**Policy**
- 현재는 루트 `requirements.txt` 단일 경로이므로 추가 옵션 불필요.
- 향후 의존성 파일이 분리되면 `cache-dependency-path` 활성화.

---

### Best 3: FastAPI Observability (Minimum Viable)

**Goal**
- `/api/state` 지연/오류/호출량을 운영 지표로 확보.

**Implementation (minimum)**
- `prometheus-fastapi-instrumentator` 기반 `/metrics` endpoint 노출.
- `/api/state` 응답 헤더 `X-State-Source` 추가.

**Critical prerequisite**
- UI data path must be API-first.

**Status**
- 최소 도입 반영됨(코드/테스트 포함).

---

## 5. Decisions Locked

1. Data path: `API-first` 고정.
2. Vite outDir: `dist/` 고정.
3. CI cache: `setup-python cache: pip` 중심 유지.
4. Source priority 운영 기준: ADR로 고정 (`ADR_STATE_SOURCE_PRIORITY.md`).

---

## 6. Implementation Status by PR

| PR | 범위 | 상태 |
|---|---|---|
| PR0 | UI candidate 순서 API-first 정렬 | Done |
| PR1 | `/metrics` + `X-State-Source` | Done |
| PR2 | 업그레이드 리포트 정합화 | Done |
| PR3 | Vite 설계 고정(`dist`, legacy fallback 정책) | Done (design only) |
| PR4 | Runbook/운영 정책 문서화 | Done |

---

## 7. Test and Verification Checklist

1. UI source-priority contract
- `/api/state`가 raw보다 먼저 시도되는지 정적 테스트.

2. Observability endpoint
- `/metrics` 응답 200.
- `/api/state` 호출 후 metrics에 handler 반영.

3. Health API headers
- `/api/state` 응답에 `X-State-Source` 존재.

4. Workflow consistency
- 3개 워크플로 모두 `setup-python@v5` + `cache: pip` 유지.

---

## 8. Evidence Table (Primary/Official)

| ID | platform | title | url | accessed_date | why_relevant |
|---|---|---|---|---|---|
| E1 | official | Babel Standalone docs | https://babeljs.io/docs/babel-standalone | 2026-03-04 | 프로덕션 비권장 근거 |
| E2 | official | Vite Guide | https://vite.dev/guide/ | 2026-03-04 | Vite 최신 런타임/도입 기준 |
| E3 | official | Node Releases | https://nodejs.org/en/about/previous-releases | 2026-03-04 | Node 18 EOL 확인 |
| E4 | official | actions/setup-python | https://github.com/actions/setup-python | 2026-03-04 | `cache: pip`, `cache-dependency-path` 근거 |
| E5 | official | GitHub Actions cache deprecation notice | https://github.blog/changelog/2024-09-16-notice-of-upcoming-deprecations-and-changes-in-github-actions-services/ | 2026-03-04 | 캐시 액션 버전 정책 |
| E6 | official | prometheus-fastapi-instrumentator | https://pypi.org/project/prometheus-fastapi-instrumentator/ | 2026-03-04 | FastAPI `/metrics` 구현 근거 |
| E7 | official | OpenTelemetry FastAPI instrumentation | https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html | 2026-03-04 | 추후 tracing 확장 근거 |
| E8 | standard | RFC 5861 | https://datatracker.ietf.org/doc/html/rfc5861 | 2026-03-04 | stale-while-revalidate 표준 |

---

## 9. Remaining Open Questions

1. Vite 도입 시 local/dev/prod 각각 어떤 서빙 엔트리를 표준으로 삼을지.
2. Prometheus만 쓸지, OTel exporter까지 포함할지.
3. dashboard_bundle 전용 테스트를 루트 `tests/`에 둘지, bundle 하위로 분리할지.

---

## Evidence Paths (Repo)

- `dashboard_bundle/ui/index_v2.html`
- `dashboard_bundle/ui/hyie-erc2-dashboard.jsx`
- `dashboard_bundle/legacy/index_1.html`
- `src/iran_monitor/health.py`
- `.github/workflows/monitor.yml`
- `.github/workflows/urgentdash-live-publish.yml`
- `.github/workflows/backup-urgentdash.yml`
- `dashboard_bundle/docs/HYIE_ERC2_REALTIME_RUNBOOK.md`
- `dashboard_bundle/docs/ADR_STATE_SOURCE_PRIORITY.md`
