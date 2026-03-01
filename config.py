from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Telegram
    TELEGRAM_BOT_TOKEN: str = "your_bot_token_here"
    TELEGRAM_CHAT_ID: str = "your_chat_id_here"

    # Twilio WhatsApp
    TWILIO_ACCOUNT_SID: str = "your_twilio_account_sid"
    TWILIO_AUTH_TOKEN: str = "your_twilio_auth_token"
    TWILIO_WHATSAPP_FROM: str = "+14155238886"   # Twilio Sandbox 기본 번호
    # 팀원 WhatsApp 번호 (국제 형식, 쉼표 구분, 예: +821012345678,+971501234567)
    WHATSAPP_RECIPIENTS: str = ""

    # General
    HEADLESS: bool = True
    LOG_LEVEL: str = "INFO"

    # RSS (운영 안정화)
    RSS_ENABLE_AP_FEED: bool = True
    RSS_TIMEOUT_SEC: int = 15
    RSS_LOG_VERBOSE_ERRORS: bool = False
    RSS_USER_AGENT: str = "Iran-UAE-Monitor/1.0"

    # Phase 2 (AI 고도화)
    PHASE2_ENABLED: bool = True
    PHASE2_QUERY_TIMEOUT_SEC: int = 90
    THREAT_THRESHOLD_MEDIUM: int = 40
    THREAT_THRESHOLD_HIGH: int = 70
    THREAT_THRESHOLD_CRITICAL: int = 85
    PHASE2_ALERT_LEVELS: str = "HIGH,CRITICAL"
    PHASE2_PODCAST_ENABLED: bool = False
    PHASE2_REPORT_LANGUAGE: str = "ko"

    # Option A: JSON 아카이브 (시간별 뉴스 링크 + 보고서 영구 저장)
    REPORTS_ARCHIVE_ENABLED: bool = True
    REPORTS_ARCHIVE_DIR: str = "reports"

settings = Settings()
