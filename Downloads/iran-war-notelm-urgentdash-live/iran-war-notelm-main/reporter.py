from datetime import datetime

import structlog
from telegram import Bot

from config import settings

logger = structlog.get_logger()


def _split_by_city(articles: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    ad_keywords = ("abu dhabi", "abudhabi", "zayed", "아부다비")
    dxb_keywords = ("dubai", "dxb", "두바이")

    ad_articles: list[dict] = []
    dxb_articles: list[dict] = []
    other_articles: list[dict] = []

    for article in articles:
        text = f"{article.get('title', '')} {article.get('link', '')}".lower()
        if any(k in text for k in ad_keywords):
            ad_articles.append(article)
            continue
        if any(k in text for k in dxb_keywords):
            dxb_articles.append(article)
            continue
        other_articles.append(article)

    return ad_articles, dxb_articles, other_articles


def _level_emoji(level: str) -> str:
    if level == "CRITICAL":
        return "🚨"
    if level == "HIGH":
        return "🔴"
    if level == "MEDIUM":
        return "🟡"
    return "🟢"


def _build_report(
    articles: list[dict],
    analysis: dict | None = None,
    notebook_url: str | None = None,
) -> str:
    """공통 Markdown 보고서 생성"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    report = f"🚨 *이란 전쟁 UAE 상황 실시간 보고* ({now})\n\n"

    if analysis:
        threat_level = str(analysis.get("threat_level", "LOW"))
        threat_score = analysis.get("threat_score", 0)
        sentiment = analysis.get("sentiment", "일반")
        ad_level = str(analysis.get("abu_dhabi_level", "LOW"))
        dxb_level = str(analysis.get("dubai_level", "LOW"))
        summary = str(analysis.get("summary", "")).strip()
        action = str(analysis.get("recommended_action", "")).strip()
        key_points = analysis.get("key_points") or []
        analysis_source = analysis.get("analysis_source", "unknown")

        report += "🧠 *Phase 2 AI 위협 평가*\n"
        report += f"• 전체 위협: {_level_emoji(threat_level)} *{threat_level}* ({threat_score}/100)\n"
        report += f"• 감성 톤: *{sentiment}*\n"
        report += f"• 도시별: Abu Dhabi {_level_emoji(ad_level)} *{ad_level}* | Dubai {_level_emoji(dxb_level)} *{dxb_level}*\n"
        report += f"• 분석 소스: `{analysis_source}`\n"
        if summary:
            report += f"• 요약: {summary}\n"
        if action:
            report += f"• 권고: {action}\n"

        if isinstance(key_points, list) and key_points:
            report += "• 핵심 포인트:\n"
            for point in key_points[:3]:
                report += f"  - {point}\n"
        report += "\n"

    ad_articles, dxb_articles, other = _split_by_city(articles)

    report += "📍 *1순위 (아부다비)*\n"
    for a in ad_articles[:3]:
        report += f"• [{a['source']}] {a['title']}\n"
    if not ad_articles:
        report += "• 현재 아부다비 관련 특이 동향 없음\n"

    report += "\n📍 *2순위 (두바이)*\n"
    for a in dxb_articles[:3]:
        report += f"• [{a['source']}] {a['title']}\n"
    if not dxb_articles:
        report += "• 현재 두바이 관련 특이 동향 없음\n"

    report += "\n📌 *전체 뉴스*\n"
    for a in other[:5]:
        report += f"• [{a['source']}] {a['title']}\n"

    if analysis and analysis.get("recommended_action"):
        report += f"\n> 🛡️ *안전 메시지*: {analysis['recommended_action']}\n"
    else:
        report += "\n> 🛡️ *안전 메시지*: Abu Dhabi / Dubai에 계신 분들은 불필요한 외출 자제 권고\n"

    report += "\n🔗 *출처 링크*\n"
    seen = set()
    for a in articles:
        link = a.get("link")
        if link and link not in seen:
            report += f"• {link}\n"
            seen.add(link)

    if notebook_url and notebook_url not in seen:
        report += f"• {notebook_url}\n"
        seen.add(notebook_url)

    return report


async def _send_telegram(report: str) -> None:
    """Telegram으로 보고서 전송"""
    if not settings.TELEGRAM_BOT_TOKEN or settings.TELEGRAM_BOT_TOKEN == "your_bot_token_here":
        logger.warning("TELEGRAM_BOT_TOKEN 미설정, 텔레그램 전송 생략")
        return
    try:
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        await bot.send_message(
            chat_id=settings.TELEGRAM_CHAT_ID,
            text=report,
            parse_mode="Markdown",
        )
        logger.info("📱 텔레그램 보고서 전송 완료")
    except Exception as e:
        logger.error("텔레그램 전송 실패", error=str(e))


def _send_whatsapp(report: str) -> None:
    """Twilio WhatsApp으로 팀원들에게 보고서 전송"""
    if not settings.TWILIO_ACCOUNT_SID or settings.TWILIO_ACCOUNT_SID == "your_twilio_account_sid":
        logger.warning("TWILIO_ACCOUNT_SID 미설정, WhatsApp 전송 생략")
        return

    try:
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        max_len = 1500
        chunks = [report[i : i + max_len] for i in range(0, len(report), max_len)]
        recipients = [n.strip() for n in settings.WHATSAPP_RECIPIENTS.split(",") if n.strip()]

        for number in recipients:
            to = f"whatsapp:{number}"
            frm = f"whatsapp:{settings.TWILIO_WHATSAPP_FROM}"
            for chunk in chunks:
                client.messages.create(body=chunk, from_=frm, to=to)
            logger.info("💬 WhatsApp 전송 완료", to=number)

    except Exception as e:
        logger.error("WhatsApp 전송 실패", error=str(e))


async def send_telegram_alert(message: str) -> None:
    """즉시 경보용 단문 Telegram 전송."""
    if not settings.TELEGRAM_BOT_TOKEN or settings.TELEGRAM_BOT_TOKEN == "your_bot_token_here":
        logger.warning("TELEGRAM_BOT_TOKEN 미설정, 즉시 경보 생략")
        return
    try:
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        await bot.send_message(chat_id=settings.TELEGRAM_CHAT_ID, text=message)
        logger.info("📢 즉시 경보 전송 완료")
    except Exception as e:
        logger.error("즉시 경보 전송 실패", error=str(e))


async def send_telegram_report(
    articles: list[dict],
    analysis: dict | None = None,
    notebook_url: str | None = None,
) -> None:
    """Telegram + WhatsApp 동시 전송 (메인 진입점)"""
    report = _build_report(articles, analysis=analysis, notebook_url=notebook_url)
    await _send_telegram(report)
    _send_whatsapp(report)
