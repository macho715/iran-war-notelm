# 📁 Project Layout — Iran-UAE Monitor

## 전체 디렉터리 구조

```mermaid
graph TD
    Root["📁 iran-war-uae-monitor/"]

    Root --> Main["📄 main.py\n★ 메인 진입점\nAPScheduler + 전체 파이프라인"]
    Root --> Rep["📄 reporter.py\nTelegram + WhatsApp 전송"]
    Root --> Cfg["📄 config.py\n환경변수 Settings"]
    Root --> RunNow["📄 run_now.py\n즉시 실행 테스트"]
    Root --> NlmAuto["📄 notebooklm_auto.py\nNotebookLM 단독 테스트"]
    Root --> Env["📄 .env\n환경변수 🔒"]
    Root --> NlmId["📄 .notebooklm_id\n노트북 ID 캐시 자동생성"]
    Root --> Req["📄 requirements.txt"]
    Root --> Docker["📄 Dockerfile"]
    Root --> ReadMe["📄 README.md"]

    Root --> Scrapers["📁 scrapers/"]
    Root --> Docs["📁 docs/"]
    Root --> Agent["📁 .agent/"]
    Root --> Github["📁 .github/"]

    Scrapers --> UAE["📄 uae_media.py\n★ 투트랙 스크래퍼"]
    Scrapers --> Social["📄 social_media.py\nSNS 스크래퍼"]
    Scrapers --> SkillMd["📄 NEWS_SKILL.MD\n설계 원본"]

    Docs --> Arch["📄 ARCHITECTURE.md"]
    Docs --> Layout["📄 LAYOUT.md"]
    Docs --> CL["📄 CHANGELOG.md"]

    Agent --> Skills["📁 skills/"]
    Skills --> Skill["📁 real-time-iran-uae-news/"]
    Skill --> SkillFile["📄 SKILL.md"]

    Github --> Workflows["📁 workflows/"]
    Workflows --> Deploy["📄 monitor.yml"]

    style Main fill:#e74c3c,color:#fff
    style UAE fill:#27ae60,color:#fff
    style Rep fill:#3498db,color:#fff
    style Env fill:#e67e22,color:#fff
    style NlmId fill:#95a5a6,color:#fff
```

---

## 파일 의존 관계

```mermaid
graph LR
    MAIN["main.py"] --> CONFIG["config.py"]
    MAIN --> REP["reporter.py"]
    MAIN --> UAE["scrapers/\nuae_media.py"]
    MAIN --> SM["scrapers/\nsocial_media.py"]
    MAIN --> NLMT["notebooklm_tools\n(외부 패키지)"]

    REP --> CONFIG
    REP --> TGSDK["python-telegram-bot"]
    REP --> TWSDK["twilio"]

    UAE --> PW["playwright"]
    UAE --> HX["httpx"]
    UAE --> BS4["beautifulsoup4"]
    UAE --> TEN["tenacity"]

    SM --> PW
    SM --> TEN

    NLMT --> AUTH["core/auth"]
    NLMT --> CLI["core/client"]

    CONFIG --> ENV["📄 .env"]

    style MAIN fill:#e74c3c,color:#fff
    style CONFIG fill:#f39c12,color:#fff
    style REP fill:#3498db,color:#fff
```

---

## `.env` 환경변수 구조

```mermaid
graph TD
    ENV["📄 .env"]

    ENV --> TG["Telegram 설정"]
    ENV --> TW["Twilio WhatsApp"]
    ENV --> SYS["시스템 설정"]

    TG --> TGT["TELEGRAM_BOT_TOKEN\n@BotFather 발급"]
    TG --> TGC["TELEGRAM_CHAT_ID\n@userinfobot 확인"]

    TW --> TSID["TWILIO_ACCOUNT_SID\nconsole.twilio.com"]
    TW --> TAT["TWILIO_AUTH_TOKEN"]
    TW --> TFROM["TWILIO_WHATSAPP_FROM\n기본: +14155238886"]
    TW --> TREC["WHATSAPP_RECIPIENTS\n팀원 번호 쉼표 구분"]

    SYS --> HL["HEADLESS\ntrue/false"]
    SYS --> LL["LOG_LEVEL\nINFO/DEBUG"]

    style TG fill:#0088cc,color:#fff
    style TW fill:#25d366,color:#fff
    style SYS fill:#95a5a6,color:#fff
```

---

## 런타임 생성 파일

```mermaid
flowchart LR
    RUN["python main.py\n실행"] --> ID["📄 .notebooklm_id\n첫 NotebookLM 업로드 시 생성\nUUID 저장"]
    RUN --> CACHE["📁 __pycache__/\nPython 바이트코드"]

    ID -->|"다음 실행 시"| REUSE["동일 노트북 재사용\n중복 생성 방지"]

    style ID fill:#f39c12,color:#fff
    style REUSE fill:#27ae60,color:#fff
```

---

## 환경변수 상세 테이블

| 변수 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | — | @BotFather에서 발급 |
| `TELEGRAM_CHAT_ID` | ✅ | — | @userinfobot에서 확인 |
| `TWILIO_ACCOUNT_SID` | WhatsApp 시 | — | Twilio Console |
| `TWILIO_AUTH_TOKEN` | WhatsApp 시 | — | Twilio Console |
| `TWILIO_WHATSAPP_FROM` | WhatsApp 시 | `+14155238886` | Sandbox 번호 |
| `WHATSAPP_RECIPIENTS` | WhatsApp 시 | — | 쉼표 구분 국제 번호 |
| `HEADLESS` | ❌ | `true` | Playwright 창 숨김 |
| `LOG_LEVEL` | ❌ | `INFO` | `INFO` / `DEBUG` |
