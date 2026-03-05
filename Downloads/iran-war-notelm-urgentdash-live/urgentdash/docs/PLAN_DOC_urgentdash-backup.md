# PLAN_DOC — urgentdash 실시간 정보 백업 (A~K + ㅋ)

> 기준 문서: `dashboard_bundle/docs/URGENTDASH_BACKUP.md`  
> 범위: iran-war-notelm 스크립트를 활용한 urgentdash 실시간 정보 백업 기능의 설계·구현·운영 플랜.

---

## A. Executive Summary

- **목표**: urgentdash에 표시되는 실시간 정보(스크래퍼 수집 결과 + 대시보드 스냅샷)를 iran-war-notelm의 스토리지 레이아웃으로 일원화하여 백업·복구·감사에 활용할 수 있게 한다.
- **비즈니스/제품 KPI**  
  - 백업 성공률: 스크래퍼 run 1회당 1 run 저장 성공.  
  - 스냅샷 보존: urgentdash 스냅샷 1회 실행당 1개 JSON + 1줄 jsonl append.  
  - 저장 위치 일원화: `STORAGE_ROOT` 하위 단일 레이아웃(reports, db, urgentdash_snapshots).  
  - 복구 가능성: 시점별 JSON + 일별 jsonl로 특정 시점 재현 가능.
- **범위**  
  - **In-scope**: run_now.py 기반 스크래퍼 백업 활용, backup_urgentdash.py 스냅샷 저장, 스토리지 레이아웃 확장, 문서화, (선택) 대시보드 Export JSON.  
  - **Out-of-scope**: 실시간 동기화 API, 대시보드 자동 갱신, 외부 클라우드 전용 백업 서비스.
- **핵심 결정 3개**  
  1) 스크래퍼 백업은 기존 `run_now.py` + `persist_run_backend()` 재사용.  
  2) urgentdash 스냅샷은 JSON 파일 입력 → `storage/urgentdash_snapshots/`에 시점별·일별 저장.  
  3) 레이아웃·설정은 notelm과 공유(`ensure_layout`, `STORAGE_ROOT`).
- **30/60/90 요약**  
  - 30일: 스크래퍼 백업 절차 고정, 스냅샷 스크립트·문서 정리, (선택) Export JSON.  
  - 60일: 정기 백업(cron/GHA)에 스냅샷 포함, Runbook 반영.  
  - 90일: 복구·감사 시나리오 검증, 보존 주기 정책 명시.

---

## B. Context & Requirements (PRD-lite)

### B1. 문제정의

- **현재 문제**: urgentdash 데이터(INTEL_FEED, INDICATORS 등)는 코드/HTML에 하드코딩되어 있어 시점별 이력이 남지 않음. 스크래퍼 수집 결과는 notelm `persist_run`으로 저장되나, 대시보드 스냅샷과 동일 레이아웃으로 관리되지 않음.
- **증거(Current Snapshot)**: `dashboard_bundle/docs/URGENTDASH_BACKUP.md` — 스크래퍼는 run_now, 스냅샷은 수동 JSON 후 backup_urgentdash.py.
- **왜 지금**: 분쟁 상황에서 실시간 정보 손실 시 복구·감사 불가; 스토리지 일원화 시 운영·정기 백업 단순화.

### B2. 사용자/페르소나

- **Primary**: 운영자 — 주기적으로 run_now 실행·스냅샷 백업 실행·저장 위치 확인.
- **Secondary**: 분석자 — 과거 시점 스냅샷/run 조회·복구.

### B3. 사용자 시나리오

- **Story 1**: 운영자가 `run_now.py --dry-run` 한 번 실행으로 당일 스크래퍼 수집 결과가 reports/db에 저장되는지 확인한다.
- **Story 2**: 운영자가 urgentdash 데이터를 JSON으로 저장한 뒤 `backup_urgentdash.py`를 실행해 스냅샷이 urgentdash_snapshots/에 저장되는지 확인한다.
- **Story 3**: 분석자가 특정 날짜/시간의 스냅샷 JSON을 열어 당시 intel_feed/indicators를 복원한다.

### B4. 요구사항

- **Functional**: (1) run_now 실행 시 기존대로 run·articles·outbox 저장. (2) backup_urgentdash.py가 지정 JSON을 읽어 snapshot_ts 부여 후 시점별 JSON + 일별 jsonl에 저장. (3) 저장 경로는 STORAGE_ROOT 기준.
- **Non-functional**: 스크립트 실행 시간 수 초 이내; 기존 notelm 파이프라인 변경 최소화.
- **Constraints**: notelm 레포 구조·config 유지; 파괴적 스키마 변경 없음(파일 기반 스냅샷만 추가).

---

## C. UI/UX Plan (IA → Flow → Screens)

### C1. Information Architecture

- **Navigation**: CLI 진입점 2개 — `dashboard_bundle/scripts/run_now.py`, `dashboard_bundle/scripts/backup_urgentdash.py`. (선택) 대시보드 내 "Export JSON" 버튼.
- **콘텐츠 구조**: storage/reports(스크래퍼 run), storage/db(기사·run 메타), storage/urgentdash_snapshots(스냅샷).

### C2. User Flow

- **Flow 1 — 스크래퍼 백업**: 터미널에서 repo 루트로 이동 → `python dashboard_bundle/scripts/run_now.py --dry-run` 실행 → storage/reports, storage/db에 파일 생성 확인.
- **Flow 2 — 스냅샷 백업**: urgentdash 데이터를 JSON 파일로 준비(수동 또는 Export) → `python dashboard_bundle/scripts/backup_urgentdash.py [경로]` 실행 → storage/urgentdash_snapshots/ 하위 파일 확인.

### C3. 화면/컴포넌트

| Screen | Purpose | Key Components | Data Needed | Edge cases |
|--------|---------|----------------|-------------|------------|
| CLI run_now | 스크래퍼 1회 실행 | argparse, app pipeline | config, scrapers | 파일 없음/권한 오류 시 로그 |
| CLI backup_urgentdash | 스냅샷 1회 저장 | argparse, storage helpers | snapshot JSON path | 파일 없음 → exit 1, 안내 메시지 |
| (선택) Dashboard Export | JSON 다운로드 | 버튼, blob download | 현재 state | 브라우저 호환 |

### C4. Design System / Accessibility

- CLI: 표준 stdout/stderr; exit code 0/1. 에러 시 stderr에 메시지 + dashboard_bundle/docs/URGENTDASH_BACKUP.md 참조 안내.

---

## D. System Architecture (Components & Boundaries)

### D1. High-level Components

- **Frontend**: 없음(CLI). 선택 시 urgentdash 정적 페이지에 Export 버튼만 추가.
- **Backend/API**: 없음.
- **Data store**: 파일 시스템 — `STORAGE_ROOT/reports`, `STORAGE_ROOT/db`, `STORAGE_ROOT/urgentdash_snapshots`. 기존 SQLite/Postgres(runs, articles) 유지.
- **Async/Queue**: 없음. 순차 실행.
- **External**: notelm scrapers(RSS, UAE, SNS); 설정은 기존 config/settings.

### D2. Data Flow

- **run_now**: scrape → dedup → phase2 → persist_run_backend() → reports/db/jsonl.
- **backup_urgentdash**: JSON 파일 읽기 → payload = { snapshot_ts, ...snapshot } → save_json(시점별) + append_jsonl(일별).

### D3. Boundary Rules

- `dashboard_bundle/scripts/backup_urgentdash.py`: `src.iran_monitor.config`, `src.iran_monitor.storage`만 사용. 스크래퍼/phase2 미의존.
- 스토리지 레이아웃 변경은 `storage.ensure_layout()`에만 추가(이미 urgentdash_snapshots 반영).

---

## E. Data Model & API Contract

### E1. Data model (Snapshot)

| Entity | Fields (key) | Source of truth | Validation | Notes |
|--------|--------------|-----------------|------------|--------|
| Snapshot payload | snapshot_ts, intel_feed, indicators, hypotheses, routes, checklist | 입력 JSON | JSON parse 가능 여부 | snapshot_ts는 스크립트 부여(iso_now) |
| 시점별 파일 | - | urgentdash_snapshots/YYYY-MM-DD/HH-MM.json | - | 1파일 = 1시점 |
| 일별 jsonl | - | urgentdash_snapshots/YYYY-MM-DD.jsonl | 1줄 = 1 JSON 객체 | append-only |

### E2. API

- CLI만 해당. REST/GraphQL 없음.

### E3. AuthN/AuthZ

- 로컬/서버 파일 시스템 권한에 따름. 별도 Auth 없음.

---

## F. Repo / Package Structure

- **유지**: 기존 iran-war-notelm-main 루트, `src/iran_monitor/`, `scripts/`, `urgentdash/`, `docs/`.
- **변경**: `src/iran_monitor/storage.py` — ensure_layout에 `urgentdash_snapshots` 추가. `dashboard_bundle/scripts/backup_urgentdash.py` 신규. `dashboard_bundle/docs/URGENTDASH_BACKUP.md`, `dashboard_bundle/ui/urgentdash_snapshot.example.json` 신규.
- **Naming**: 스냅샷 JSON 키는 소문자+스네이크(intel_feed, indicators 등)로 문서화.

---

## G. Implementation Plan (Epics → Stories → PRs)

### G1. Epics

| Epic | Goal | Deliverables | Acceptance Criteria | Dependencies | Risks |
|------|------|--------------|---------------------|--------------|--------|
| E1. 스크래퍼 백업 고정 | run_now로 실시간 수집 백업 공식화 | 문서, (선택) runbook | URGENTDASH_BACKUP §1 반영, dry-run으로 검증 | 없음 | 없음 |
| E2. 스냅샷 백업 구현 | urgentdash 스냅샷을 notelm 스토리지에 저장 | backup_urgentdash.py, ensure_layout 확장, 예제 JSON | 지정 JSON → 시점별 json + 일별 jsonl 생성 | storage, config | 잘못된 JSON → exit 1 |
| E3. (선택) Export UX | 대시보드에서 JSON 내보내기 | Export 버튼 + 다운로드 | 클릭 시 위 스키마 JSON 다운로드 | urgentdash 소스 | 없음 |

### G2. Story Breakdown

- **E1**: Story 1.1 — URGENTDASH_BACKUP.md에 run_now 절차·경로 명시. Story 1.2 — (선택) Runbook에 "스크래퍼 백업" 단계 추가.
- **E2**: Story 2.1 — ensure_layout에 urgentdash_snapshots 추가. Story 2.2 — backup_urgentdash.py 구현(인자, load_snapshot, save_json/append_jsonl). Story 2.3 — 예제 JSON·문서 작성.
- **E3**: Story 3.1 — 대시보드에 Export 버튼. Story 3.2 — 현재 state → JSON blob 다운로드.

### G3. PR Plan

| PR | Scope | Target files/modules | Tests | Rollback note | Owner |
|----|-------|----------------------|-------|---------------|-------|
| PR1 | 스토리지 레이아웃 | src/iran_monitor/storage.py | 기존 persist_run 테스트 유지 | ensure_layout 한 줄 제거 | - |
| PR2 | 백업 스크립트 | dashboard_bundle/scripts/backup_urgentdash.py | 수동 실행 검증(예제 JSON) | 스크립트 삭제 | - |
| PR3 | 문서·예제 | dashboard_bundle/docs/URGENTDASH_BACKUP.md, dashboard_bundle/ui/urgentdash_snapshot.example.json | 없음 | 파일 삭제 | - |
| PR4 | (선택) Export | dashboard_bundle/ui/index.html 또는 hyie-erc2-dashboard.jsx | 수동 클릭 검증 | 버튼 제거 | - |

### G4. Feature Flags / Canary

- 별도 플래그 없음. 스크립트·경로 추가만으로 기존 동작 변경 없음.

### G5. Timeline & Resourcing

- **30일**: PR1~PR3 반영, 정기 실행 절차 문서화.
- **60일**: cron/GHA에 backup_urgentdash 호출(선택) 추가, Runbook에 스냅샷 백업·복구 절차 명시.
- **90일**: 보존 주기(예: 90일) 정책 및 정리 스크립트(선택) 검토.

---

## H. Testing Strategy

### H1. Test Pyramid

- **Unit**: storage.ensure_layout 호출 시 urgentdash_snapshots 디렉터리 생성 여부(기존 테스트 확장 가능).
- **Integration**: backup_urgentdash.py에 예제 JSON 넣어 실행 → 지정 경로에 파일·한 줄 jsonl 생성 확인.
- **E2E**: run_now --dry-run 후 reports/db에 파일 존재 확인(기존).
- **Perf/Security**: 미적용(로컬 파일 I/O만).

### H2. CI Gates

- 기존: lint, format, unit. backup_urgentdash는 스크립트 단독 실행 테스트로 충분(CI에서 한 번 실행해 exit 0 확인 가능).

### H3. Test Data & Fixtures

- `dashboard_bundle/ui/urgentdash_snapshot.example.json`을 fixture로 사용.

---

## I. Observability & Operations

### I1. Logging/Tracing/Metrics

- **Logs**: backup_urgentdash는 성공 시 stdout에 저장 경로 2줄 출력; 실패 시 stderr + exit 1.
- **Metrics**: 없음. 필요 시 cron 실행 성공/실패만 로그.

### I2. Alerting & On-call

- 정기 백업 실패 시 알림은 cron/GHA 실패 알림에 의존.

### I3. Runbooks

- **Deploy**: 코드 배포만. 설정 변경 없음.
- **Rollback**: PR1 롤백 시 ensure_layout에서 urgentdash_snapshots 줄 제거. PR2 롤백 시 스크립트 삭제.
- **Incident**: 스냅샷 누락 시 해당 시점 JSON이 없으면 복구 불가; 정기 실행 주기 유지로 완화.
- **Data repair**: jsonl 중복 append는 허용(동일 시점 여러 번 실행 시 여러 줄). 필요 시 스크립트로 중복 제거 가능.

---

## J. Error Handling & Recovery

### J1. Error taxonomy

- **입력 오류**: JSON 파일 없음 → exit 1, stderr 안내. JSON 파싱 실패 → exit 1, traceback 또는 단순 메시지.
- **파일 시스템**: 디스크 full/권한 없음 → 예외 전파, exit 1.
- **외부 의존성**: config/settings 로드 실패(STORAGE_ROOT 등) → import 또는 실행 시 예외.

### J2. Retry/Timeout/Idempotency

- **Timeout**: 없음(로컬 파일만).
- **Retry**: 스크립트 재실행 시 동일 시점에 같은 hour bucket에 덮어쓰기(save_json). jsonl은 append만 하므로 중복 줄 가능 — 허용.
- **Idempotency**: 동일 JSON으로 같은 분 내 재실행 시 같은 HH-MM.json으로 덮어쓰기 → 동일 시점에는 1개 파일 유지.

### J3. UX Error Messaging

- CLI: "Error: snapshot file not found: {path}", "Export urgentdash data to JSON first (see dashboard_bundle/docs/URGENTDASH_BACKUP.md)."

---

## K. Dependencies, Security, Risks

### K1. Dependencies

| Dependency | Type | Version policy | License | Risk | Mitigation |
|------------|------|-----------------|---------|------|-------------|
| iran_monitor.storage | internal | - | - | - | - |
| iran_monitor.config | internal | - | - | - | - |
| Python stdlib (json, pathlib, argparse) | stdlib | 3.9+ | PSF | 없음 | - |

### K2. Security

- **Secrets**: STORAGE_ROOT 등 기존 notelm 설정만 사용. 스냅샷 JSON에 민감 정보 넣지 않도록 문서 안내.
- **권한**: 스크립트 실행 사용자와 동일한 파일 시스템 권한.
- **Supply-chain**: 변경 없음.

### K3. Risk Register

| Risk | Likelihood | Impact | Trigger | Mitigation | Owner |
|------|------------|--------|---------|------------|-------|
| 스냅샷 JSON 스키마 불일치 | 중 | 스크립트 실패 또는 불완전 저장 | 대시보드 필드 변경 | 예제 JSON·문서로 스키마 고정, 버전 필드(선택) | - |
| 디스크 부족 | 낮 | 저장 실패 | storage 볼륨 full | 모니터링·알림, 보존 주기 정리 | - |
| STORAGE_ROOT 오설정 | 낮 | 잘못된 경로에 저장 | env/config 오타 | 문서·예제로 기본값 명시 | - |

### K4. Change Control

- **Dry-run**: run_now는 기존 `--dry-run` 유지. backup_urgentdash는 읽기+쓰기만 하므로 별도 dry-run 없음(필요 시 `--dry-run` 시 실제 저장 생략 옵션 추가 가능).
- **Change list**: PR별로 변경 파일 목록 명시(위 G3).
- **Explicit approval**: 파괴적 변경 없음; 필요 시 배포 전 확인.
- **Post-change verification**: PR2 적용 후 예제 JSON으로 한 번 실행해 경로·파일 확인.

---

## ㅋ. Appendix (Evidence + Benchmarks)

### ㅋ1. Evidence Table

| Type | platform | title/repo | url | published/created | updated/pushed | accessed_date | popularity_metric |
|------|----------|------------|-----|-------------------|----------------|---------------|-------------------|
| idea | internal | URGENTDASH_BACKUP 설계 | dashboard_bundle/docs/URGENTDASH_BACKUP.md | - | - | 2026-03-03 | N/A (internal) |
| idea | internal | notelm storage layout | src/iran_monitor/storage.py | - | - | 2026-03-03 | N/A |
| benchmark | - | (본 플랜은 단일 기능 범위; 벤치마크 repo 미수행) | - | - | - | - | - |

### ㅋ2. Benchmarked repo notes

- 본 플랜은 iran-war-notelm 내부 기능(urgentdash 백업)만 대상으로 하여, 외부 벤치마크 repo 수집은 생략함. 필요 시 project-upgrade + plan-benchmark-scout로 별도 수행.

### ㅋ3. Delivery Plan (PR-sized, 요약)

| 기간 | 작업 |
|------|------|
| 30일 | PR1~PR3 반영(storage 레이아웃, backup_urgentdash.py, 문서·예제). run_now 백업 절차 문서 고정. |
| 60일 | cron/GHA에 backup_urgentdash 호출(선택) 추가. Runbook에 스냅샷 백업·복구 절차 명시. |
| 90일 | 보존 주기 정책 검토. 복구·감사 시나리오 1회 검증. |

### ㅋ4. Glossary

- **실시간 정보**: 스크래퍼 수집 결과(run + articles) + urgentdash 대시보드 스냅샷(intel_feed, indicators, hypotheses, routes, checklist).
- **STORAGE_ROOT**: notelm 설정에 따른 저장 루트 경로(기본 `.`).
- **시점별/일별 저장**: urgentdash_snapshots/YYYY-MM-DD/HH-MM.json(시점별), urgentdash_snapshots/YYYY-MM-DD.jsonl(일별 append).

