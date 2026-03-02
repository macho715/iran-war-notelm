# Plan Pipeline Runbook (copy-paste)

## Step 0) 준비 입력(최소 3블록)
- [CURRENT_STATE_SNAPSHOT]
- [SELECTED_IDEAS] (Top10 또는 Best3/Deep2)
- [IDEA_EVIDENCE_TABLE]

## Step 1) GitHub 벤치마크 수집 (plan-benchmark-scout)
### Prompt
plan-benchmark-scout를 background로 실행.
내 프로젝트 스택/도메인에 맞는 2025-06+ GitHub 인기 repo를 8~15개 찾아서
BENCHMARK_REPOS + PATTERN_LIBRARY + AMBER_BUCKET로 출력해.

[STACK_SIGNAL]
(예: nextjs, typescript, python api, postgres, redis 등)

[DOMAIN_KEYWORDS]
(예: dashboard, agent, mcp, rag, monitoring 등)

[CONSTRAINTS]
(예: no-docker, strict security, offline build 등)

## Step 2) PLAN_DOC 작성 (plan-author)
### Prompt
plan-author로 PLAN_DOC만 작성.
아래 4개 블록만 사용하고, 출처/날짜 없는 내용은 AMBER로 표시해.
A~K + ㅋ 템플릿을 반드시 지켜.

[CURRENT_STATE_SNAPSHOT]
...

[SELECTED_IDEAS]
...

[IDEA_EVIDENCE_TABLE]
...

[BENCHMARK_OUTPUT]
(plan-benchmark-scout 출력 전체)

## Step 3) 검증/게이트 (plan-verifier)
### Prompt
plan-verifier로 Gate Review 수행.
PLAN_DOC의 완전성(A~K+ㅋ), Evidence, PR Plan, 테스트/운영, 에러대응, 의존성/보안, change control을 점검하고
PASS/AMBER/FAIL + Apply Gates 0~4 + Go/No-Go를 출력해.

[PLAN_DOC]
(plan-author 출력 전체)

[EVIDENCE_TABLE]
(PLAN_DOC의 ㅋ1 테이블)
