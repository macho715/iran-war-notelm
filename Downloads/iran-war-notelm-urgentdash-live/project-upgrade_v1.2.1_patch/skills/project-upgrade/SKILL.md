---
name: project-upgrade
description: >-
  Doc-first + EN 웹 리서치(2025-06+)로 프로젝트 업그레이드 아이디어 Top10과 Best3 Deep Report,
  그리고 Deep2(Deep Report → PASS/FAIL + Apply Gates) 검증까지 산출한다. Evidence(출처/원본날짜/인기지표)는 필수다.
disable-model-invocation: true
metadata:
  version: "1.2.1"
  updated: "2026-03-02"
  tz: "Asia/Dubai"
---

# project-upgrade (v1.2.1)

> 목적: 프로젝트 문서/코드 이해 → (EN) 외부 근거 수집 → 업그레이드 아이디어/로드맵/Best3 Deep → (선택) Deep2 검증.

## When to Use
- "업그레이드 아이디어 + 로드맵 + 근거(출처/날짜)까지"가 필요할 때
- "2025-06 이후 트렌드/베스트프랙티스 기반으로 개선점"을 뽑아야 할 때
- "Best 3를 Deep report로 설계(PR plan/테스트/롤백 포함)"까지 문서화해야 할 때
- "Deep 결과를 PASS/FAIL + 적용 게이트까지 한 번 더 정리(Deep2)"해야 할 때

## Hard Rules (Fail-safe)
- **Doc-first**: 레포 문서/코드 상태를 먼저 스냅샷으로 정리(추정 금지).
- **Evidence 필수**: 모든 Top10 아이디어는 Evidence ≥ 1. Best3는 Evidence ≥ 2.
- **원본데이터 날짜 필수**: evidence에 `published_date` 또는 `updated_date`가 없으면 **AMBER_BUCKET**으로 격리(Top10/Best3 채택 불가).
- **EN-only + 2025-06+**: 외부 리서치는 영어 자료, 2025-06-01 이후 게시/업데이트 자료만 채택.
- **자동 코드 변경/커밋/배포 금지**: 이 스킬은 "제안+계획 문서화"만 한다(적용은 별도 승인 워크플로).
- **3개 미만 Best3 금지**: Best3 Gate를 통과한 후보가 3개 미만이면 `BEST3_INCOMPLETE`로 종료하고 결손 사유/추가 리서치 요구를 기록한다.

## Inputs (권장 입력 카드)
- 목표/범위: 예) backend+CI, docs-only, security-only
- 제약: 언어/프레임워크/CI, 인터넷 허용 여부, 규정/보안 금지사항
- (있으면) 현재 이슈: 장애/성능/보안/개발경험 pain point, 최근 릴리즈 이슈 등

## Procedure (6단계)
1) **Doc-first 진단 (권장: `upgrade-doc-auditor`)**
- README/docs/ADR/SECURITY/CI 설정을 읽고 Current State Snapshot + evidence_paths 생성
- "아이디어 제안 금지", 현상/제약/리스크만 기록

2) **Stack/Constraints 정리**
- build/test/CI/배포/런타임 제약을 표로 정리

3) **External Research (권장: `upgrade-web-scout`)**
- GitHub/Medium/GeekNews/Reddit + (필요 시) 공식 docs/신뢰 블로그
- Evidence Schema 충족 항목만 `TOP_HITS`로 채택, 나머지는 `AMBER_BUCKET`

4) **Synthesis: Top10 산출**
- 6버킷( Reliability / Security / Performance / DX / Architecture / Docs )으로 정리
- PriorityScore 권장식: `(Impact × Confidence) / (Effort × Risk)`
- Top10 각 아이디어: Evidence ≥ 1, 날짜 충족

5) **Best3 Deep Report (권장: `upgrade-deep-synth`)**
- Top10 중 Best3 선정(각각 Evidence ≥ 2 + 날짜 필수)
- Deep Dive: Goal, Design, PR Plan(≥3), Tests, Rollout/Rollback, Risks, KPIs, Evidence

6) **Verification (권장: `upgrade-verifier`)**
- Top10/Best3가 스택/제약과 충돌 없는지 PASS/AMBER/FAIL 판정
- Deep2 모드: deep-synth 결과를 받아 Apply Gates(dry-run→change list→explicit approval)까지 확정

## Modes
### A) Full Pipeline (기본)
- 1~6 단계 전부 수행 → 최종 `UPGRADE_REPORT` 생성

### B) Deep-only (deep report만)
- 입력으로 `Current State Snapshot + Top10 + Evidence Table`을 제공하고,
- `upgrade-deep-synth`가 Best3 Deep Report만 출력한다(문서/웹 리서치 금지)

### C) Deep2 (2-step deep pipeline)
- Step1: `upgrade-deep-synth`로 Deep Report only 생성
- Step2: `upgrade-verifier`로 PASS/FAIL + Apply Gates + Go/No-Go 확정
- 복붙 프롬프트: `references/deep2-runbook.md`
- Handoff 계약: `references/handoff-contract.md`

## Outputs
### Full Pipeline Output (UPGRADE_REPORT)
- Executive Summary
- Current State Snapshot(표) + evidence_paths
- Upgrade Ideas Top 10(표 + Evidence)
- Best 3 Deep Report(섹션 분리)
- Options A/B/C
- 30/60/90-day Roadmap
- Evidence Table (원본 URL + published/updated + accessed + popularity)
- AMBER_BUCKET (날짜/인기지표 누락 등)
- Open Questions (≤3)

### Deep-only Output
- Best3 Gate Summary(표)
- BEST #1~#3 Deep Dive
- JSON Envelope(best3[], meta)

### Deep2 Output (Verifier)
- PASS/AMBER/FAIL Table (Best3)
- Apply Gates 0~4 (dry-run → change list → explicit approval → canary → rollback)
- Rollout/Rollback Triggers
- Minimal Test Matrix
- PR Plan Sanity Check
- Final Go/No-Go + AMBER/Open Questions(≤3)

## References
- `references/source-policy.md` (허용 소스/증거 규칙/AMBER 기준)
- `references/query-playbook.md` (플랫폼별 검색/증거 수집 가이드)
- `references/output-template.md` (UPGRADE_REPORT 템플릿)
- `references/deep2-runbook.md` (Deep-only/Deep2 복붙 프롬프트)
- `references/handoff-contract.md` (Deep2 handoff 계약)
