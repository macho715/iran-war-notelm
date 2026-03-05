# Quality Gates — project-plan

## Gate 0: Evidence Gate
- 핵심 설계 결정(Decision)은 evidence 없으면 확정 금지
- 날짜 없는 근거는 AMBER_BUCKET로만 유지
- GitHub benchmark는 created/pushed date 중 1개 이상 필수

## Gate 1: Plan Completeness (A~K + ㅋ)
- A~K + ㅋ 섹션이 모두 존재해야 PASS 후보
- 누락 섹션이 있으면 AMBER 또는 FAIL

## Gate 2: Implementation Granularity
- PR Plan에 최소 6개 PR 권장(작은 PR)
- 각 PR은 scope/target modules/tests/rollback note 포함

## Gate 3: Reliability/Operability
- Observability(Logs/Metrics/Tracing) + Runbook(Deploy/Rollback/Incident) 포함 필수

## Gate 4: Error Handling
- Retry/Timeout/Idempotency/Circuit breaker 정책이 명시되어야 PASS

## Gate 5: Dependencies & Security
- Dependency table + License policy + supply-chain(선택) 포함
- 에이전트/웹/터미널 자동 실행이 있으면 prompt-injection 대비(allowlist/approval) 포함

## Gate 6: Change Control
- 파괴적 변경이 예상되면 dry-run → change list → explicit approval 게이트가 반드시 문서화되어야 한다.
