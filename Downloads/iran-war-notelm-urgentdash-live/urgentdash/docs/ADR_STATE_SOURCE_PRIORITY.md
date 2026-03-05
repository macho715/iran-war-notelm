# ADR: Dashboard State Source Priority

- Status: Accepted
- Date: 2026-03-04
- Scope: `dashboard_bundle` UI (`ui/index_v2.html`, `ui/hyie-erc2-dashboard.jsx`, `legacy/index_1.html`)

## Context

대시보드는 과거에 `raw.githubusercontent.com` 상태 파일을 먼저 조회하고 `/api/state`를 후순위 fallback으로 사용했다.  
이 구조는 정적 호스팅 안정성은 높지만, FastAPI 기반 관찰성(`metrics`, API latency/error tracking) 효과를 크게 낮춘다.

## Decision

상태 소스 우선순위를 다음으로 고정한다.

1. `/api/state` (primary)
2. raw GitHub live state (`urgentdash-live/live/hyie_state.json`)
3. relative/local fallback (`../api/state`, `api/state`, snapshot/json)

## Rationale

- API-first로 전환하면 실사용 트래픽이 FastAPI를 통과하므로 `/metrics` 기반 운영 지표가 실제 사용자 패턴을 반영한다.
- 기존 raw/live fallback은 유지하므로 API 장애 시에도 대시보드는 degraded 모드로 동작 가능하다.
- 구현 복잡도가 낮고 롤백이 쉽다(배열 순서 원복만으로 되돌림 가능).

## Consequences

- 장점: observability 품질 향상, API 계약 중심 운영 가능.
- 단점: API 장애/지연 시 첫 요청 실패 후 fallback으로 넘어가므로 초기 실패 이벤트가 늘어날 수 있음.

## Operations

- `/api/state`는 `X-State-Source` 헤더를 제공한다.
- `/metrics`에서 `/api/state` handler 관련 시계열을 모니터링한다.
- raw/live 우회 비중이 증가하면 API 접근성(네트워크, CORS, reverse proxy) 점검이 필요하다.
