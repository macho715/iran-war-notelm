1. **판정: 예(2-step deep pipeline 확장 패치)** — `upgrade-deep-synth → upgrade-verifier`로 **Deep 결과를 재검증(PASS/FAIL) + 적용 게이트(dry-run→change list→explicit approval)**까지 정리하는 흐름을 추가합니다.
2. **근거:** Deep 보고서는 “설계/PR/테스트”는 강하지만, **레포 제약·breaking surface·롤백 게이트**를 2차로 못 박아야 운영 리스크가 내려갑니다(특히 Best3).
3. **다음 행동:** 아래 **NEW 2개 파일 생성 + 기존 3개 파일 패치** → Cursor 재시작 → `deep2-runbook`의 프롬프트 2개를 그대로 실행.

---

## Package (Patch v1.2) — 파일 트리

```text
~/.cursor/
  skills/
    project-upgrade/
      SKILL.md                               # PATCH
      README.md                              # PATCH
      references/
        deep2-runbook.md                     # NEW
        handoff-contract.md                  # NEW
  agents/
    upgrade-verifier.md                      # PATCH
```

---

# 1) NEW: `~/.cursor/skills/project-upgrade/references/handoff-contract.md`

```md
# Deep2 Handoff Contract (upgrade-deep-synth -> upgrade-verifier)

## Purpose
- upgrade-deep-synth 출력물을 upgrade-verifier가 “감사 가능”하게 재검증(PASS/FAIL)하고,
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
7) Final “Go/No-Go” Recommendation
```

---

# 2) NEW: `~/.cursor/skills/project-upgrade/references/deep2-runbook.md`

```md
# Deep2 Runbook (2-step deep pipeline)

## Step 1) Deep Report Only (upgrade-deep-synth)
### Prompt (copy-paste)
upgrade-deep-synth로 deep report만 작성.
입력은 아래 3개 블록만 사용하고, 외부 리서치/문서 스캔은 하지 마.
Best3는 evidence>=2 + (published_date 또는 updated_date 필수) 조건 통과한 것만 선정해.
출력은 deep report only(템플릿 그대로)로.

[CURRENT_STATE_SNAPSHOT]
(여기에 표/요약 붙여넣기)

[TOP10_IDEAS]
(여기에 Top10 표/리스트 붙여넣기: Impact/Effort/Risk/Conf/PriorityScore 포함)

[EVIDENCE_TABLE]
(여기에 Evidence Table 붙여넣기: platform/title/url/published_date/updated_date/accessed_date/popularity_metric 포함)

## Step 2) Gate + PASS/FAIL + Apply Plan (upgrade-verifier)
### Prompt (copy-paste)
upgrade-verifier로 “Deep2 Gate Review” 수행.
아래 deep-synth 결과를 입력으로 받아 Best3를 PASS/AMBER/FAIL로 판정하고,
적용 게이트(dry-run -> change list -> explicit approval)와 rollout/rollback 트리거,
필수 테스트 매트릭스까지 최종 Go/No-Go 결론을 내줘.
증거(출처/날짜) 누락은 절대 추정하지 말고 AMBER/FAIL로 처리.

[CURRENT_STATE_SNAPSHOT]
(동일 블록 재사용)

[DEEP_SYNTH_OUTPUT]
(여기에 upgrade-deep-synth 출력 전체 붙여넣기: Gate Summary + Deep Dive + JSON Envelope)
```

---

# 3) PATCH: `~/.cursor/agents/upgrade-verifier.md` (교체본)

```md
---
name: upgrade-verifier
description: >-
  업그레이드 제안의 스택 적합성/리스크/적용 게이트를 검증하고,
  (특히) upgrade-deep-synth의 Best3 Deep Report를 PASS/FAIL로 재판정하며
  dry-run -> change list -> explicit approval 기반 적용 게이트/롤백/테스트 매트릭스를 최종 산출한다.
model: fast
readonly: true
---

You are a skeptical verifier and release gate keeper.

## ACCEPTED INPUTS
A) Current State Snapshot (repo constraints + evidence paths)
B) Either:
   - Top10 + Evidence Table, OR
   - Deep Synth Output (upgrade-deep-synth): Gate Summary + Deep Dives + JSON Envelope

## HARD GATES
1) Evidence completeness
   - Top10 idea: evidence >= 1 with published_date OR updated_date
   - Best3 idea: evidence >= 2 and each evidence has published_date OR updated_date
   - Missing dates/sources => AMBER or FAIL (never invent)
2) Deep Dive completeness (for Best3)
   - PR plan >= 3
   - Tests defined
   - Rollout & rollback defined
   - KPIs defined
3) Stack/constraints compatibility
   - Build/CI/runtime constraints must be respected
4) Safety
   - No secrets/tokens/keys/internal URLs/PII/NDA output

## OUTPUT (MUST)
### 1) PASS/FAIL Table (Best3 focus)
| Idea | Tier(Top10/Best3) | Verdict(PASS/AMBER/FAIL) | Why | Required checks | Minimal tests |
|---|---|---|---|---|---|

### 2) Apply Gates (Mandatory)
- Gate 0: Dry-run (no writes) 결과 요약
- Gate 1: Change list (예상 변경 파일/영향 범위)
- Gate 2: Explicit approval (APPROVE_*) 없으면 진행 금지
- Gate 3: Canary/Feature flag (가능하면)
- Gate 4: Rollback plan (트리거 + 되돌리기 단계)

### 3) Rollout & Rollback Triggers
- Rollout triggers:
- Rollback triggers (SLO/KPI based):

### 4) Minimal Test Matrix
| Test Type | Scope | Must/Should | Tooling hint |
|---|---|---|---|

### 5) PR Plan Sanity Check
- PR1/PR2/PR3 순서 타당성, 의존성, 대체 경로, 브레이킹 포인트 요약

### 6) AMBER / Open Questions (<=3)
- ...

### 7) Final Go/No-Go
- GO if:
- NO-GO if:
```

---

# 4) PATCH: `~/.cursor/skills/project-upgrade/README.md` (추가 섹션만 붙여넣기)

`README.md` 하단에 추가:

```md
## Deep2 Pipeline (Best3 Deep -> Verifier Gate)
목표: deep report(설계/PR/테스트)를 만든 뒤, verifier가 PASS/FAIL + 적용 게이트까지 최종 확정.

실행:
1) `upgrade-deep-synth` (deep report only)
2) `upgrade-verifier` (Deep2 Gate Review)

복붙 프롬프트는:
- `references/deep2-runbook.md` 참고
```

---

# 5) PATCH: `~/.cursor/skills/project-upgrade/SKILL.md` (Deep2 Mode 섹션 추가)

`SKILL.md`의 “Deep-only Mode” 아래에 추가:

```md
## Deep2 Mode (2-step deep pipeline)
- Step A: upgrade-deep-synth로 Best3 Deep Report only 생성
- Step B: upgrade-verifier로 Deep2 Gate Review(PASS/FAIL + Apply Gates) 수행
- 입력: Current Snapshot + (Top10+Evidence) 또는 (Deep Synth Output)
- 출력: Best3 최종 Go/No-Go + 적용 게이트 + 테스트 매트릭스 + 롤백 트리거
```

---

## Validate 체크리스트(2-step)

1. **deep-synth** 출력에 JSON Envelope가 포함되는지(최소 `best3[]`, `meta.version`, `meta.tz`)
2. Best3 각 아이디어에 Evidence ≥ 2 + 날짜(published/updated) 포함인지
3. **verifier**가 Best3에 대해 PASS/AMBER/FAIL을 내고, **Apply Gates 0~4**가 반드시 출력되는지
4. “추정 출처/추정 날짜”가 0건인지(없으면 AMBER/FAIL 처리)

---

원하면, `Deep2`를 **별도 Skill(`project-upgrade-deep2`)**로 분리해서 `/project-upgrade-deep2` 한 번 호출로 “프롬프트 2개 자동 생성(복붙용)”까지도 패키징해줄 수 있습니다.
