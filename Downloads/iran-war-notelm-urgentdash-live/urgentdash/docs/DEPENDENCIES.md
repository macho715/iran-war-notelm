# Urgentdash Dependency Document

## 1. 목적

이 문서는 `urgentdash` 실행/개발/검증에 필요한 의존성을 정리한다.  
기준 시점은 PATCH2 적용 완료 상태다.

## 2. 런타임 구성

- Python 런타임: backend 상태 생성/API/스크립트
- Node.js 런타임: React 대시보드(`urgentdash/react`)
- 외부 서비스: OSRM/Mapbox/타일 서버/GitHub raw state

## 3. Python 의존성

기준 파일: 루트 `requirements.txt`

### 3.1 핵심 패키지

- `fastapi`, `uvicorn`: 상태 API 서버
- `structlog`: 로깅
- `apscheduler`: 주기 실행
- `httpx`, `beautifulsoup4`, `feedparser`: 소스 수집
- `pydantic-settings`, `python-dotenv`: 설정 관리
- `tenacity`: 재시도 제어
- `polars`: 데이터 처리
- `psycopg[binary]`: Postgres 연동
- `python-telegram-bot`: 알림 연동
- `notebooklm-mcp-cli`: NotebookLM 연동 도구
- `playwright`: 브라우저 기반 검증(선택)

### 3.2 설치 권장 방식

시스템 Python 직접 설치 대신 가상환경 사용:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

주의:

- Ubuntu/WSL PEP668 환경에서는 시스템 pip 설치가 차단될 수 있다.
- 이 경우 반드시 `.venv`를 사용한다.

## 4. Node.js 의존성 (React)

기준 파일: `urgentdash/react/package.json`

### 4.1 dependencies

- `react@^18.2.0`
- `react-dom@^18.2.0`
- `leaflet@^1.9.4`
- `react-leaflet@^4.2.1`

### 4.2 devDependencies

- `vite@^5.2.0`
- `@vitejs/plugin-react@^4.2.1`

### 4.3 설치

```bash
cd urgentdash/react
npm install
```

## 5. 시스템 의존성

### 5.1 기본

- Python 3.11+ (권장 3.12)
- Node.js 18+ (권장 20+)
- npm 9+

### 5.2 Playwright 시각 검증(선택)

Linux/WSL에서 Playwright Chromium 실행 시 아래 시스템 라이브러리가 필요할 수 있다.

- `libnspr4`
- `libnss3`
- `libasound2t64`

설치 예시:

```bash
sudo apt-get update
sudo apt-get install -y libnspr4 libnss3 libasound2t64
```

## 6. 외부 서비스 의존성

### 6.1 지도/경로

- OSRM public endpoint (기본): `https://router.project-osrm.org`
- Mapbox Directions (선택): `https://api.mapbox.com`
- OSM tiles (기본): `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

### 6.2 상태 fallback

- GitHub raw live state:
  - `https://raw.githubusercontent.com/macho715/iran-war-notelm/urgentdash-live/live/hyie_state.json`

## 7. 환경변수 의존성

### 7.1 React (`VITE_*`)

- `VITE_DASHBOARD_CANDIDATES`: 상태 조회 후보 URL 목록
- `VITE_OSRM_BASE_URL`: OSRM endpoint override
- `VITE_MAPBOX_TOKEN`: Mapbox 라우팅 토큰(없으면 OSRM 우선)
- `VITE_LEAFLET_TILES_URL`, `VITE_LEAFLET_TILES_ATTRIBUTION`: 타일 커스터마이즈

### 7.2 Python

주요 설정은 `src/iran_monitor/config.py` 기준.

- `STORAGE_ROOT`
- `HYIE_STATE_FILE`
- `HYIE_APPEND_URGENTDASH_JSONL`
- `DATABASE_URL` (Postgres 사용 시)

## 8. 실행 전 최소 체크리스트

### 8.1 Backend/API

- `.venv` 생성 및 `requirements.txt` 설치 완료
- `python -m uvicorn src.iran_monitor.health:app --host 127.0.0.1 --port 8000` 기동 가능

### 8.2 React

- `urgentdash/react`에서 `npm install` 완료
- `npm run dev -- --host 0.0.0.0 --port 5173` 기동 가능
- `npm run build` 성공

### 8.3 상태 파일

- `python urgentdash/scripts/update_hyie_state_now.py` 성공
- `state/hyie_state.json`에 `route_geo` 존재

## 9. 검증 명령

```bash
# React
cd urgentdash/react
npm run build

# Python syntax check
cd /path/to/repo-root
python3 -m compileall -q src/iran_monitor

# One-shot state update
.venv/bin/python scripts/update_hyie_state_now.py
```

## 10. 변경 관리

의존성 변경 시 동시 갱신 대상:

- `requirements.txt` 또는 `urgentdash/react/package.json`
- `urgentdash/README.md`
- `urgentdash/docs/REQUIREMENTS.md`
- 본 문서(`urgentdash/docs/DEPENDENCIES.md`)

