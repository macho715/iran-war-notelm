# 🚀 UPGRADE GRAND PLAN — Iran-UAE Monitor

> **현재 v1.4 → 목표 v3.0**  
> 실시간 UAE 안전 모니터링 시스템의 단계별 고도화 로드맵  
> 작성일: 2026-03-01 | 검토 주기: 매월 1회

---

## 현재 시스템 상태 (v1.4 베이스라인)

```mermaid
graph LR
    A["스크래퍼<br/>투트랙"] --> B["중복제거<br/>MD5"] --> C["NotebookLM<br/>업로드"] --> D["Telegram<br/>+ WhatsApp"]
    style A fill:#27ae60,color:#fff
    style B fill:#27ae60,color:#fff
    style C fill:#f39c12,color:#fff
    style D fill:#27ae60,color:#fff
```

| 항목 | 현황 |
|---|---|
| 뉴스 소스 | Gulf News, Khaleej Times, The National |
| 스크래핑 방식 | Playwright(JS) + httpx+BS4 투트랙 |
| AI 분석 | NotebookLM 자동 업로드 (VPN 필요) |
| 알림 채널 | Telegram(개인) + WhatsApp Twilio(팀) |
| 실행 주기 | 매 1시간 |
| 배포 | 로컬 Python 프로세스 |

---

## 📋 업그레이드 로드맵

```mermaid
flowchart LR
    P1["Phase 1\n안정화"] --> P2["Phase 2\nAI 고도화"]
    P2 --> P3["Phase 3\n채널 확장"]
    P3 --> P4["Phase 4\n클라우드"]
    P4 --> P5["Phase 5\n인텔리전스"]

    P1 -.- N1["안정화\nRSS 추가\n프록시 설정"]
    P2 -.- N2["NotebookLM MCP\n심층 분석\n위협 스코어"]
    P3 -.- N3["Slack\nEmail\n웹 대시보드"]
    P4 -.- N4["GitHub Actions\nDocker\nPostgreSQL"]
    P5 -.- N5["자율 분석\n다국어\n자동 에스컬레이션"]

    style P1 fill:#e74c3c,color:#fff
    style P2 fill:#e67e22,color:#fff
    style P3 fill:#f1c40f,color:#000
    style P4 fill:#27ae60,color:#fff
    style P5 fill:#3498db,color:#fff
```

---

## Phase 1 — 안정화 (즉시 착수 가능)

> **목표**: VPN 없이도 100% 자동 실행 가능한 시스템

```mermaid
flowchart TD
    P1["Phase 1 안정화"]
    P1 --> R1["RSS 피드 추가<br/>수집 채널 다각화"]
    P1 --> R2["에러 자동 복구<br/>재시도 + 알림"]
    P1 --> R3["Telegram API<br/>프록시/우회 설정"]
    P1 --> R4["NotebookLM MCP<br/>연결 안정화"]

    R1 --> R1A["• Gulf News RSS<br/>• Al Arabiya RSS<br/>• Reuters Middle East"]
    R2 --> R2A["• Tenacity 재시도<br/>• 실패 시 관리자 알림<br/>• 헬스체크 엔드포인트"]
    R3 --> R3A["• Telegram Bot Webhook<br/>• 프록시 설정<br/>• 대안: Twilio 전용 운영"]
    R4 --> R4A["• nlm login 자동화 모니터링<br/>• 쿠키 갱신 알림<br/>• 소스 누적 관리"]

    style P1 fill:#e74c3c,color:#fff
```

### 세부 태스크

- [ ] **RSS 피드 통합** (`scrapers/rss_feed.py`)
  - `feedparser` 라이브러리 활용
  - Gulf News, Al Arabiya, Reuters, AP Middle East RSS
- [ ] **NotebookLM MCP 연결 강화**
  - VPN/프록시 환경에서도 `nlm` 명령이 원활하도록 셸 스크립트 래핑
  - 로그인 세션 만료 자동 감지
- [ ] **헬스체크 API** (`health.py`)
  - FastAPI 간단한 `/health` 엔드포인트
  - 마지막 성공 실행 시간, 수집 기사 수 노출
- [ ] **에러 알림** — 파이프라인 실패 시 관리자에게 즉시 Telegram 알림

---

## Phase 2 — AI 고도화

> **목표**: 단순 수집 → 지능형 위협 평가 시스템
> **진행 현황 (2026-03-01)**: Core 3기능(위협 스코어링/감성 분석/도시별 분리 알림) 구현 완료, 팟캐스트는 스캐폴드 단계

```mermaid
flowchart LR
    ART["수집 기사"] --> NLM["NotebookLM MCP<br/>심층 분석"] --> SCORE["위협 레벨<br/>스코어링"] --> REPORT["맞춤형<br/>브리핑"]

    SCORE --> L1["🟢 LOW<br/>일상 모니터링"]
    SCORE --> L2["🟡 MEDIUM<br/>주의 권고"]
    SCORE --> L3["🔴 HIGH<br/>즉시 대피 권고"]
    SCORE --> L4["🚨 CRITICAL<br/>긴급 에스컬레이션"]

    style L1 fill:#27ae60,color:#fff
    style L2 fill:#f1c40f,color:#000
    style L3 fill:#e67e22,color:#fff
    style L4 fill:#e74c3c,color:#fff
```

### 세부 태스크

- [x] **NotebookLM 기반 위협 스코어링**
  - NotebookLM의 'Custom Instructions'를 활용해 위협 등급 자동 분류
  - 수집된 모든 기사를 하나의 소스로 묶어 전체적인 맥락 분석
  - LOW / MEDIUM / HIGH / CRITICAL 4단계
- [x] **감성 분석** — 뉴스 톤 분석 (긴급/일반/회복 등)
- [x] **아부다비 vs 두바이 위치 분리 알림**
  - 본인 위치에 따라 맞춤 알림 수신
- [ ] **NotebookLM 자동 팟캐스트 생성** (VPN 환경에서)
  - 매일 요약 오디오 브리핑 생성
  - 현재 상태: `PHASE2_PODCAST_ENABLED` 훅 + `create_audio_overview` 호출 스캐폴드만 구현 (전송/배포 미연결)

---

## Phase 3 — 채널 확장

> **목표**: 더 많은 팀원이 더 다양한 채널로 수신

```mermaid
graph TD
    ENGINE["뉴스 분석 엔진"]

    ENGINE --> TG["📡 Telegram<br/>개인 알림 (현재)"]
    ENGINE --> WA["💬 WhatsApp<br/>팀 공유 (현재)"]
    ENGINE --> SL["💼 Slack<br/>팀 채널 (Phase 3)"]
    ENGINE --> EM["📧 Email<br/>일일 요약 (Phase 3)"]
    ENGINE --> WEB["🌐 웹 대시보드<br/>실시간 지도 (Phase 3)"]
    ENGINE --> NT["📓 Notion DB<br/>기록 보관 (Phase 3)"]

    style TG fill:#0088cc,color:#fff
    style WA fill:#25d366,color:#fff
    style SL fill:#4a154b,color:#fff
    style EM fill:#ea4335,color:#fff
    style WEB fill:#2980b9,color:#fff
    style NT fill:#000,color:#fff
```

### 세부 태스크

- [ ] **Slack Webhook 연동** (`reporter_slack.py`)
- [ ] **이메일 일일 요약** (`reporter_email.py`) — `smtplib` 또는 SendGrid
- [ ] **실시간 웹 대시보드** (`dashboard/`)
  - FastAPI + Jinja2 또는 Next.js
  - UAE 지도 위에 사건 위치 표시
  - 위협 레벨 색상 표시
- [ ] **Notion 데이터베이스 저장** — 기사 아카이빙 + 트렌드 분석

---

## Phase 4 — 클라우드 24시간 배포

> **목표**: 로컬 PC 종료와 관계없이 24시간 자동 운영

```mermaid
flowchart TD
    subgraph "현재 (로컬)"
        LOCAL["🖥️ PC<br/>python main.py<br/>PC 꺼지면 중단"]
    end

    subgraph "Phase 4 (클라우드)"
        GHA["⚙️ GitHub Actions<br/>매시간 cron 실행<br/>무료 (월 2000분)"]
        DOCKER["🐳 Docker<br/>클라우드 서버<br/>24시간 상시"]
        DB["🗄️ PostgreSQL<br/>기사 영구 저장<br/>중복 제거 영속화"]
    end

    LOCAL -->|"마이그레이션"| GHA
    LOCAL -->|"또는"| DOCKER
    DOCKER --> DB

    style LOCAL fill:#e74c3c,color:#fff
    style GHA fill:#2ecc71,color:#fff
    style DOCKER fill:#3498db,color:#fff
```

### 세부 태스크

- [ ] **GitHub Actions 크론 배포** (`.github/workflows/monitor.yml`)
  - `schedule: cron: '0 * * * *'` 매 정시 실행
  - GitHub Secrets에 `.env` 값 저장
  - 무료 플랜: 월 2,000분 제공
- [ ] **PostgreSQL 기사 저장** — SQLAlchemy ORM
  - 재시작 후에도 중복 제거 유지 (현재는 메모리에만 저장됨)
- [ ] **Docker Compose** — main + DB + dashboard 통합 실행
- [ ] **클라우드 서버 배포** — Fly.io (무료 티어) 또는 Railway

---

## Phase 5 — 인텔리전스 고도화

> **목표**: 수동 모니터링 → 완전 자율 위기 대응 시스템

```mermaid
flowchart TD
    P5["Phase 5 인텔리전스"]
    P5 --> PR["📈 예측 모델<br/>사전 경보"]
    P5 --> ML["위협 패턴 학습<br/>ML 분류기"]
    P5 --> MULTI["🌍 다국어 지원<br/>아랍어·한국어·영어"]
    P5 --> ESC["🚨 자동 에스컬레이션<br/>위협 레벨별 자동 조치"]
    P5 --> API["📡 외부 API 통합<br/>ACLED·GDelt·UN 경보"]
```

### 세부 태스크

- [ ] **에스컬레이션 자동화**
  - CRITICAL 감지 시 → 전체 팀원에게 SMS + WhatsApp + 이메일 동시 발송
  - 대피 루트 자동 첨부 (Google Maps API)
- [ ] **다국어 지원** — 한국어·영어·아랍어 번역 자동화
- [ ] **ACLED / GDelt API 연동** — 학술 분쟁 데이터베이스와 교차 검증
- [ ] **주간 트렌드 리포트** — 7일 데이터 자동 분석 + 시각화

---

## 우선순위 매트릭스

```mermaid
graph TD
    subgraph "즉시 착수 - 쉽고 효과 큼"
        A1["RSS 피드 추가"]
        A2["NotebookLM 연동 강화"]
        A3["에러 자동 복구"]
        A4["GitHub Actions 배포"]
    end
    subgraph "중기 계획 - 효과 크지만 공수 있음"
        B1["위협 레벨 스코어링"]
        B2["웹 대시보드"]
        B3["PostgreSQL 저장"]
    end
    subgraph "장기 계획 - 복잡도 높음"
        C1["ML 예측 모델"]
        C2["다국어 지원"]
    end
    subgraph "보조 기능 - 낮은 우선순위"
        D1["Slack 연동"]
    end

    style A1 fill:#e74c3c,color:#fff
    style A2 fill:#e74c3c,color:#fff
    style A3 fill:#e74c3c,color:#fff
    style A4 fill:#e74c3c,color:#fff
    style B1 fill:#e67e22,color:#fff
    style B2 fill:#e67e22,color:#fff
    style B3 fill:#e67e22,color:#fff
    style C1 fill:#3498db,color:#fff
    style C2 fill:#3498db,color:#fff
    style D1 fill:#95a5a6,color:#fff
```

---

## 예상 일정

| Phase | 기간 | 주요 성과 |
|---|---|---|
| **Phase 1** | 즉시 ~ 1주 | VPN 없이 완전 자동 실행, RSS 추가 |
| **Phase 2** | 2~3주 | NotebookLM 위협 스코어링 |
| **Phase 3** | 3~4주 | Slack + 이메일 + 웹 대시보드 |
| **Phase 4** | 1~2개월 | 24시간 클라우드 자동 운영 |
| **Phase 5** | 3~6개월 | 완전 자율 위기 대응 시스템 |

---

## 기술 스택 로드맵

```mermaid
graph LR
    subgraph "현재 v1.4"
        S1["Python 3.11"]
        S2["Playwright + httpx"]
        S3["NotebookLM MCP"]
        S4["Telegram + Twilio"]
        S5["APScheduler"]
    end

    subgraph "목표 v3.0"
        T1["Python 3.12+"]
        T2["Playwright + httpx + feedparser"]
        T3["NotebookLM MCP (Intelligence)"]
        T4["Telegram + WhatsApp + Slack + Email"]
        T5["GitHub Actions + Docker"]
        T6["FastAPI Dashboard"]
        T7["PostgreSQL"]
    end

    S1 --> T1
    S2 --> T2
    S3 --> T3
    S4 --> T4
    S5 --> T5

    style T1 fill:#3498db,color:#fff
    style T3 fill:#4ecdc4,color:#fff
    style T5 fill:#e74c3c,color:#fff
    style T6 fill:#9b59b6,color:#fff
    style T7 fill:#e67e22,color:#fff
```

---

> 📌 **다음 즉시 착수 항목**: Phase 1 — RSS 피드 통합 + NotebookLM MCP 연결 안정화  
