# Source Policy — project-plan (EN-only, 2025-06+)

## Primary (벤치마크)
- GitHub repositories (architecture, folder structure, CI/CD, testing, ops patterns)

## Secondary (필요 시)
- Medium / GeekNews(HN) / Reddit (단, 설계 결론 단독 근거 금지 → GitHub/Official로 보강)
- Official docs (OpenAI / Anthropic / Google 등) — 프로젝트 맥락에서 해당 플랫폼을 쓸 때만

## Freshness / Date rule (필수)
- GitHub repo:
  - created_date >= 2025-06-01 OR pushed_date >= 2025-06-01
  - 둘 다 확보 불가하면 AMBER_BUCKET
- 글/문서:
  - published_date >= 2025-06-01 OR updated_date >= 2025-06-01

## Popularity rule (권장)
- GitHub: stars/forks/watchers/issues/usage signal 중 1개 이상 기록
- 스택 규모에 따라 threshold는 조정 가능(기본 stars>=500 권장)

## Evidence minimum
- 핵심 설계 결정(Decision)마다 benchmark evidence 1개 이상
- Best3급 핵심 변경(아키텍처/보안/배포)은 evidence 2개 이상 권장

## Security
- tokens/keys/internal URLs/PII/NDA 절대 출력 금지
- “코드 자동 변경/배포” 제안 금지(문서/계획만)
