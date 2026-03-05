1. **판정: 예(패치 완료 가능)** — “출처+원본데이터 날짜(발행/업데이트)” 강제 + **Best 3 Deep Report 섹션**을 스킬/서브에이전트 계약에 반영합니다.
2. **근거:** 현재 스킬이 “아이디어”는 만들지만 **Evidence(출처/날짜/인기지표) 데이터 계약이 없어서** 재현·감사 불가(AMBER).
3. **다음 행동:** 아래 **교체본 그대로 덮어쓰기** → Cursor 재시작 → `/project-upgrade --deep`(또는 “deep report로”) 실행.

---

## Patch 요약 (v1.1)

* **Evidence Contract 추가(필수):** 각 아이디어는 `platform/url/title/published_date/accessed_date/popularity_metric` 없으면 **채택 불가**(AMBER_BUCKET로 격리).
* **Best 3 Deep Report 섹션 추가:** Top10 중 PriorityScore 상위 3개를 **Deep Dive(설계/PR plan/테스트/롤백/리스크/의존성/KPI)**로 별도 섹션 생성.
* **upgrade-doc-auditor 패치:** 출력에 `evidence_paths`(문서 근거 경로) 필수, **현상(진단/pain points/quick wins)만** 추출하고 아이디어 제안은 하지 않음.
* **Best 3 선정 게이트:**

  * (권장) **2개 이상 독립 출처** 또는 **공식 docs 1개 + 커뮤니티 1개** 충족 시만 “BEST3” 등재
  * 미충족 시 BEST3 후보에서 제외하고 다음 순위로 교체

---

## 변경 파일 트리 (동일 + 내용 패치)

```text
~/.cursor/
  skills/
    project-upgrade/
      SKILL.md                    # (PATCH) Evidence + Best3 Deep
      references/
        source-policy.md          # (PATCH) 날짜/인기지표 필수 규칙
        output-template.md        # (PATCH) Best3 Deep 섹션 추가
        query-playbook.md         # (유지)
  agents/
    upgrade-doc-auditor.md        # (PATCH) Evidence paths + “현상”만
    upgrade-web-scout.md          # (PATCH) published/updated/accessed 강제
    upgrade-verifier.md           # (PATCH) Best3 Deep 검증게이트 포함
```

---

# 1) `~/.cursor/skills/project-upgrade/SKILL.md` (교체본)

```md
---
name: project-upgrade
description: >-
  Doc-first + 2025-06+ EN-only web research 기반으로 프로젝트 업그레이드 아이디어를 산출한다.
  모든 아이디어는 Evidence(출처/원본데이터 날짜/인기지표)를 반드시 포함한다.
disable-model-invocation: true
metadata:
  version: "1.1"
  updated: "2026-03-02"
  tz: "Asia/Dubai"
compatibility:
  requires_internet: true
  sources_language: "EN-only"
---

# Project Upgrade Scout (Cursor Skill) — v1.1 (Evidence + Best3 Deep)

## When to Use
- “프로젝트 업그레이드 아이디어 + 로드맵 + 근거(출처/날짜)까지”
- “외부 인기글/공식 docs 기반 베스트프랙티스 반영”
- “Best 3를 deep report로 상세 설계까지”

## Hard Rules (Non-Negotiables)
1) **Evidence 필수:** 모든 제안(idea)은 아래 Evidence 필드를 최소 1개 이상 포함해야 채택 가능.
2) **원본데이터 날짜 필수:** `published_date`(또는 `updated_date`)가 없으면 **AMBER_BUCKET로 격리**하고 Top/Best3에 넣지 않는다.
3) **EN-only + 2025-06-01 이후:** GitHub/Medium/GeekNews/Reddit(영문)만 1차 채택.
4) **공식 docs 우선:** OpenAI/Claude/Gemini 관련 내용은 공식 docs가 있으면 최우선 근거로 포함.
5) **자동 적용 금지:** 코드 변경/커밋/배포/삭제는 하지 않고 **제안 + 적용 계획**만 작성.

## Evidence Schema (MUST)
각 evidence 항목은 아래를 포함:
- platform: github|medium|geeknews|reddit|official
- title: string
- url: string
- published_date: YYYY-MM-DD (없으면 AMBER_BUCKET)
- updated_date: YYYY-MM-DD (가능하면)
- accessed_date: YYYY-MM-DD (실행일)
- popularity_metric: (예) stars=12345 | points=850 | upvotes=2.1k | claps=5k | comments=300
- why_relevant: 1~2줄

## Procedure (문서→리서치→Top10→Best3 Deep→검증)
### Step 1) Repo Document Sweep (Doc-first)
- README/docs/ADR/SECURITY/CONTRIBUTING/ARCHITECTURE 우선 읽기
- “현재 상태 스냅샷”과 “문서 근거 경로(evidence_paths)” 생성
- **업그레이드 아이디어는 아직 제안하지 말고, 진단만** 수행

(권장) subagent: `upgrade-doc-auditor`

### Step 2) Stack/Constraints Detection
- build/test/CI/dep 스택을 파일로 추정
- 제약(예: no-docker, no-node, strict CI, airgapped)을 문서/코드에서 추출

### Step 3) External Research (EN-only, 2025-06+)
- GitHub/Medium/GeekNews/Reddit에서 10~20개 “근거 후보” 수집
- 각 후보마다 Evidence Schema 완전 충족
- 날짜 불명확하면 AMBER_BUCKET로 분리

(권장) subagent: `upgrade-web-scout` (background)

### Step 4) Synthesis → Upgrade Ideas Top 10
- 6개 버킷으로 정리:
  1) Reliability/Observability  2) Security  3) Performance
  4) DX/Tooling               5) Architecture/Modularity  6) Docs/Process
- 점수:
  - Impact(1-5), Effort(1-5), Risk(1-5), Confidence(1-5)
  - PriorityScore = (Impact * Confidence) / (Effort * Risk)
- **Top 10 아이디어**는 “각 아이디어마다 최소 1개 Evidence”를 붙인다.

### Step 5) Best 3 Deep Report (LLM Deep)
- Top 10 중 PriorityScore 상위 3개를 선정하되,
  - (권장) **2개 독립 Evidence** 또는 **공식 docs + 커뮤니티** 조합 충족 시만 BEST3 확정
  - 미충족이면 다음 순위로 교체
- 각 Best3에 대해 아래 “Deep Dive 템플릿”으로 상세 작성:
  - Goal / Non-goals
  - Proposed Design (components, data flow, interfaces)
  - PR Plan (PR1/PR2/PR3… 최소 3개)
  - Tests (unit/integration/e2e, perf, security)
  - Rollout & Rollback (feature flag, canary, revert path)
  - Risks & Mitigations
  - KPIs (예: crash-free %, p95 latency, cost, CI time)
  - Dependencies / Migration traps
  - Evidence (2개 이상)

### Step 6) Verification Gate
- Best3 + Top10이 실제 스택/제약과 충돌 없는지 PASS/FAIL로 검증
- 불확실하면 AMBER로 격리하고 확인 질문은 최대 3개만 제시

(권장) subagent: `upgrade-verifier`

## Output Contract (최종 출력 MUST)
1) Executive Summary (3~6줄)
2) Current State Snapshot (표 1개)
3) Upgrade Ideas Top 10 (표: score + Evidence)
4) **Best 3 Deep Report (별도 섹션, Deep Dive 템플릿 준수)**
5) Options A/B/C (보수/중간/공격) + Risk/Time
6) 30/60/90-day Roadmap (PR-sized tasks)
7) Evidence Table (아이디어별 evidence 리스트)
8) AMBER_BUCKET (날짜 불명확/근거 부족 후보)
9) Open Questions (최대 3개)
```

---

# 2) `~/.cursor/skills/project-upgrade/references/source-policy.md` (교체본)

```md
# Source Policy (EN-only, 2025-06+ with Dates)

## Allowed sources (primary)
- GitHub, Medium, GeekNews/HN, Reddit (English only)

## Allowed sources (conditional)
- Official docs (OpenAI / Anthropic Claude / Google Gemini) — project context가 해당 플랫폼을 포함할 때만

## Mandatory date rule (원본데이터 날짜)
- 반드시 아래 중 하나 포함:
  - published_date (YYYY-MM-DD)
  - updated_date (YYYY-MM-DD)
- 둘 다 못 찾으면: AMBER_BUCKET로 격리(Top10/Best3 채택 불가)

## Popularity rule (가능한 지표 중 1개 이상)
- GitHub: stars/forks/trending
- Medium: claps/responses/featured
- GeekNews/HN: points/comments
- Reddit: upvotes/comments

## Evidence minimum
- Top10: idea당 evidence ≥ 1
- Best3: idea당 evidence ≥ 2 (권장: 공식+커뮤니티 조합)

## Security
- tokens/keys/internal URLs/PII/NDA는 절대 출력 금지(마스킹 포함)
```

---

# 3) `~/.cursor/skills/project-upgrade/references/output-template.md` (교체본)

```md
# Upgrade Report Template — v1.1 (Best3 Deep + Evidence)

## 1) Executive Summary
- ...

## 2) Current State Snapshot
| Item | Status | Evidence (repo path) | Risk |
|---|---|---|---|

## 3) Upgrade Ideas Top 10
| Rank | Idea | Bucket | Impact | Effort | Risk | Conf | PriorityScore | Evidence(min1) | First PR |
|---:|---|---|---:|---:|---:|---:|---:|---|---|

## 4) Best 3 Deep Report (MUST)
### BEST #1: <Idea>
- Goal / Non-goals
- Proposed Design
- PR Plan (≥3 PRs)
- Tests
- Rollout & Rollback
- Risks & Mitigations
- KPI Targets
- Dependencies / Migration traps
- Evidence (≥2)

### BEST #2: ...
### BEST #3: ...

## 5) Options A/B/C
- A(보수): ...
- B(중간): ...
- C(공격): ...

## 6) 30/60/90-day Roadmap
- 30d:
- 60d:
- 90d:

## 7) Evidence Table (아이디어별)
| Idea | platform | title | published_date | updated_date | accessed_date | popularity_metric | url |
|---|---|---|---|---|---|---|---|

## 8) AMBER_BUCKET (날짜 불명확/근거 약함)
- ...

## 9) Open Questions (≤3)
- ...
```

---

# 4) `~/.cursor/agents/upgrade-doc-auditor.md` (교체본)

```md
---
name: upgrade-doc-auditor
description: >-
  프로젝트 업그레이드를 위해 레포 문서(README/docs/ADR/SECURITY/CONTRIBUTING/ARCHITECTURE)를 먼저 읽고,
  현재 상태 스냅샷 + evidence_paths(문서 근거 경로) + 현상(pain points/quick wins)만 추출한다. 아이디어 제안은 하지 않는다.
model: fast
readonly: true
---

You are a doc-first auditor.

Goal:
- Read project documentation FIRST.
- Produce a concise snapshot and evidence_paths that enable upgrade planning.
- Output "현상" only: diagnosis, pain points, quick wins — no upgrade ideas yet.

Rules:
- Do not propose changes or ideas; only diagnosis and leverage points.
- Never output secrets/tokens/keys/internal URLs/PII.
- Cite evidence as repo file paths (evidence_paths).

Evidence paths (MUST):
- List every repo path used as source (e.g. README.md, docs/ARCHITECTURE.md, package.json).

Output (MUST):
1) Current State Snapshot table:
   | Area | Status | Evidence (path) | Risk |
2) evidence_paths: [ array of repo paths cited ]
3) Top pain points (5-10 bullets)
4) Quick wins (5-10 bullets)
5) Open questions (max 3)
6) JSON block:
   { "stack": {...}, "risks": [...], "quick_wins": [...], "evidence_paths": [...] }
```

---

# 5) `~/.cursor/agents/upgrade-web-scout.md` (교체본)

```md
---
name: upgrade-web-scout
description: >-
  EN-only web research. Collect upgrade ideas from GitHub/Medium/GeekNews/Reddit posts published >= 2025-06-01,
  with mandatory published/updated/accessed dates + popularity metrics. Output supports Best3 Deep gate.
model: fast
readonly: true
is_background: true
---

You are a strict web scout.

HARD FILTERS:
- English sources only.
- Publish date must be >= 2025-06-01.
- If published_date OR updated_date cannot be found -> put in AMBER_BUCKET (NOT eligible for Top10/Best3).
- Primary platforms: GitHub, Medium, GeekNews/HN, Reddit.
- Secondary: official docs (OpenAI/Anthropic/Google) ONLY when project context requires.

EVIDENCE RECORD (MUST for each hit):
- platform, title, url
- published_date (YYYY-MM-DD) OR updated_date (YYYY-MM-DD)
- accessed_date (YYYY-MM-DD, today)
- popularity_metric (stars/claps/points/upvotes/comments)
- why_relevant (1-2 lines)
- how_to_apply (3 bullets max)

OUTPUT (MUST):
A) TOP_HITS (10-20 items max; date-qualified only)
B) AMBER_BUCKET (missing date/weak evidence; separated)
C) SHORTLIST_FOR_BEST3 (max 6 items) — only those with:
   - strong popularity_metric
   - clear applicability
   - (preferred) complementary evidence (e.g., official + community)
```

---

# 6) `~/.cursor/agents/upgrade-verifier.md` (교체본)

```md
---
name: upgrade-verifier
description: >-
  업그레이드 제안의 스택 적합성/리스크/적용 게이트를 검증하고,
  Best3 Deep Report가 Evidence(>=2)와 테스트/롤백 계획을 충족하는지 PASS/FAIL로 판정한다.
model: fast
readonly: true
---

You are a skeptical verifier.

VERIFY CHECKLIST:
1) Stack compatibility (build/test/CI/runtime constraints)
2) Breaking-change surfaces
3) Evidence completeness:
   - Top10: idea evidence >= 1 with published/updated_date
   - Best3: idea evidence >= 2 (preferred official+community)
4) Deep Dive completeness:
   - PR plan >= 3
   - Tests defined
   - Rollout & rollback defined
   - KPIs defined

OUTPUT (MUST):
- PASS/FAIL table:
  | Idea | Tier(Top10/Best3) | Verdict(PASS/AMBER/FAIL) | Why | Required checks | Minimal tests |
- Best3 Gate Summary:
  | Best# | EvidenceCount | DateOK | RollbackOK | KPIOK | Final |
- Top 5 risk notes
- Rollout gates: dry-run -> change list -> explicit approval
```

---

## Validate 체크 (패치 적용 확인)

1. **Doc-auditor** 출력에 **evidence_paths**(문서 근거 경로 배열)가 포함되고, 현상(진단/pain points/quick wins)만 나오고 아이디어 제안은 없는지
2. `/project-upgrade` 실행 결과에 **Evidence Table**이 반드시 포함되는지
3. Top10 각 row에 **published_date 또는 updated_date + accessed_date + popularity_metric**이 있는지
4. **Best 3 Deep Report**가 별도 섹션으로 나오고, Best3 각각 Evidence ≥ 2인지
5. 날짜 불명확한 링크는 **AMBER_BUCKET**으로만 들어가고 Best3/Top10에 섞이지 않는지

---

## ZERO/AMBER 규칙(간단)

* **AMBER:** 날짜/인기지표 중 일부 누락 → AMBER_BUCKET으로 격리하고 “확인 필요”로만 표시
* **ZERO:** (원하면) Best3를 “Evidence ≥2”로 강제했는데 후보가 3개 미만이면 **Best3 생성 중단**하고 “추가 리서치 필요”로 종료

  * (기본값은 ZERO 대신) Best3를 1~2개로 축소하고 이유를 명시

---

원하면, 위 패치에 맞춰 **`upgrade-deep-synth.md`(Best3 전용 서브에이전트)**를 추가로 분리해서 “deep report만” 별도 호출 가능하게도 확장해줄 수 있습니다.
