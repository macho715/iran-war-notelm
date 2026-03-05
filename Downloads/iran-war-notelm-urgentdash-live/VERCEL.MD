1. **판정: 예(가능)** — **Vercel(대시보드·승인·조회)** + **별도 Runner(GitHub Actions/Cloud Run/Docker)** + **Postgres(Neon) SSOT**로 병합하면 Phase 4가 “운영형”으로 깔끔해집니다.
2. **근거:** Vercel은 **Cron Jobs로 Function을 스케줄 실행**할 수 있지만, **정시 정확도 보장은 어렵고**(시간 창 내 실행)([Vercel][1]), Vercel Postgres는 **중단되어 Neon으로 이관**됐으니 DB는 Neon(마켓플레이스) 전제로 잡는 게 안전합니다.([Vercel][2])
3. **다음행동:** 아래 3개 패턴 중 1개 선택 → 공통으로 **DB SSOT(멱등 upsert) + Outbox 승인형** 먼저 고정하세요.

---

## 핵심 병합 아이디어: “Vercel = Control/Read Plane, Runner = Compute Plane”

### 공통 3-레이어(권장)

* **Compute Plane(무거운 일)**: Python runner(Playwright/httpx/NotebookLM)

  * 위치: **GitHub Actions** 또는 **Cloud Run Jobs** 또는 **Docker 상시**
* **Data Plane(SSOT)**: **Neon(Postgres)**

  * `runs / articles / run_articles / outbox` + `health_state`(추가)
  * `canonical_url UNIQUE`, `run_key UNIQUE`로 **중복·재실행에도 1건만 남게**
* **Control/Read Plane(가벼운 일)**: **Vercel Next.js Dashboard**

  * 조회: runs/articles/outbox/health
  * 제어: outbox approve, resend, mute rule, threshold 조정(옵션)
  * 보안: Deployment Protection(접근 통제) 권장([Vercel][3])

---

## 패턴 A/B/C (추천 포함)

### Option A (추천) — **Vercel Dashboard + GitHub Actions Hourly Runner + Neon SSOT**

**언제 최고?** “정시 1시간 배치 + 운영 단순”이 목표일 때

* **스케줄**: GitHub Actions `schedule`(cron)로 runner 실행(정시 운용 용이)
* **Vercel Cron**은 *보조*로만: “헬스체크/누락 감지/리마인드”

  * Vercel Cron은 정밀 타이밍 보장 어려움([Vercel][4])
* **대시보드 역할**

  * Runs/Articles 검색·필터
  * Outbox 승인 버튼(Approve) → status 업데이트 → 별도 sender가 전송
  * NotebookLM pack 회전 현황 표시(최근 48.00개 등)

**장점**: 가장 싸고 단순(가정: minutes 한도 내)
**주의**: Actions 러너 시간·실패 재시도 정책을 확실히

---

### Option B — **Vercel Dashboard + Cloud Run Jobs Runner + Neon SSOT**

**언제 최고?** Playwright/브라우저 자동화 비중이 높아 **런타임이 길거나 변동**이 큰 경우

* Runner를 컨테이너(Job)로 올려서 “실행 후 종료”
* Vercel은 UI/제어만 담당
* Phase 4에서 “무거운 수집”은 Vercel Function으로 하지 않는 게 안정적(최대 실행 시간 제한이 존재)([Vercel][5])

---

### Option C — **Vercel Dashboard + Vercel Cron + Vercel Queues + Neon SSOT**

**언제 최고?** “UI에서 승인/재시도/분기(에스컬레이션) 자동화”를 더 강하게 하고 싶을 때

* **Vercel Cron**이 `/api/cron/hourly`를 호출([Vercel][1])
* 그 API가 **Vercel Queues**로 메시지를 publish → consumer가 처리(재시도/샤딩/보장)([Vercel][6])
* 단, consumer가 “무거운 Playwright”를 직접 돌리면 다시 타임아웃/제약이 걸릴 수 있으니

  * consumer는 **외부 Runner 트리거**(Job 실행 요청) 또는 **가벼운 작업만** 처리 추천

---

## “Option A(JSON 아카이브)”를 Vercel과 병합하는 방법

클라우드에서는 로컬 파일시스템이 영속적이지 않은 구간이 많아서, JSON 아카이브는 아래 중 하나로 옮기면 깔끔합니다.

1. **DB에 JSON 컬럼 저장**(가장 단순)
2. **Vercel Blob에 run JSON 업로드 + blob_url을 DB에 저장**

   * Vercel Blob은 런타임/빌드타임 업로드 가능한 object storage로 문서화됨([Vercel][7])

---

## 대시보드(=Vercel)에서 “승인형 Outbox”를 구현하는 구체 아이디어

### 화면(예)

* `/runs` : run_ts, threat_level, score, delta 요약 + drill-down
* `/articles` : canonical_url, tier, city, first/last_seen + 중복 상태
* `/outbox` : PENDING/APPROVED/SENT/FAILED 큐 + 버튼(Approve/Resend/Cancel)
* `/health` : last_success_ts, source_down flags, NotebookLM auth 상태(가정: health_state 테이블 추가)

### API(예)

* `POST /api/outbox/{msg_id}/approve` → DB status=APPROVED
* `POST /api/outbox/{msg_id}/send` → (권장) Queue publish → sender가 처리
* `GET /api/runs?since=...` / `GET /api/outbox?status=PENDING`

### 보안(필수)

* 운영 URL은 **Deployment Protection**으로 잠그고(Password/Vercel Authentication 등)([Vercel][3])
* Bot Token/DB URL은 Vercel env로 두고 “민감 변수” 옵션 사용(가정: 팀 접근권한 최소화)

---

## 구현 순서(실패 확률 낮은 순)

1. **DB(Neon) SSOT 먼저 고정**: unique 키 + upsert + outbox 상태머신
2. **Runner를 DB로만 쓰게 전환**(JSON 파일은 옵션)
3. **Vercel Next.js 대시보드**: 조회 화면 3개(runs/articles/outbox)부터
4. **승인(approve)만 UI에서 처리** → 전송은 기존 Telegram sender 유지
5. (선택) Blob/Queues 붙이기: 아카이브/재시도 자동화 강화

---

## 결론 추천(한 줄)

* **지금 v1.70 → v3.00 빠르게**면: **Option A(대시보드=Vercel, runner=GHA/Cloud Run, DB=Neon)**가 가장 “덜 망하고” 빨리 갑니다.([Vercel][2])

원하면, **대시보드에 필요한 DB 쿼리 6종(최근 24.00h, HIGH만, city=AD, outbox pending, source_down 등)**을 기준으로 **테이블/인덱스 설계 + 화면 IA(정보구조)**까지 바로 잡아드릴 수 있습니다.

[1]: https://vercel.com/docs/cron-jobs?utm_source=chatgpt.com "Cron Jobs"
[2]: https://vercel.com/docs/postgres?utm_source=chatgpt.com "Postgres on Vercel"
[3]: https://vercel.com/docs/deployment-protection?utm_source=chatgpt.com "Deployment Protection on Vercel"
[4]: https://vercel.com/docs/cron-jobs/usage-and-pricing?utm_source=chatgpt.com "Usage & Pricing for Cron Jobs"
[5]: https://vercel.com/docs/functions/configuring-functions/duration?utm_source=chatgpt.com "Configuring Maximum Duration for Vercel Functions"
[6]: https://vercel.com/docs/queues?utm_source=chatgpt.com "Vercel Queues"
[7]: https://vercel.com/docs/vercel-blob?utm_source=chatgpt.com "Vercel Blob"
