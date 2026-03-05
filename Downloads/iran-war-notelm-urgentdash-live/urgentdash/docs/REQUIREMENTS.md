# Urgentdash Requirements (PATCH2 Baseline)

## 1. 문서 목적

이 문서는 `urgentdash` 대시보드의 현재 운영 기준 요구사항(기능/비기능/데이터 계약/수용 기준)을 정의한다.  
기준 버전은 PATCH2 적용 완료 상태(React + backend `route_geo` 연동)이다.

## 2. 범위

본 문서는 다음 범위를 포함한다.

- React 대시보드(`urgentdash/react`)
- 정적 UI(`urgentdash/ui/index_v2.html`)
- 상태 생성/내보내기 스크립트(`urgentdash/scripts`)
- 백엔드 상태 payload(`src/iran_monitor/*`) 중 대시보드에 직접 영향 주는 항목

본 문서는 다음 범위를 제외한다.

- NotebookLM 분석 품질 자체
- Telegram/외부 알림 채널 세부 정책
- 인프라 비용/보안 운영 정책 상세

## 3. 시스템 목표

- 사용자가 15분 주기 위기 대시보드를 로컬/정적 환경에서 조회할 수 있어야 한다.
- 대시보드는 API 우선으로 상태를 조회하고, 장애 시 fallback 경로로 계속 동작해야 한다.
- 경로 시각화는 실도로(OSRM/Mapbox) 기반을 우선 적용하고 실패 시 fallback 라인을 표시해야 한다.
- 이벤트 로그는 중복 노이즈를 억제하고 의미 있는 변경만 timeline에 반영해야 한다.

## 4. 이해관계자

- 운영자: 상태 갱신/배포 스크립트 실행, 장애 대응
- 분석자: Routes/Indicators/Timeline 기반 의사결정 보조
- 개발자: 규칙 수정, 데이터 계약 확장, 배포 파이프라인 유지

## 5. 기능 요구사항

### FR-001 대시보드 데이터 조회

- 대시보드는 다음 우선순위로 데이터를 조회해야 한다.
  - `/api/state`
  - GitHub raw live state
  - 상대 경로 fallback
- 응답 payload가 snapshot 형태이면 정규화 후 동일 UI 모델로 변환해야 한다.

### FR-002 상태 정규화

- normalize 계층은 다음을 보장해야 한다.
  - `intelFeed`, `indicators`, `hypotheses`, `routes`, `checklist`, `metadata` 표준화
  - `route_geo` 또는 `routeGeo`를 `routeGeo`로 정규화
  - route의 `cong`/`congestion` 혼용 입력을 허용

### FR-003 Route 지도 렌더링

- `RouteMapLeaflet`는 route별 실도로 geometry를 요청해야 한다.
- provider 선택 규칙:
  - 기본: OSRM
  - Mapbox token 존재 시 Mapbox 사용 가능
- fetch 실패 시 route waypoint 직선 fallback을 렌더링해야 한다.
- 지도는 노드(`CircleMarker`)와 라인(`Polyline`)을 함께 표시해야 한다.
- Tooltip에 route 상태, effective 시간, source(provider/profile or fallback)를 표시해야 한다.

### FR-004 Timeline 이벤트 생성

- 시스템은 prev/next 상태 비교로 diff 이벤트를 생성해야 한다.
- 이벤트는 최소 다음 항목을 포함해야 한다.
  - `id`, `ts`, `level`, `category`, `title`, `detail`, `noiseKey`
- 다음 변경 유형은 이벤트화되어야 한다.
  - MODE/GATE/EVIDENCE 상태 변화
  - TIER0 evidence floor 변화
  - I02 segment 변화
  - I02 detail 태그/터미널/재개시각 변화
  - route status/congestion/effective spike 변화
  - leading hypothesis 변화
  - intel top 변경

### FR-005 Noise Gate

- timeline merge 시 동일 `noiseKey` 이벤트는 10분 윈도우 내 중복 삽입을 억제해야 한다.
- 로그 이벤트(`logEvent`)와 diff 이벤트 삽입 경로 모두 noise gate를 사용해야 한다.

### FR-006 상태 파일 생성/내보내기

- `update_hyie_state_now.py` 실행 시 `state/hyie_state.json`이 생성/갱신되어야 한다.
- payload에는 `route_geo`가 포함되어야 한다.
- `export_hyie_live.py` 실행 시 `live/hyie_state.json`, `live/last_updated.json`이 생성되어야 한다.
- snapshot JSON에도 `route_geo`가 포함되어야 한다.

### FR-007 로컬 실행

- 개발자는 React 앱을 `npm run dev`로 기동할 수 있어야 한다.
- 운영자는 API 서버(`uvicorn`)와 정적 UI(`http.server`)를 로컬에서 기동할 수 있어야 한다.

## 6. 비기능 요구사항

### NFR-001 성능

- React 빌드는 `npm run build`로 성공해야 한다.
- 대시보드는 기본 15분 polling 주기를 사용해야 한다.

### NFR-002 신뢰성

- primary API 실패 시 fallback 후보를 순차 시도해야 한다.
- payload 일부 확장(`route_geo` 등)이 기존 소비 경로를 깨지 않아야 한다.

### NFR-003 호환성

- `cong`와 `congestion` 필드 모두 허용해야 한다.
- snapshot payload 필수 키 기준(`SNAPSHOT_REQUIRED_KEYS`)은 유지해야 한다.

### NFR-004 운영 관찰성

- `/api/state`와 `/metrics`는 로컬 운영 점검이 가능해야 한다.
- 상태 파일/스냅샷 파일을 기준으로 장애 원인 추적이 가능해야 한다.

## 7. 데이터 계약 요구사항

### 7.1 Dashboard 핵심 필드

- `intel_feed` or `intelFeed`
- `indicators`
- `hypotheses`
- `routes`
- `checklist`

### 7.2 route_geo 계약

- payload 선택 필드: `route_geo` (snake_case) 또는 `routeGeo` (camelCase)
- `nodes`: `{ [nodeId]: { label, lat, lng } }`
- `routes`: `{ [routeId]: { waypoints?, coords?, provider?, profile? } }`

### 7.3 Timeline Event 계약

- `{ id, ts, level, category, title, detail, noiseKey }`

## 8. 환경변수 요구사항

- `VITE_DASHBOARD_CANDIDATES`: 데이터 후보 URL 목록
- `VITE_OSRM_BASE_URL`: OSRM endpoint override
- `VITE_MAPBOX_TOKEN`: Mapbox directions 토큰
- `VITE_LEAFLET_TILES_URL`, `VITE_LEAFLET_TILES_ATTRIBUTION`: 타일 설정

## 9. 수용 기준 (Acceptance Criteria)

- AC-001: `npm run build`가 성공한다.
- AC-002: `python3 -m compileall -q src/iran_monitor`가 성공한다.
- AC-003: `update_hyie_state_now.py` 실행 후 `state/hyie_state.json`에 `route_geo`가 존재한다.
- AC-004: 최신 `urgentdash_snapshots/*` JSON에 `route_geo`가 존재한다.
- AC-005: Routes 탭에서 route line이 렌더되고, fetch 실패 시 fallback source가 표시된다.
- AC-006: 동일 `noiseKey` 이벤트가 10분 이내 중복 삽입되지 않는다.
- AC-007: `cong`/`congestion` 어느 입력 형태에서도 route 계산이 정상 동작한다.

## 10. 변경 관리

- 기능 변경 시 다음 문서를 함께 갱신해야 한다.
  - `docs/컴포넌트구현세부.md`
  - `docs/PATCH2.MD` (해당 시)
  - `README.md` (운영/실행 절차 변화 시)

