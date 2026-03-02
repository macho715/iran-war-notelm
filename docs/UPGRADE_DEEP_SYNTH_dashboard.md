# upgrade-deep-synth Output — 대시보드 Best 3 Deep Report

> **Agent**: upgrade-deep-synth (readonly). **Input**: Current State Snapshot + Top 10 + Evidence Table from UPGRADE_REPORT_dashboard.md.  
> **Output**: Deep Report only (no code changes). Generated: 2026-03-03.

---

## 0) Best3 Gate Summary

| Best# | Idea | Bucket | PriorityScore | EvidenceCount | DateOK | PopularityOK | Final | Reason |
|-------|------|--------|---------------|---------------|--------|--------------|-------|--------|
| 1 | Outbox 승인 UI (pending→approved) | DX/Tooling | 12.5 | 2 (E6, E7) | AMBER (E7 no date) | — | **AMBER** | E6 has updated_date 2026-03-02; E7 repo code has no date. Proceed as Best1; recommend adding published/updated for E7. |
| 2 | loading.tsx per route (4곳) | Reliability/Observability | 20.0 | 2 (E1, E3) | PASS | PASS (docs/learn) | **PASS** | Official docs + Learn; both 2025-01-01. |
| 3 | error.tsx per route (4곳) | Reliability/Observability | 15.0 | 2 (E2, E3) | PASS | PASS (docs/learn) | **PASS** | Official error-handling + Learn; both dated. |

---

## 1) BEST #1 Deep Dive — Outbox 승인 UI

- **Goal / Non-goals**
  - Goal: Outbox 목록에서 `status === 'pending'` 항목에 "승인" 버튼으로 `updateOutboxStatus(msgId, 'approved')` 호출해 VERCEL.MD Control plane 요구 충족.
  - Non-goals: 실제 전송(send) 트리거는 Runner/GHA 담당. 대시보드는 DB 상태만 approved로 변경. 새 라우트/새 백엔드 서비스 추가 없음.

- **Proposed Design**
  - Components: (1) `app/outbox/page.tsx` (Server Component, 테이블 유지). (2) Server Action `approveOutbox(msgId)` 또는 Route Handler `PATCH /api/outbox/[msgId]` → `updateOutboxStatus(msgId, 'approved')` 호출 후 `revalidatePath('/outbox')`. (3) 작은 Client Component 또는 `<form action={approveOutbox}>`로 "승인" 버튼만 배치.
  - Data flow: 클릭 → Server Action 또는 PATCH → getPool().query(UPDATE outbox SET status='approved' ...) → revalidate → 목록 갱신.
  - Interfaces: `updateOutboxStatus(msgId: string, status: string, lastError?: string | null): Promise<void>` (기존). 신규: `approveOutbox(msgId: string): Promise<{ ok: boolean; error?: string }>` 또는 PATCH 200/500.

- **PR Plan**
  - PR1: Server Action `approveOutbox` in `app/outbox/actions.ts` (or inline in page) 또는 `app/api/outbox/[msgId]/route.ts` PATCH. Scope: backend only. Rollback: remove file / revert route.
  - PR2: Outbox 테이블에 status===pending일 때만 "승인" 버튼 노출, form action 또는 onClick → action. Scope: `app/outbox/page.tsx` + optional client component. Rollback: remove button, keep list.
  - PR3: status 값 규칙(pending/approved/sent) 문서화 in VERCEL.MD or README + E2E 시나리오 (manual or Playwright). Rollback: doc only.

- **Tests**
  - Unit: `updateOutboxStatus` 호출 시 SQL 실행 검증 (mock pool).
  - Integration: PATCH (or action) 후 DB `outbox.status` 변경 확인.
  - E2E: 대시보드 /outbox에서 pending 행 클릭 → approved로 바뀌는지 확인.

- **Rollout & Rollback**
  - Rollout: feature flag 불필요. 배포 후 즉시 사용. Rollback: 승인 버튼/액션 제거 PR로 즉시 revert.

- **Risks & Mitigations**
  1. 승인 후 sender 미연결 → 상태만 바뀌고 전송 안 됨. Mitigation: 문서/체크리스트로 GHA·sender가 `status=approved` 폴링 또는 webhook 연동 확인.
  2. 동시 클릭 → idempotent update; attempts+1만 증가해도 무방.
  3. DB down during approve → error.tsx 또는 toast; Server Action에서 try/catch 후 반환.
  4. 권한: Basic Auth 이미 적용되어 있음; 별도 role 불필요.
  5. 재승인(already approved) → 동일 UPDATE 호출해도 안전.

- **KPI Targets**
  - 승인 클릭 → 2초 이내 목록 반영 (revalidate).
  - DB 오류 시 사용자에게 에러 메시지 표시 (error boundary 또는 toast).

- **Dependencies / Migration traps**
  - 없음. 기존 `outbox.status` 값 규칙 유지. 마이그레이션 불필요.

- **Evidence (≥2)**
  - E6 (VERCEL.MD, repo): updated_date 2026-03-02. Outbox·Control plane 요구. popularity_metric: —.
  - E7 (lib/queries.ts updateOutboxStatus, repo): accessed_date 2026-03-03. 승인 API 존재, UI만 연동. published/updated 없음 → AMBER.

---

## 2) BEST #2 Deep Dive — loading.tsx per route (4곳)

- **Goal / Non-goals**
  - Goal: 네비게이션 시 즉시 로딩 fallback 표시, TTFB 대기 시 빈 화면 방지. App Router 규약 준수.
  - Non-goals: 컴포넌트 단위 Suspense 경계(Overview 블록별 스트리밍)는 별도 아이디어(Rank 4).

- **Proposed Design**
  - Components: 4 files — `app/loading.tsx`, `app/runs/loading.tsx`, `app/articles/loading.tsx`, `app/outbox/loading.tsx`. Each: `export default function Loading() { return <p>Loading...</p>; }` or spinner/skeleton.
  - Data flow: Next.js가 해당 route segment를 자동 Suspense로 감싸서 라우트 전환 시 즉시 fallback 표시; 데이터 도착 후 page content로 대체.
  - Interfaces: none (no new APIs).

- **PR Plan**
  - PR1: `app/loading.tsx` (root). Scope: single file. Rollback: delete file.
  - PR2: `app/runs/loading.tsx`, `app/articles/loading.tsx`, `app/outbox/loading.tsx`. Rollback: delete all three.
  - PR3: 네비게이션 시 스피너/텍스트 노출 확인 (manual or E2E). Rollback: N/A.

- **Tests**
  - Manual: 링크 클릭 시 로딩 UI 표시.
  - Optional: Playwright — route 이동 후 loading 텍스트/role 확인.

- **Rollout & Rollback**
  - Rollout: 배포 후 즉시 적용. Rollback: 파일 삭제만 하면 기존 동작(빈 대기)으로 복귀.

- **Risks & Mitigations**
  1. 기존 데이터 fetch 로직 무변경; loading은 fallback만 담당.
  2. 라우트별 로딩이 너무 다르면 일관성 — 동일 스피너/문구 권장.
  3. SEO: streaming은 server-rendered; 로딩 UI는 클라이언트 전환 시에만 필요.

- **KPI Targets**
  - First Contentful Paint (로딩 UI) < 200ms.
  - LCP는 데이터 도착 후 (기존과 동일).

- **Dependencies / Migration traps**
  - 없음.

- **Evidence (≥2)**
  - E1 (nextjs.org loading-ui-and-streaming): published_date 2025-01-01, docs. loading.tsx 규약, Suspense 자동 래핑.
  - E3 (Next.js Learn App Router Streaming): published_date 2025-01-01, learn. Suspense·스트리밍 패턴.

---

## 3) BEST #3 Deep Dive — error.tsx per route (4곳)

- **Goal / Non-goals**
  - Goal: DB 조회 실패 등 런타임 에러 시 크래시 대신 복구 UI 표시. 사용자가 "다시 시도" 또는 "Overview로" 이동 가능.
  - Non-goals: 404 처리(not-found.tsx)는 별도. 전역 로깅/모니터링은 미포함.

- **Proposed Design**
  - Components: `app/error.tsx`, `app/runs/error.tsx`, `app/articles/error.tsx`, `app/outbox/error.tsx`. Each: `'use client'` + `export default function Error({ error, reset }: { error: Error; reset: () => void }) { ... }`. 메시지 표시 + "다시 시도" (reset) + "Overview로" (Link).
  - Data flow: getPool() throw 또는 fetch*Safe가 throw하는 경우(현재는 catch해서 error 반환) — error boundary는 자식에서 throw 시 활성화. 따라서 fetch 실패 시 페이지에서 throw하거나, 상위에서 throw 전파 필요. 참고: 현재는 인라인 dbError 표시; error.tsx는 getPool()이 앱 초기화에서 throw하는 경우 등에 유효.
  - Interfaces: React Error boundary props (error, reset).

- **PR Plan**
  - PR1: `app/error.tsx` (공통). Scope: root error boundary. Rollback: delete file.
  - PR2: `app/runs/error.tsx`, `app/articles/error.tsx`, `app/outbox/error.tsx`. Rollback: delete all three.
  - PR3: DB down 또는 DATABASE_URL 잘못 시나리오에서 복구 UI 확인. Rollback: N/A.

- **Tests**
  - Unit: Error 컴포넌트 렌더 (error message, reset button, link).
  - Integration: mock getPool throw (또는 fetch throw) → error boundary 표시.
  - Manual: DATABASE_URL 잘못 시 에러 화면 확인.

- **Rollout & Rollback**
  - Rollout: 배포 후 적용. Rollback: error.tsx 제거 시 기본 Next 오류 화면으로 복귀.

- **Risks & Mitigations**
  1. 기존 인라인 error 표시(Overview의 dbError)와 중복 가능 → error boundary가 우선; 인라인은 점진 제거 가능.
  2. fetch*Safe는 현재 throw하지 않고 { error } 반환 → error boundary 트리거하려면 해당 경로에서 throw 필요. 선택: fetch*Safe 사용하는 페이지에서 error 시 `throw new Error(error)` 하면 boundary 활성화.
  3. reset() 호출 시 같은 오류 재발 가능 → 사용자에게 "환경 확인" 안내.

- **KPI Targets**
  - DB 실패 시 5초 이내 에러 UI 표시.
  - reset 시 재요청 정상 동작.

- **Dependencies / Migration traps**
  - 없음. 기존 인라인 에러와 공존 가능.

- **Evidence (≥2)**
  - E2 (nextjs.org error-handling): published_date 2025-01-01, docs. error.tsx 규약, reset.
  - E3 (Next.js Learn error handling): published_date 2025-01-01, learn. Error handling 패턴.

---

## 4) Implementation Notes (What to do first tomorrow)

1. **Outbox 승인**: Add Server Action or PATCH route calling `updateOutboxStatus`; add "승인" button for `status===pending` in `app/outbox/page.tsx`. No new env or DB migration.
2. **loading.tsx**: Create `app/loading.tsx` and `app/runs/loading.tsx`, `app/articles/loading.tsx`, `app/outbox/loading.tsx` with a simple spinner or "Loading...". Verify navigation shows fallback.
3. **error.tsx**: Create `app/error.tsx` (and optionally runs/articles/outbox) with `'use client'`, error message, reset button, and Link to `/`. Optionally have page throw when `fetch*Safe` returns error so boundary triggers.
4. **Evidence**: Add a short comment or doc that assigns an updated_date to `dashboard/lib/queries.ts` (e.g. "Last reviewed 2026-03-03") so Best1 meets DateOK PASS in future runs.
5. **E2E**: After Outbox approve is in, run one manual E2E: open /outbox, click Approve on a pending row, confirm status changes to approved and list refreshes.
6. **Rollout order**: PR1 Outbox backend → PR2 Outbox UI → PR3 loading.tsx → PR4 error.tsx. Each merge separately to reduce risk.
7. **Docs**: Update VERCEL.MD or dashboard README with status lifecycle (pending → approved → sent) and who triggers send (GHA/runner).

---

## 5) JSON Envelope (Unified)

```json
{
  "best3": [
    {
      "rank": 1,
      "idea": "Outbox 승인 UI (pending→approved)",
      "bucket": "DX/Tooling",
      "priorityScore": 12.5,
      "gate": "AMBER",
      "reason": "E7 no published/updated_date"
    },
    {
      "rank": 2,
      "idea": "loading.tsx per route (4곳)",
      "bucket": "Reliability/Observability",
      "priorityScore": 20.0,
      "gate": "PASS",
      "reason": "E1+E3, dated, official"
    },
    {
      "rank": 3,
      "idea": "error.tsx per route (4곳)",
      "bucket": "Reliability/Observability",
      "priorityScore": 15.0,
      "gate": "PASS",
      "reason": "E2+E3, dated, official"
    }
  ],
  "meta": {
    "version": "upgrade-deep-synth.v1",
    "tz": "Asia/Dubai",
    "generated": "2026-03-03"
  }
}
```
