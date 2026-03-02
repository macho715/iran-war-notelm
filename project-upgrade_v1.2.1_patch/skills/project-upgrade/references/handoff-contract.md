# Deep2 Handoff Contract (upgrade-deep-synth -> upgrade-verifier)

## Purpose
- upgrade-deep-synth 출력물을 upgrade-verifier가 "감사 가능"하게 재검증(PASS/FAIL)하고,
  적용 게이트(rollout/rollback/approval)를 표준 포맷으로 고정한다.

## Required Inputs to Verifier
A) Current State Snapshot
- 최소: 스택/CI/배포/테스트/운영 제약 요약(표 또는 bullets)
- Evidence: repo path 기반

B) Deep Synth Output (MUST include)
1) Best3 Gate Summary table
2) Deep Dive sections for Best #1~#3
3) JSON Envelope (best3[], meta.version/tz 포함)

## Evidence Rules (Verifier Gate)
- Best3: idea당 evidence >= 2
- 각 evidence는 published_date 또는 updated_date 중 1개는 반드시 포함
- 날짜 누락/출처 누락은 AMBER 또는 FAIL로 처리(발생 사유 표기)

## Output Contract (Verifier Final)
1) PASS/FAIL Table (Best3 기준)
2) Apply Gates (dry-run -> change list -> explicit approval)
3) Rollout & Rollback Triggers (명시)
4) Minimal Test Matrix (필수 테스트 세트)
5) PR Plan Sanity Check (PR 범위/순서/의존성/대체 경로)
6) AMBER Bucket (확인 필요 ≤3)
7) Final "Go/No-Go" Recommendation
