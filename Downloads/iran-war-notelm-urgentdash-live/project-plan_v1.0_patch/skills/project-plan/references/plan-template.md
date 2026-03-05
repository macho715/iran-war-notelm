# PLAN_DOC Template — project-plan (A~K + ㅋ)

> 작성 규칙:
> - 가능한 한 “파일/폴더/모듈” 단위로 구체화한다.
> - 각 핵심 Decision은 Evidence(아이디어/벤치마크)와 연결한다.
> - 파괴적 변경은 dry-run → change list → explicit approval 게이트를 반드시 포함한다.

---

## A. Executive Summary
- 목표(1~2문장):
- 비즈니스/제품 KPI(2~5개, 단위 포함):
- 범위(In-scope / Out-of-scope):
- 핵심 아키텍처/UX 결정 3개:
- 30/60/90-day 마일스톤 요약:

## B. Context & Requirements (PRD-lite)
### B1. 문제정의
- 현재 문제(증거: Current Snapshot):
- 왜 지금 해야 하는가(리스크/기회):

### B2. 사용자/페르소나
- Primary persona:
- Secondary persona:

### B3. 사용자 시나리오/유저스토리(필수)
- Story 1:
- Story 2:
- ...

### B4. 요구사항
- Functional requirements:
- Non-functional requirements(SLO/latency/availability/비용):
- Constraints(보안/네트워크/배포/레거시):

## C. UI/UX Plan (IA → Flow → Screens)
### C1. Information Architecture (IA)
- Navigation map:
- 주요 엔티티/콘텐츠 구조:

### C2. User Flow (텍스트로 상세)
- Flow 1: ...
- Flow 2: ...

### C3. 화면/컴포넌트 리스트(필수)
| Screen | Purpose | Key Components | Data Needed | Edge cases |
|---|---|---|---|---|

### C4. Design System / Accessibility
- 컴포넌트 라이브러리/스타일 가이드:
- a11y 체크(키보드, 대비, aria, i18n):
- Error UI 패턴(토스트/인라인/모달):

## D. System Architecture (Components & Boundaries)
### D1. High-level Components
- Frontend:
- Backend/API:
- Data store:
- Async/Queue(있으면):
- External integrations:

### D2. Data Flow (요청/응답/이벤트)
- Request flow:
- Background jobs:
- Caching strategy:

### D3. Boundary Rules
- 모듈 경계(allowed imports, layering):
- 책임 분리(Controller/Service/Domain/Repo):
- “변경이 전파되는 표면” 최소화 전략:

## E. Data Model & API Contract
### E1. Data model (Entity)
| Entity | Fields (key) | Source of truth | Validation | Notes |
|---|---|---|---|---|

### E2. API (REST/GraphQL/etc)
| Endpoint | Method | Auth | Request | Response | Error codes |
|---|---|---|---|---|---|

### E3. AuthN/AuthZ
- RBAC/ABAC 모델:
- Token/session 전략:
- Audit log 요구:

## F. Repo / Package Structure (벤치마크 기반)
- Target tree(초안):
  - /apps
  - /packages
  - /services
  - /docs (ADR 포함)
  - /scripts
  - /infra
- Naming conventions:
- Lint/format/typecheck 배치:
- Migration path(현재 구조에서 목표 구조로):

## G. Implementation Plan (Epics → Stories → Tasks → PRs)
### G1. Epics (필수)
| Epic | Goal | Deliverables | Acceptance Criteria | Dependencies | Risks |
|---|---|---|---|---|---|

### G2. Story Breakdown (Epic별)
- Epic 1:
  - Story 1.1:
  - Story 1.2:
- Epic 2:
  - ...

### G3. PR Plan (≥ 6 PR 권장, 각 PR은 작게)
| PR | Scope | Target files/modules | Tests | Rollback note | Owner |
|---|---|---|---|---|---|

### G4. Feature Flags / Canary
- Flag 전략:
- Canary 단계:
- Rollback 트리거(수치 기준):

### G5. Timeline & Resourcing
- 30일:
- 60일:
- 90일:
- 필요 인력/역할(Dev/QA/Design/DevOps):

## H. Testing Strategy (Quality Gates)
### H1. Test Pyramid
- Unit:
- Integration:
- E2E:
- Perf/Load:
- Security:

### H2. CI Gates
- Lint/format:
- Typecheck:
- Unit test:
- Integration test:
- E2E gate(선택):

### H3. Test Data & Fixtures
- 데이터 생성:
- Mocking 전략:
- 환경 분리(dev/stg/prod):

## I. Observability & Operations (Runbook 포함)
### I1. Logging/Tracing/Metrics
- Logs:
- Metrics:
- Tracing(OpenTelemetry):
- Dashboard(모니터링 패널):

### I2. Alerting & On-call
- Alert rules:
- Escalation:
- SLO breach 대응:

### I3. Runbooks (필수)
- Deploy:
- Rollback:
- Incident response:
- Data repair(있으면):

## J. Error Handling & Recovery (에러대응방안)
### J1. Error taxonomy
- 사용자 입력 오류(4xx):
- 서버 오류(5xx):
- 외부 의존성 오류:
- 시간초과/네트워크 오류:

### J2. Retry/Timeout/Idempotency
- Timeout 정책:
- Retry 정책(backoff, jitter):
- Idempotency key/중복 처리:
- Circuit breaker / fallback:

### J3. UX Error Messaging
- 사용자 메시지 규칙:
- 재시도 유도 UX:
- 장애 시 제한 모드:

## K. Dependencies, Security, Risks
### K1. Dependencies
| Dependency | Type(lib/service) | Version policy | License | Risk | Mitigation |
|---|---|---|---|---|---|

### K2. Security
- Secrets 관리:
- 권한 최소화:
- Supply-chain(Dependabot/SBOM):
- Prompt injection(에이전트 사용 시):

### K3. Risk Register
| Risk | Likelihood | Impact | Trigger | Mitigation | Owner |
|---|---|---|---|---|---|

### K4. Change Control (필수)
- Dry-run:
- Change list:
- Explicit approval:
- Post-change verification:

## ㅋ. Appendix (Evidence + Benchmarks)
### ㅋ1. Evidence Table (Ideas + Benchmarks)
| Type(idea/benchmark) | platform | title/repo | url | published/created | updated/pushed | accessed_date | popularity_metric |
|---|---|---|---|---|---|---|---|

### ㅋ2. Benchmarked repo notes (각 repo 5줄 요약)
- Repo 1:
- Repo 2:
- ...

### ㅋ3. Glossary
- ...
