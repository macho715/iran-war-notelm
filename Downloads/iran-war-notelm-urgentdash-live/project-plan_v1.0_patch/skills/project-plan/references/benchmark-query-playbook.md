# Benchmark Query Playbook (GitHub 중심)

> 목표: 내 프로젝트 스택/도메인과 유사한 “인기 repo”를 2025-06+ 기준으로 찾고,
> 구조(폴더), 아키텍처, CI, 테스트, 운영 패턴을 벤치마크한다.

## 1) Repo Search (웹/CLI 공통 개념)
- 핵심 qualifiers:
  - created:>=2025-06-01
  - pushed:>=2025-06-01
  - stars:>=500 (기본, 스택 규모에 따라 조정)
  - language:<ts|py|go|rust|...>
  - topic:<nextjs|agent|mcp|rag|...>
  - template:true (템플릿 repo만 찾고 싶을 때)
  - archived:false (권장)

## 2) GitHub 웹 검색 예시
- `"nextjs dashboard template" created:>=2025-06-01 stars:>=500 archived:false`
- `"mcp server" pushed:>=2025-06-01 stars:>=200 archived:false`
- `"agentic workflow" created:>=2025-06-01 stars:>=300`

## 3) GitHub CLI (gh) 예시
- 인기 repo 찾기:
  - `gh search repos "topic:nextjs created:>=2025-06-01 stars:>=500 archived:false" --sort=stars --limit=30`
- 최근 활발한 repo 찾기:
  - `gh search repos "topic:mcp pushed:>=2025-06-01 stars:>=200 archived:false" --sort=updated --limit=30`
- 템플릿 repo만:
  - `gh search repos "topic:template template:true created:>=2025-06-01 stars:>=200" --sort=stars --limit=30`

## 4) 구조/설계 추출 포인트(벤치마크 체크리스트)
- Repo 구조:
  - apps/ packages/ (monorepo), src/ layers, lib/ utils/
  - docs/ adr/ (의사결정 기록)
- 품질:
  - lint/format (ruff/eslint/prettier), test (pytest/jest), typecheck (mypy/tsc)
- CI/CD:
  - GitHub Actions workflow, release automation, canary/rollback
- 운영:
  - observability(otel, metrics), runbooks, incident 대응
- 보안:
  - secret 관리, SAST/dep scan, permissions 최소화

## 5) Evidence 캡처(필수)
- repo_url
- created_date 또는 pushed_date
- accessed_date
- popularity_metric(stars/forks 등)
- “왜 relevant인지” 1~2줄
- “우리 플랜에 어떻게 적용할지” 3 bullets
