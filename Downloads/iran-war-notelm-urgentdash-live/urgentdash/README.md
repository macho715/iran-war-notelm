# UrgentDash Dashboard Bundle

`urgentdash/`는 HyIE ERC2 대시보드의 프론트엔드, 실행 스크립트, 운영 문서를 모아둔 번들 디렉터리다.

기준 상태: PATCH2 (Frontend + Backend `route_geo` 연동 완료)

## 빠른 시작 (3분)

아래 3단계만 실행하면 로컬에서 바로 확인할 수 있다.

1. API 서버 실행 (repo 루트)

```bash
uvicorn src.iran_monitor.health:app --host 127.0.0.1 --port 8000
```

2. React 대시보드 실행 (새 터미널)

```bash
cd urgentdash/react
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

3. 브라우저 확인

- `http://localhost:5173/` 접속
- API 확인: `http://127.0.0.1:8000/api/state`
- 실시간 갱신: fast poll 30초 + full sync 15분

## 1. 현재 반영 상태

- React 앱(`urgentdash/react`) PATCH2 적용 완료
  - OSRM/Mapbox 기반 실도로 경로 렌더
  - 경로 fetch 실패 시 직선 fallback 렌더
  - I02 detail 규칙 엔진(`i02DetailRules.js`)
  - timeline noise gate(`noiseGate.js`, 10분 윈도우)
  - `routeGeo` 정규화/전달(`normalize.js`)
  - 누락 기능 복구: `newsRefs`, Conflict Stats, Key Assumptions, Version/Changelog
  - 실시간 이중 폴링: 30초 fast(API 우선) + 15분 full(fallback 후보 포함)
- 백엔드 payload/snapshot에 `route_geo` 포함
  - `src/iran_monitor/route_geo.py`
  - `src/iran_monitor/app.py`

## 2. 디렉터리 구성

- `react/`: Vite + React 운영 앱
- `ui/`: 단일 HTML 대시보드 (`index_v2.html`)
- `legacy/`: 과거 자산/백업
- `scripts/`: 상태 갱신/내보내기/백업 스크립트
- `docs/`: 요구사항/의존성/레이아웃/운영 문서
- `workflows/`: GitHub Actions 워크플로
- `live/`: 정적 배포용 상태 파일

## 3. 로컬 실행

### 3.1 API 서버

repo 루트에서 실행:

```bash
uvicorn src.iran_monitor.health:app --host 127.0.0.1 --port 8000
```

확인:
- `http://127.0.0.1:8000/api/state`
- `http://127.0.0.1:8000/metrics`

### 3.2 React 대시보드

```bash
cd urgentdash/react
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

접속:
- `http://localhost:5173/`

### 3.3 정적 UI (선택)

```bash
cd urgentdash
python -m http.server 3000
```

접속:
- `http://127.0.0.1:3000/ui/index_v2.html`

## 4. 상태 갱신/내보내기

repo 루트에서 실행:

```bash
python urgentdash/scripts/update_hyie_state_now.py
python urgentdash/scripts/export_hyie_live.py --out-dir urgentdash/live
```

출력:
- `state/hyie_state.json`
- `urgentdash/live/hyie_state.json`
- `urgentdash/live/last_updated.json`

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\urgentdash\refresh_live_state.ps1
```

## 5. React 환경 변수 (PATCH2)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `VITE_OSRM_BASE_URL` | `https://router.project-osrm.org` | OSRM endpoint override |
| `VITE_MAPBOX_TOKEN` | 없음 | Mapbox directions 활성화 |
| `VITE_DASHBOARD_CANDIDATES` | 코드 기본 목록 | API/state 조회 후보 우선순위 |
| `VITE_FAST_POLL_MS` | `30000` | fast poll 주기(ms) |
| `VITE_FAST_STATE_CANDIDATES` | 코드 기본 목록 | fast poll 대상(API 계열) 후보 |
| `VITE_LEAFLET_TILES_URL` | OSM 기본 타일 | 지도 타일 URL |
| `VITE_LEAFLET_TILES_ATTRIBUTION` | OSM attribution | 타일 저작권 문구 |

## 6. 데이터 소스 우선순위

full sync 기본 조회 순서:

1. `http://127.0.0.1:8000/api/state`
2. `https://raw.githubusercontent.com/macho715/iran-war-notelm/urgentdash-live/live/hyie_state.json`
3. `/api/state`, `./api/state`, `api/state`, `./data/dashboard.json`

정책 문서: `docs/ADR_STATE_SOURCE_PRIORITY.md`

fast poll 기본 조회 순서(API 계열):

1. `http://127.0.0.1:8000/api/state`
2. `/api/state`
3. `./api/state`
4. `api/state`

## 7. PATCH2 데이터 흐름 요약

- Route
  - `payload.route_geo`
  - `normalizeRouteGeo(...)`
  - `dash.routeGeo`
  - `RouteMapLeaflet`
  - OSRM/Mapbox/fallback 렌더
- Timeline
  - `buildDiffEvents(...)` (noiseKey 포함)
  - `mergeTimelineWithNoiseGate(...)`
  - Timeline UI 반영

## 8. 검증 명령

```bash
# React build
cd urgentdash/react
npm run build

# Python compile check
cd /path/to/repo-root
python3 -m compileall -q src/iran_monitor
```

권장 수동 검증:

1. 라이브 fetch 1회 실행 후 `hyie_state.json`에 `route_geo` 존재 확인
2. Routes 탭에서 아래 동작 확인
   - `VITE_MAPBOX_TOKEN` 없음: OSRM 우선, 실패 시 fallback
   - `VITE_MAPBOX_TOKEN` 있음: Mapbox 사용/전환/fallback

## 9. 문서 인덱스

- `docs/SYSTEM_ARCHITECTURE.md` (시스템 아키텍처)
- `docs/LAYOUT.md` (PATCH2 레이아웃/데이터 흐름)
- `docs/REQUIREMENTS.md` (요구사항 기준)
- `docs/DEPENDENCIES.md` (의존성 기준)
- `docs/PATCH2.MD` (PATCH2 계획/반영 기준)
- `docs/3파일비교.md` (patch/index_v2/hyie 비교)
- `docs/컴포넌트구현세부.md` (컴포넌트 상세)
- `docs/HYIE_ERC2_REALTIME_RUNBOOK.md` (실행 운영)
- `docs/URGENTDASH_BACKUP_RUNBOOK.md` (백업/복구)
- `docs/PLAN_FILE_MOVE.md` (문서 정리 계획)
