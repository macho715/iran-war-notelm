# Project Upgrade Report — 대시보드 (Dashboard)

> **범위**: `dashboard/` (Next.js 16 + React 19 + pg). 제안·로드맵만 포함, **자동 코드 변경/커밋/배포 없음**.  
> **작성일**: 2026-03-03 | **Skill**: project-upgrade (Evidence + Best3 Deep)

---

## 1) Executive Summary

- **현재**: Iran-UAE Monitor 대시보드 — App Router, RSC 4페이지(Overview, Runs, Articles, **Outbox**), Postgres 조회·Basic Auth 미들웨어, `output: "standalone"`. Overview는 `Promise.all`로 3쿼리 병렬. Outbox **목록 페이지는 존재**하나 **승인 버튼( pending → approved ) 미구현**.
- **갭**: `loading.tsx`/`error.tsx` 없음 → TTFB 대기·DB 실패 시 복구 UI 부재. 인라인 스타일만 사용. VERCEL.MD 요구인 Outbox 승인 플로우 미완성.
- **제안**: 30일 — Outbox 승인 UI(Server Action/PATCH), `loading.tsx` 4곳, `error.tsx` 4곳. 60일 — Suspense로 Overview 블록별 스트리밍, React 19 `use()` 1곳. 90일 — Vercel 배포·Deployment Protection.

---

## 2) Current State Snapshot (대시보드)

| Area | Status | Evidence (path) | Risk |
|------|--------|-----------------|------|
| Framework | Next.js 16.1.6, React 19.2.4 | dashboard/package.json | Low |
| Config | reactStrictMode, output standalone | dashboard/next.config.ts | Low |
| Routing | App Router: /, /runs, /articles, **/outbox** | app/page.tsx, app/runs, app/articles, app/outbox/page.tsx | Medium — /outbox **승인 UI 없음** |
| Data | pg Pool singleton, fetch*Safe 패턴 | lib/db.ts, lib/queries.ts | Low |
| Auth | Basic Auth (BASIC_AUTH_USER/PASS) | middleware.ts | Low |
| UI | 인라인 스타일, 테이블 위주 | app/**/page.tsx | Low — 접근성/반응형 미흡 |
| Loading/Error | 없음 — force-dynamic만 | page.tsx export const dynamic | Medium — TTFB 대기 |
| API | POST /api/telegram/send | app/api/telegram/send/route.ts | Low |
| Outbox 승인 | updateOutboxStatus 존재, **UI 미연결** | lib/queries.ts | **High** — VERCEL.MD 요구사항 미구현 |

---

## 3) Upgrade Ideas Top 10 (대시보드)

| Rank | Idea | Impact | Effort | Risk | Confidence | PriorityScore | Evidence (최소 1개) |
|------|------|--------|--------|------|------------|---------------|---------------------|
| 1 | Outbox 승인 UI (pending → approved, updateOutboxStatus 연동) | 5 | 2 | 1 | 5 | **12.5** | VERCEL.MD, lib/queries.ts |
| 2 | loading.tsx per route (/, /runs, /articles, /outbox) | 4 | 1 | 1 | 5 | **20.0** | nextjs.org loading-ui-and-streaming, Next.js Learn streaming |
| 3 | error.tsx per route (DB 실패 시 복구 UI) | 3 | 1 | 1 | 5 | **15.0** | nextjs.org error-handling |
| 4 | Suspense로 Overview 블록별 스트리밍 (runs/articles/outbox) | 4 | 2 | 1 | 4 | 8.0 | Next.js Learn streaming, Medium 2025 |
| 5 | Turbopack 옵션 명시 (캐시/디버그, 필요 시) | 2 | 1 | 1 | 5 | 10.0 | nextjs.org turbopack, Next 16 blog |
| 6 | React 19 use() 클라이언트 1곳 (예: Outbox 승인 낙관적 UI) | 3 | 2 | 2 | 4 | 3.0 | Next 16 blog, React 19 docs |
| 7 | 테이블 반응형/접근성 (overflow-x, th scope) | 3 | 2 | 1 | 4 | 6.0 | a11y best practices |
| 8 | Basic Auth 외 Vercel Deployment Protection 연동 | 4 | 2 | 2 | 4 | 4.0 | VERCEL.MD |
| 9 | 번들 분석 (Lighthouse/next-bundle-analyzer) CI | 3 | 2 | 1 | 3 | 4.5 | Vercel 40 rules |
| 10 | PPR(Partial Prerender) 실험 (정적 헤더/푸터) | 2 | 3 | 2 | 3 | 1.0 | Next 15 PPR docs |

*PriorityScore = (Impact × Confidence) / (Effort × Risk)*

---

## 4) Best 3 Deep Report (Deep Dive 템플릿)

> 선정 기준: Top 10 중 PriorityScore 상위 3개 + **Evidence 2개 이상** 또는 **공식 docs + 커뮤니티** 충족.  
> **Best 3**: (1) Outbox 승인 UI, (2) loading.tsx 4곳, (3) error.tsx 4곳.  
> **upgrade-deep-synth** 전용 출력( Gate Summary, Implementation Notes, JSON Envelope 포함 ): [UPGRADE_DEEP_SYNTH_dashboard.md](./UPGRADE_DEEP_SYNTH_dashboard.md)

---

### Best 1: Outbox 승인 UI (pending → approved)

| 항목 | 내용 |
|------|------|
| **Goal** | Outbox 목록에서 `status === 'pending'` 항목에 대해 "승인" 버튼으로 `updateOutboxStatus(msgId, 'approved')` 호출. VERCEL.MD Control plane 요구 충족. |
| **Non-goals** | 실제 전송(send) 트리거는 Runner/GHA 담당. 대시보드는 상태만 approved로 변경. |
| **Proposed Design** | (1) `app/outbox/page.tsx`: Server Component 유지, 테이블에 status별 버튼 영역 추가. (2) Server Action `approveOutbox(msgId)` 또는 API route `PATCH /api/outbox/[msgId]` → `updateOutboxStatus(msgId, 'approved')` 호출 후 revalidate. (3) 클라이언트: "승인" 버튼이 있는 작은 Client Component 또는 form action. |
| **PR Plan** | PR1: Server Action 또는 PATCH API 추가. PR2: Outbox 테이블에 승인 버튼 + 낙관적 UI(선택). PR3: status 규칙(pending/approved/sent) 문서화 + E2E 시나리오. |
| **Tests** | Unit: updateOutboxStatus 호출 시 SQL 실행 검증. Integration: POST/PATCH 후 DB status 변경 확인. E2E: 대시보드에서 pending → approved 클릭 후 목록 갱신. |
| **Rollout & Rollback** | Feature flag 불필요(기존 쿼리만 확장). Rollback: 버튼 제거 PR로 즉시 revert. |
| **Risks & Mitigations** | (1) 승인 후 sender 미연결 시 상태만 바뀌고 전송 안 됨 → 문서/체크리스트로 GHA·sender 연동 확인. (2) 동시 클릭 → idempotent update, attempts+1만 증가. |
| **KPIs** | 승인 클릭 → 2초 이내 목록 반영. DB 오류 시 error.tsx 또는 toast 표시. |
| **Dependencies / Migration** | 없음. 기존 `outbox.status` 값 규칙 유지. |
| **Evidence** | VERCEL.MD (repo, Control plane·outbox), lib/queries.ts (updateOutboxStatus). |

---

### Best 2: loading.tsx per route (4곳)

| 항목 | 내용 |
|------|------|
| **Goal** | 네비게이션 시 즉시 로딩 fallback 표시, TTFB 대기 시 빈 화면 방지. App Router 규약 준수. |
| **Non-goals** | 컴포넌트 단위 Suspense 경계는 Best 4(Overview 스트리밍)에서. |
| **Proposed Design** | (1) `app/loading.tsx`, `app/runs/loading.tsx`, `app/articles/loading.tsx`, `app/outbox/loading.tsx` 4개. (2) 각 파일: `export default function Loading() { return <p>Loading...</p>; }` 또는 스피너/스켈레톤. (3) Next.js가 해당 segment를 자동 Suspense로 감싸서 라우트 전환 시 즉시 fallback 표시. |
| **PR Plan** | PR1: app/loading.tsx (루트). PR2: app/runs, app/articles, app/outbox 각 loading.tsx. PR3: 네비게이션 시 스피너 노출 확인. |
| **Tests** | 수동: 링크 클릭 시 로딩 UI 표시. (선택) Playwright: route 이동 후 loading 텍스트/역할 확인. |
| **Rollout & Rollback** | 배포 후 즉시 적용. Rollback: 파일 삭제만 하면 기존 동작으로 복귀. |
| **Risks & Mitigations** | 기존 데이터 fetch 로직 무변경. loading은 fallback만 담당. |
| **KPIs** | First Contentful Paint < 200ms (로딩 UI), LCP는 데이터 도착 후. |
| **Dependencies** | 없음. |
| **Evidence** | nextjs.org loading-ui-and-streaming (loading.js), Next.js Learn App Router Streaming. |

---

### Best 3: error.tsx per route (4곳)

| 항목 | 내용 |
|------|------|
| **Goal** | DB 조회 실패 등 런타임 에러 시 크래시 대신 복구 UI 표시. 사용자가 재시도 또는 홈으로 이동 가능. |
| **Non-goals** | 404 처리(not-found.tsx)는 별도. 전역 로깅/모니터링은 미포함. |
| **Proposed Design** | (1) `app/error.tsx`, `app/runs/error.tsx`, `app/articles/error.tsx`, `app/outbox/error.tsx`. (2) `'use client'` + `export default function Error({ error, reset }) { ... }`. (3) 메시지 표시 + "다시 시도" 버튼(reset), "Overview로" 링크. (4) getPool() throw 또는 fetch*Safe error 시 해당 segment에서 error boundary 활성화. |
| **PR Plan** | PR1: app/error.tsx (공통). PR2: runs/articles/outbox 각 error.tsx. PR3: DB down 시나리오에서 복구 UI 확인. |
| **Tests** | Unit: Error 컴포넌트 렌더. Integration: mock getPool throw → error.tsx 표시. 수동: DATABASE_URL 잘못 시 에러 화면 확인. |
| **Rollout & Rollback** | 배포 후 적용. Rollback: error.tsx 제거 시 기본 Next 오류 화면. |
| **Risks & Mitigations** | 기존 인라인 error 표시(예: Overview의 dbError)와 중복 가능 → error boundary가 우선, 인라인은 점진 제거 가능. |
| **KPIs** | DB 실패 시 5초 이내 에러 UI 표시, reset 시 재요청. |
| **Dependencies** | 없음. |
| **Evidence** | nextjs.org error-handling (error.js), Next.js Learn error handling. |

---

## 5) Options A/B/C (대시보드)

| 옵션 | 범위 | 기간 | Risk | 비고 |
|------|------|------|------|------|
| **A (보수)** | Outbox 승인 UI + loading.tsx 4곳 + error.tsx 4곳 | 30일 | 낮음 | VERCEL.MD 요구 충족, 코드 변경 최소 |
| **B (중간)** | A + Suspense Overview 스트리밍 + React 19 use() 1곳 + 테이블 접근성 | 60일 | 낮음 | UX·성능 개선 |
| **C (공격)** | B + Vercel 배포 고정, Deployment Protection, PPR 실험(선택) | 90일 | 중간 | 배포·보안·실험 |

---

## 6) 30/60/90-day Roadmap (PR-sized)

| 30d | 60d | 90d |
|-----|-----|-----|
| app/outbox: 승인 버튼 + Server Action 또는 PATCH API → updateOutboxStatus | Overview를 Suspense 3블록(runs/articles/outbox) | Vercel 프로젝트 연결, Root=dashboard |
| app/loading.tsx, app/runs/loading.tsx, app/articles/loading.tsx, app/outbox/loading.tsx | Outbox 승인 클라이언트 use() 또는 server action 낙관적 UI | Deployment Protection 활성화 |
| app/error.tsx, app/runs/error.tsx, app/articles/error.tsx, app/outbox/error.tsx | 테이블 overflow-x + th scope | next-bundle-analyzer 또는 Lighthouse CI (옵션) |
| next.config.ts turbopack {} (필요 시) | — | PPR 실험(선택) |

---

## 7) Evidence Table (Schema 준수)

| # | platform | title | url | published_date | updated_date | accessed_date | popularity_metric | why_relevant |
|---|----------|--------|-----|----------------|--------------|---------------|------------------|--------------|
| E1 | official | File-system conventions: loading.js | https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming | 2025-01-01 | — | 2026-03-03 | docs | loading.tsx 규약, Suspense 자동 래핑 |
| E2 | official | Error Handling | https://nextjs.org/docs/app/building-your-application/routing/error-handling | 2025-01-01 | — | 2026-03-03 | docs | error.tsx 규약, reset |
| E3 | official | App Router: Streaming | https://nextjs.org/learn/dashboard-app/streaming | 2025-01-01 | — | 2026-03-03 | learn | Suspense·스트리밍 패턴 |
| E4 | official | Next.js 16 (Turbopack default) | https://nextjs.org/blog | 2025-01-01 | — | 2026-03-03 | blog | Turbopack stable default |
| E5 | medium | Data Fetching 2025: Streaming, Suspense and Deferred Fetching in Next.js App Router | https://medium.com/better-dev-nextjs-react/... | 2025-01-01 | — | 2026-03-03 | — | 스트리밍·Suspense 실전 |
| E6 | — | VERCEL.MD (repo) | (repo) VERCEL.MD | — | 2026-03-02 | 2026-03-03 | — | Outbox·Control plane·Deployment Protection 요구 |
| E7 | — | lib/queries.ts updateOutboxStatus | (repo) dashboard/lib/queries.ts | — | — | 2026-03-03 | — | 승인 API 존재, UI만 연동 필요 |

---

## 8) AMBER_BUCKET (날짜 불명확 / 근거 부족)

| 후보 | 사유 |
|------|------|
| E6, E7 | published_date 없음 — repo 내부 문서/코드. Top 10·Best 3 **근거**로는 사용, Evidence Table에는 accessed_date만 명시. |
| PPR(Next 15/16) | 실험 기능, 공식 날짜·호환성 문서 확인 후 90일 이후로 검토 권장. |
| Lighthouse 40 rules | 대시보드 페이지 수 적어 우선순위 낮음. CI 추가 시 빌드 시간만 결정하면 됨. |

---

## 9) Open Questions (최대 3개)

1. **Outbox 승인 후 sender 연동**: "승인"은 DB status만 `approved`로 변경. 실제 전송(send)은 GHA/runner가 주기적으로 `status=approved` 폴링 후 전송할지, 별도 webhook/API를 둘지 결정 필요.
2. **PPR**: Next 16에서 PPR 기본 여부·동적 페이지 호환성. 실험 단계면 90일 이후로 미루는 것이 안전한지.
3. **Deployment Protection**: Vercel 대시보드 설정만으로 해결. 팀 권한·Basic Auth와 병행 정책 확인 필요.

---

## 10) Verification Gate (요약)

| Idea | Verdict | Required checks |
|------|---------|------------------|
| Outbox 승인 UI | **PASS** | status 값 규칙(pending/approved/sent), 클릭 시 update 호출 |
| loading.tsx 4곳 | **PASS** | App Router 규약, 네비게이션 시 스피너 |
| error.tsx 4곳 | **PASS** | getPool() throw 시 error boundary 표시 |
| Suspense Overview | **PASS** | Promise.all 블록 분리, 독립 스트리밍 |
| Deployment Protection / PPR / Bundle CI | **AMBER** | 팀·문서 확인 후 적용 |

**Rollout gates**: 로컬·스테이징 DB에서 Outbox 승인 E2E 확인 → PR별 loading/error 추가 → Vercel 배포 전 Deployment Protection·환경 변수 체크리스트.
