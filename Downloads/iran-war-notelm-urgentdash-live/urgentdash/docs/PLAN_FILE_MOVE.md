# urgentdash 파일 정리 계획 (전체)

루트·하위 폴더 구조 정리. README·스크립트·문서 상호참조·외부 링크 반영 포함.

---

## 1. 컨텍스트

### 1.1 PATCH2 완료 상태 (2026-03-05)

- 프론트엔드 9파일 + 백엔드 2파일 변경, +811/-183 라인
- constants.js(noise window), i02DetailRules, noiseGate, routeApi, routeGeoDefault, normalize, timelineRules, RouteMapLeaflet, App
- route_geo.py, app.py (payload·snapshot 연동)
- routeGeo.js: 유지, 미사용 (의도적)
- 검증: npm run build 통과, python -m compileall 통과, live fetch → hyie_state.json·snapshots에 route_geo 확인됨

### 1.2 관련 계획

- patch2 적용 계획: `.cursor/plans/patch2.md_적용_계획_ddc4ccd8.plan.md` → urgentdash/PATCH2.MD, urgentdash/컴포넌트구현세부.md 참조
- 문서 이동 시 위 경로를 `urgentdash/docs/`로 갱신 필요

---

## 2. 현재 구조

```
urgentdash/
├── [루트 파일]
│   ├── 3파일비교.md
│   ├── 컴포넌트구현세부.md
│   ├── constants.js, util.js, utils.js
│   ├── index.html, main.jsx
│   ├── package.json, vite.config.js
│   ├── style.css, style.csx
│   ├── patch.js, PATCH2.MD
│   ├── README.md
│   ├── start_local_dashboard.ps1
│   ├── stop_local_dashboard.ps1
│   └── refresh_live_state.ps1
├── docs/          # ADR, runbook, backup 등 + PLAN_FILE_MOVE.md
├── legacy/        # index.html, index_1.html
├── live/          # hyie_state.json, last_updated.json
├── logs/          # api/ui 로그
├── react/         # Vite React 앱 (PATCH2 적용 완료)
├── scripts/       # backup, export, run, update
├── ui/            # index_v2.html, hyie-erc2-dashboard.jsx
└── workflows/     # monitor.yml, urgentdash-live-publish.yml
```

---

## 3. 검증 결과 (재검토)

### 3.1 루트 Vite 설정: 동작 불가

- `index.html` → `/src/main.jsx` 참조, 루트에 `src/` 없음 (react/src/만 존재)
- `main.jsx` → `./App.jsx`, `./styles.css` import, 루트에 해당 파일 없음
- 루트에서 Vite 실행 시 빌드·실행 불가. legacy 이동해도 영향 없음.

### 3.2 util.js vs utils.js

- 내용 동일 (clamp01, safeNumber, formatTimeGST 등)
- 실제 사용처: react/src/lib/utils.js 만 존재
- 조치: util.js 삭제, utils.js만 legacy 보관

### 3.3 style.css vs style.csx

- 둘 다 유효한 CSS (dark 테마)
- style.csx 확장자 비표준 (오타 가능성). react는 styles.css 사용
- 둘 다 legacy 이동

### 3.4 start_local_dashboard.ps1

- WorkingDirectory: urgentdash 루트
- UI: http.server → `http://127.0.0.1:3000/ui/index_v2.html`
- 문서·루트 코드 이동과 무관. 수정 없음.

### 3.5 문서 상호참조

| 파일 | 참조 | 이동 후 조치 |
|------|------|--------------|
| 컴포넌트구현세부.md | 3파일비교.md (urgentdash/3파일비교.md) | `./3파일비교.md` 또는 `docs/3파일비교.md` |
| 3파일비교.md | 컴포넌트구현세부.md (urgentdash/컴포넌트구현세부.md) | `./컴포넌트구현세부.md` |
| .cursor/plans/patch2... | urgentdash/PATCH2.MD, urgentdash/컴포넌트구현세부.md | urgentdash/docs/PATCH2.MD, urgentdash/docs/컴포넌트구현세부.md |

---

## 4. 이동 계획

### 4.1 Phase 1: 문서 → docs/

| 현재 | 이동 후 |
|------|---------|
| 3파일비교.md | docs/3파일비교.md |
| 컴포넌트구현세부.md | docs/컴포넌트구현세부.md |
| patch.js | docs/patch.js |
| PATCH2.MD | docs/PATCH2.MD |

### 4.2 Phase 2: 루트 코드 → legacy/

| 현재 | 이동 후 | 비고 |
|------|---------|------|
| index.html | legacy/index.html | |
| main.jsx | legacy/main.jsx | |
| package.json | legacy/package.json | |
| vite.config.js | legacy/vite.config.js | |
| style.css | legacy/style.css | |
| style.csx | legacy/style.csx | |
| constants.js | legacy/constants.js | |
| utils.js | legacy/utils.js | utils.js만 이동 |
| util.js | (삭제) | utils.js와 동일, 중복 제거 |

### 4.3 Phase 3: 참조 갱신

| 대상 | 내용 |
|------|------|
| docs/컴포넌트구현세부.md | 3파일비교.md 링크 → `./3파일비교.md` |
| docs/3파일비교.md | 컴포넌트구현세부.md 링크 → `./컴포넌트구현세부.md` |
| README.md | docs 섹션에 3파일비교, 컴포넌트구현세부, PATCH2.MD, patch.js 추가 |
| .cursor/plans/patch2.md_적용_계획_ddc4ccd8.plan.md | PATCH2.MD, 컴포넌트구현세부 경로 → urgentdash/docs/... |

---

## 5. 유지 (변경 없음)

| 항목 | 용도 |
|------|------|
| README.md | 메인 진입 문서 |
| start_local_dashboard.ps1 | 로컬 서버 기동 |
| stop_local_dashboard.ps1 | 서버 중지 |
| refresh_live_state.ps1 | 상태 갱신 |
| docs/ | 문서 (이동 후 포함) |
| legacy/ | 구버전 (이동 후 포함) |
| live/ | 실시간 상태 JSON |
| logs/ | 로그 |
| react/ | Vite React 앱 (PATCH2 적용) |
| scripts/ | Python 스크립트 |
| ui/ | HTML/JSX 대시보드 |
| workflows/ | GitHub Actions |

---

## 6. 적용 순서

1. Phase 1: 문서 4개 docs/로 이동 (3파일비교.md, 컴포넌트구현세부.md, patch.js, PATCH2.MD)
2. Phase 2: 루트 코드 legacy/로 이동 (util.js 삭제, utils.js 등 8개 이동)
3. Phase 3: docs 내부 상호참조 수정, README 갱신, .cursor/plans 경로 수정
4. 확인: start_local_dashboard.ps1로 서버 기동 후 ui/index_v2.html 접근 정상 여부 확인

---

## 7. 주의

- workflows는 `.github/workflows/`에 있어야 GitHub Actions 인식. urgentdash/workflows/는 별도 동기화 정책 적용.
- 루트 package.json 제거 시 npm install 등은 react/ 내부에서만 수행.
- Routes 탭 시각 검증은 로컬(Windows)에서 start_local_dashboard.ps1 후 수동 확인. Playwright 자동화는 일부 환경(libnspr4 등 미설치)에서 제한될 수 있음.
