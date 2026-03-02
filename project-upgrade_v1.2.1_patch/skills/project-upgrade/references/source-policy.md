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
