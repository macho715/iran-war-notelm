import pytest
from telegram.error import BadRequest

from iran_monitor import reporter


def test_split_telegram_chunks_short_message():
    text = "line1\nline2\nline3"
    chunks = reporter._split_telegram_chunks(text, max_len=4096)
    assert chunks == [text]


def test_split_telegram_chunks_long_message_keeps_max_len():
    lines = [f"line-{i}: {'x' * 120}\n" for i in range(80)]
    text = "".join(lines)
    chunks = reporter._split_telegram_chunks(text, max_len=4096)

    assert len(chunks) >= 2
    assert all(len(chunk) <= 4096 for chunk in chunks)
    assert "".join(chunks) == text


def test_split_telegram_chunks_single_oversized_line():
    text = "a" * 5000
    chunks = reporter._split_telegram_chunks(text, max_len=4096)

    assert len(chunks) == 2
    assert len(chunks[0]) == 4096
    assert len(chunks[1]) == 904
    assert "".join(chunks) == text


@pytest.mark.asyncio
async def test_send_telegram_markdown_parse_fallback(monkeypatch):
    send_calls = []

    class FakeBot:
        def __init__(self, token):
            self.token = token

        async def send_message(self, chat_id, text, parse_mode=None):
            send_calls.append(
                {
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": parse_mode,
                }
            )
            if parse_mode == "Markdown":
                raise BadRequest("Can't parse entities: can't find end of entity")

    monkeypatch.setattr(reporter, "Bot", FakeBot)
    monkeypatch.setattr(reporter.settings, "TELEGRAM_BOT_TOKEN", "dummy-token", raising=False)
    monkeypatch.setattr(reporter.settings, "TELEGRAM_CHAT_ID", "dummy-chat", raising=False)

    ok = await reporter._send_telegram("*invalid markdown")

    assert ok is True
    assert len(send_calls) == 2
    assert send_calls[0]["parse_mode"] == "Markdown"
    assert send_calls[1]["parse_mode"] is None
