# Phase 4 + Vercel Dashboard 병합 세팅 (바로 적용)

## 목표 구조

- **Data plane (Runner)**: GitHub Actions(매시간) → Python monitor 실행 → **Postgres에 runs/articles/outbox 기록**
- **Control plane (UI)**: Vercel(Next.js dashboard) → **Postgres를 읽어서 조회**
- **옵션 A(파일 원장)**: reports/*.json + *.jsonl 은 그대로 유지(재현/감사)

---

## 1) 패치 적용 (로컬)

1. repo root에서 아래 파일들이 생성/변경되었는지 확인하세요.

- `.github/workflows/monitor.yml` (canonical 실행으로 변경)
- `requirements.txt` (psycopg 추가)
- `iran-war-uae-monitor/src/iran_monitor/config.py` (DATABASE_URL/PG schema 추가)
- `iran-war-uae-monitor/src/iran_monitor/app.py` (DB 기반 dedup + backend persist)
- `iran-war-uae-monitor/src/iran_monitor/storage_backend.py` (sqlite/postgres 자동 스위치)
- `iran-war-uae-monitor/src/iran_monitor/schema_pg.sql` (Postgres DDL)
- `dashboard/` (Vercel용 Next.js)

> 적용 방법: 이 zip을 **repo 루트에 그대로 덮어쓰기(copy merge)** 하시면 됩니다.

---

## 2) Postgres 준비 (SSOT)

### 추천 옵션

- **Neon** 등 외부 Postgres
- Vercel은 2025-07-22 기준으로 **Vercel Postgres 신규 제공이 중단**되었고, 신규 프로젝트는 **Marketplace Postgres integration(예: Neon)** 방식으로 연결하도록 안내합니다.

### 필수 조건

- Runner(GitHub Actions)와 Dashboard(Vercel)가 **같은 DATABASE_URL**을 사용해야 함
- DB 계정이 `CREATE TABLE` 권한이 있어야 자동 스키마 생성이 됩니다.
  - 권한이 없으면, `iran-war-uae-monitor/src/iran_monitor/schema_pg.sql`을 수동 적용하세요.

---

## 3) GitHub Secrets 설정

GitHub repo → Settings → Secrets and variables → Actions → New repository secret


| Key                    | 필수        | 설명                                              |
| ---------------------- | --------- | ----------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`   | ✅         | 텔레그램 봇 토큰                                       |
| `TELEGRAM_CHAT_ID`     | ✅         | 채팅 ID                                           |
| `DATABASE_URL`         | ✅(Phase4) | Postgres DSN (`sslmode=require` 권장)             |
| `STORAGE_BACKEND`      | 옵션        | `postgres` 강제할 때만 설정(미설정이면 DATABASE_URL로 자동 감지) |
| `PHASE2_ENABLED`       | 옵션        | cloud에서는 보통 `false` 권장(NotebookLM 세션 문제)        |
| `TWILIO_ACCOUNT_SID`   | 옵션        | WhatsApp 사용 시                                   |
| `TWILIO_AUTH_TOKEN`    | 옵션        | WhatsApp 사용 시                                   |
| `TWILIO_WHATSAPP_FROM` | 옵션        | WhatsApp 사용 시                                   |
| `WHATSAPP_RECIPIENTS`  | 옵션        | WhatsApp 수신자(콤마구분)                              |


---

## 4) Vercel Dashboard 배포

### (A) Vercel 프로젝트 생성

- Vercel → New Project → GitHub repo 선택
- **Root Directory를 `dashboard`로 지정** (monorepo/subfolder 배포)

### (B) Vercel Environment Variables

Vercel Project → Settings → Environment Variables


| Key               | 필수  | 설명                 |
| ----------------- | --- | ------------------ |
| `DATABASE_URL`    | ✅   | GitHub Actions와 동일 |
| `BASIC_AUTH_USER` | 권장  | 대시보드 Basic Auth    |
| `BASIC_AUTH_PASS` | 권장  | 대시보드 Basic Auth    |


---

## 5) 동작 확인 순서 (Fail-safe)

1. GitHub Actions → `monitor.yml` **workflow_dispatch 수동 실행 1회**
2. Postgres에 `runs/articles/outbox` 테이블 생성 및 데이터 insert 확인
3. Vercel Dashboard 접속 → Overview에 최신 run 표시 확인

---

## 6) 주의 (AMBER)

- GitHub Actions schedule은 **UTC 기준**이고, 큐 상황에 따라 지연/누락 가능성이 있습니다.  
그래서 cron을 `0`분 대신 `7`분으로 옮겨 둠.
- NotebookLM은 cloud에서 세션(쿠키) 문제가 빈번하므로 Phase2를 꺼두고 fallback 분석으로 운영하는 편이 안전합니다.

