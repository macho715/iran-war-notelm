# 🚨 Iran-UAE 실시간 전황 모니터링 시스템

> **실시간 이란-UAE 분쟁 뉴스를 자동 수집 → AI 분석 → WhatsApp/Telegram 브리핑**  
> UAE 거주 교민·출장자·기업 보안팀을 위한 자동화 위기 모니터링 솔루션

---

## 🔄 시스템 전체 흐름

```mermaid
flowchart TD
    A["⏰ APScheduler<br/>매 1시간 트리거"] --> B["🕷️ 스크래퍼 레이어<br/>asyncio.gather 병렬"]

    B --> C["📰 UAE 언론 스크래퍼"]
    B --> D["📱 SNS 스크래퍼"]

    C --> C1[Gulf News]
    C --> C2[Khaleej Times]
    C --> C3[The National]
    D --> D1[Facebook]
    D --> D2[Instagram]

    C1 & C2 & C3 & D1 & D2 --> E["🔁 중복 제거<br/>MD5 Hash Filter"]

    E -->|새 기사| F["🤖 NotebookLM<br/>AI 분석 업로드"]
    E -->|중복/없음| Z["⏭️ 스킵"]

    F --> G["📝 Markdown 브리핑 생성"]

    G --> H["📡 Telegram<br/>개인 알림"]
    G --> I["💬 WhatsApp<br/>Twilio 팀 전송"]

    style A fill:#ff6b6b,color:#fff
    style F fill:#4ecdc4,color:#fff
    style H fill:#0088cc,color:#fff
    style I fill:#25d366,color:#fff
    style Z fill:#888,color:#fff
```

---

## ✨ 주요 기능

| 기능 | 설명 |
|---|---|
| 🕷️ **투트랙 스크래퍼** | Playwright(JS 렌더링) + httpx(HTTP 직접 요청) 병렬 스크래핑 |
| 🔁 **중복 제거** | MD5 해시 기반 기사 중복 필터링 |
| 🤖 **AI 분석** | Google NotebookLM 자동 업로드 + 소스 분석 |
| 📱 **WhatsApp 전송** | Twilio API로 팀원 전원에게 자동 발송 |
| 📡 **Telegram 전송** | 개인 실시간 알림 |
| ⏰ **자동 스케줄** | APScheduler 매 1시간 자동 실행 |
| 🐳 **Docker 지원** | 컨테이너 배포 가능 |

---

## 🚀 빠른 시작

### 1. 설치

```bash
git clone https://github.com/your-org/iran-war-uae-monitor
cd iran-war-uae-monitor
pip install -r requirements.txt
playwright install chromium
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 다음 값들을 채워주세요:

```env
# Telegram (필수)
TELEGRAM_BOT_TOKEN=your_bot_token       # @BotFather에서 발급
TELEGRAM_CHAT_ID=your_chat_id           # @userinfobot에서 확인

# Twilio WhatsApp (팀 공유용)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx   # console.twilio.com
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=+14155238886       # Sandbox 기본 번호
WHATSAPP_RECIPIENTS=+971501234567,+821012345678
```

### 3. NotebookLM 로그인 (최초 1회)

```bash
nlm login
```

### 4. 실행

```bash
python main.py        # 매시간 자동 실행
python run_now.py     # 즉시 1회 실행 (테스트)
```

---

## 📁 프로젝트 구조

```mermaid
graph TD
    Root["📁 iran-war-uae-monitor/"]
    Root --> Main["📄 main.py\n파이프라인 + 스케줄러"]
    Root --> Reporter["📄 reporter.py\nTelegram + WhatsApp"]
    Root --> Config["📄 config.py\n환경변수"]
    Root --> Scrapers["📁 scrapers/"]
    Root --> Docs["📁 docs/"]
    Root --> Agent["📁 .agent/skills/"]
    Root --> Github["📁 .github/workflows/"]

    Scrapers --> UAE["📄 uae_media.py\n투트랙 스크래퍼"]
    Scrapers --> Social["📄 social_media.py\nSNS 스크래퍼"]

    Docs --> Arch["📄 ARCHITECTURE.md"]
    Docs --> Layout["📄 LAYOUT.md"]
    Docs --> CL["📄 CHANGELOG.md"]

    style Root fill:#333,color:#fff
    style Main fill:#e74c3c,color:#fff
    style Reporter fill:#3498db,color:#fff
    style UAE fill:#2ecc71,color:#fff
```

---

## 🌐 네트워크 요구사항

```mermaid
graph LR
    PC["🖥️ PC / 서버"]

    PC -->|"✅ UAE 허용"| GN["Gulf News\ngulfnews.com"]
    PC -->|"✅ UAE 허용"| KT["Khaleej Times\nkhaleejtimes.com"]
    PC -->|"✅ UAE 허용"| TN["The National\nthenationalnews.com"]
    PC -->|"✅ UAE 허용"| TW["Twilio API\napi.twilio.com"]
    PC -->|"❌ VPN 필요"| TG["Telegram\napi.telegram.org"]
    PC -->|"❌ VPN 필요"| NLM["NotebookLM\nnotebooklm.google.com"]

    style TG fill:#cc0000,color:#fff
    style NLM fill:#cc0000,color:#fff
    style TW fill:#009900,color:#fff
```

---

## 🐳 Docker 배포

```bash
docker build -t iran-uae-monitor .
docker run -d --env-file .env --name iran-uae-monitor iran-uae-monitor
```

---

## 📊 보고 형식 예시

```
🚨 이란 전쟁 UAE 상황 실시간 보고 (2026-03-01 14:00)

📍 1순위 (아부다비)
• [The National] Zayed International Airport resumes limited operations
• [Gulf News] Abu Dhabi civilian alert level reduced to yellow

📍 2순위 (두바이)
• [Khaleej Times] DXB Departures resume — 47 flights cancelled

🛡️ 안전 메시지: Abu Dhabi / Dubai 체류자는 당국 지시를 따를 것

🔗 출처 링크
• https://thenationalnews.com/...
```

---

## 📄 라이선스

Internal Use Only — UAE 교민 안전 목적 비상업적 사용
