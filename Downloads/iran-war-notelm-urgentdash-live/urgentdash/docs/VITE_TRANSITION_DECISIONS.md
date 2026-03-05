# Vite Transition Decisions (Design Freeze)

- Date: 2026-03-04
- Scope: `dashboard_bundle` frontend migration planning
- Status: Design fixed (implementation deferred)

## 결정 사항

1. 산출물 경로는 `dist/`를 표준으로 사용한다.
2. `index_v2.html`는 현행 메인(비빌드) 진입점으로 유지한다.
3. `legacy/index_1.html`은 비상 fallback 경로로 유지한다.
4. 실제 빌드 도입은 별도 PR에서 수행한다.

## 환경별 서빙 규칙

- local (현재): `python -m http.server`로 `dashboard_bundle/ui/index_v2.html` 직접 서빙
- dev/staging (전환 후): `dist/` 우선 서빙, 실패 시 `ui/index_v2.html` fallback
- prod (전환 후): `dist/`만 서빙, legacy는 롤백 경로로만 노출

## 런타임 요구사항

- Node: `20.19+` 또는 `22.12+`
- 패키지 관리: npm/pnpm 중 1개로 표준화 (구현 PR에서 확정)

## 롤백 정책

1. 문제 발생 시 진입점을 `ui/index_v2.html`로 원복
2. 심각 장애 시 `legacy/index_1.html`로 단기 우회
3. API/data path 정책(API-first)은 롤백하지 않는다
