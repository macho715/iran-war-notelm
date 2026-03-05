# project-plan (Cursor Skill) — v1.0.0

## 목적
- project-upgrade 산출물(Top10/Best3/Deep2) + Evidence를 입력으로 받아
- GitHub 중심(EN, 2025-06+) 인기 repo의 **구조/설계 패턴**을 벤치마크하고
- UI/UX → Architecture → Code Implementation → Testing/CI/CD → Observability/Runbook → Error/Recovery까지
  **아주 자세한 PLAN 문서**를 생성한다.

## 설치 위치(권장: 모든 프로젝트 공통)
- User-level(전역): `~/.cursor/skills/project-plan/` + `~/.cursor/agents/`
- Project-level(레포): `.cursor/skills/project-plan/` + `.cursor/agents/`

## 실행(예시)
- 전체 플랜:
  - `/project-plan 목표: Next 30일 내 MVP, 범위: dashboard+api`
- “이미 아이디어가 있다” 모드:
  - Current Snapshot + Top10 + Evidence Table을 붙여넣고 “project-plan로 Plan Doc 작성”이라고 지시
- 병렬 추천:
  - plan-benchmark-scout(background) → plan-author → plan-verifier

## 산출물
- PLAN_DOC (A~K + ㅋ)
- Evidence Table (Ideas + Benchmarks)
- Risk Register
- 30/60/90-day Delivery Plan

## Runbook
- `references/plan-runbook.md` (3-step: benchmark → author → verifier)
