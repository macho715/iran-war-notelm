---
name: project-plan
description: >-
  (Doc-first + 2025-06+ EN web research) 업그레이드 아이디어(Top10/Best3/Deep2)와
  GitHub 중심 벤치마크(인기 repo, 2025-06-01 이후 created/pushed)를 병합해
  UI/UX→아키텍처→코드 구현→테스트/운영→에러 대응/롤백까지 “아주 자세한” PLAN 문서를 작성한다.
  트리거: plan, roadmap, spec, design doc, tech spec, implementation plan.
disable-model-invocation: true
metadata:
  version: "1.0.0"
  updated: "2026-03-03"
  tz: "Asia/Dubai"
compatibility:
  requires_internet: true
  sources_language: "EN-only"
---

# project-plan (v1.0.0)

## When to Use
- project-upgrade에서 **아이디어(Top10/Best3/Deep2)**가 나온 뒤, 실행 가능한 “전체 플랜 문서(Plan Doc)”가 필요할 때
- UI/UX부터 실제 코드 구현, 에러 대응, 의존성, 테스트/운영/롤백까지 **A~K(+ㅋ) 수준으로 상세 문서화**가 필요할 때
- 2025-06+ **GitHub 인기 repo 구조/설계 패턴**을 벤치마크해, 내 프로젝트 플랜에 **정합성 있게 병합**하고 싶을 때

## Non-goals (절대 하지 말 것)
- 자동 코드 변경/커밋/배포/삭제 금지 (본 스킬은 “문서 작성”만)
- 출처/날짜/인기지표 없는 자료를 “근거”로 확정 금지 (AMBER_BUCKET로 격리)
- 내부 토큰/키/내부 URL/PII/NDA 노출 금지

## Inputs (권장)
> 이상적 입력은 project-upgrade 산출물에서 그대로 복사해 넣는다.

### Required (최소)
1) Current State Snapshot (표 또는 bullets)
2) Selected Ideas
   - Top10 표(Impact/Effort/Risk/Confidence/PriorityScore 포함) 또는 Best3 Deep/Deep2 결과
3) Evidence Table (아이디어 근거)
   - 각 아이디어별 platform/title/url/published_date 또는 updated_date/accessed_date/popularity_metric

### Optional
- 범위/제약: 일정(주), 리스크 허용도, 예산, 팀/리소스, 인터넷/보안 제약
- 목표 KPI: (예) p95 latency, crash-free, CI time, 비용, 운영 TTR 등

## Evidence (MUST)
- 아이디어 근거(evidence)는 project-upgrade 규격을 유지한다.
- 벤치마크 근거는 GitHub repo 기준:
  - repo_url
  - created_date(YYYY-MM-DD) 또는 pushed_date(YYYY-MM-DD) 중 1개 이상
  - accessed_date(실행일)
  - popularity_metric (stars/forks/issues/users 등 가능한 지표 1개 이상)
  - why_relevant(1~2줄)
- 날짜/지표 누락 시 AMBER_BUCKET로 격리(Plan의 핵심 결정 근거로 사용 금지)

## Procedure (권장 5단계)
### Step 1) Input Gate (필수)
- Required 입력 3개가 모두 있으면 계속
- 없으면:
  - (권장) 먼저 `/project-upgrade`로 Top10 + Evidence Table 생성
  - 또는 사용자가 최소 입력을 제공하도록 요청(최대 3개)

### Step 2) Benchmark Research (GitHub 중심, 2025-06+)
- plan-benchmark-scout를 호출해, 스택/도메인에 맞는 “인기 repo” 8~15개를 수집
- 필터:
  - created:>=2025-06-01 또는 pushed:>=2025-06-01
  - stars/forks 기준은 스택 규모에 따라 동적으로(기본 stars>=500 권장)
  - 템플릿/레퍼런스 구조(폴더, CI, 테스트, 운영) 추출

### Step 3) Merge (Ideas × Benchmarks)
- 아이디어를 “설계 결정(Decision)” 단위로 재정의하고, 각 Decision에:
  - 적용 범위(모듈/폴더/컴포넌트)
  - 구현 접근(패턴/라이브러리/아키텍처)
  - 벤치마크 근거(Repo Evidence) 1~2개
  - 리스크/대안/롤백
  를 부착한다.

### Step 4) Plan Authoring (A~K + ㅋ)
- plan-author를 호출해 `references/plan-template.md` 포맷으로 **최대한 자세히** 작성한다.
- 반드시 포함:
  - UI/UX(IA, user flow, 화면/컴포넌트, 접근성)
  - 아키텍처(컴포넌트/데이터/인터페이스)
  - 코드 구현(모듈 경계, 파일/폴더 단위 PR plan)
  - 테스트/CI/CD/관측(Logs/Metrics/Tracing)
  - 에러 대응(재시도/Idempotency/Timeout/Circuit breaker/사용자 메시지)
  - 의존성/라이선스/마이그레이션
  - 운영(runbook) + incident 대응 + 롤백 트리거

### Step 5) Verification & Gates
- plan-verifier로 플랜 완전성/정합성 검증(PASS/AMBER/FAIL)
- 파괴적 작업이 포함되면 항상:
  1) dry-run
  2) change list
  3) explicit approval
  게이트를 플랜에 명시한다.

## Outputs (MUST)
- PLAN_DOC (Markdown) — `references/plan-template.md`를 기반으로 A~K(+ㅋ) 구성
- Evidence Table (Ideas + Benchmarks)
- Risk Register (Top risks + mitigations)
- Delivery Plan (30/60/90 + PR-sized)
- JSON Envelope (optional, automation용)

## References
- references/source-policy.md
- references/benchmark-query-playbook.md
- references/plan-template.md
- references/quality-gates.md
- references/plan-runbook.md
