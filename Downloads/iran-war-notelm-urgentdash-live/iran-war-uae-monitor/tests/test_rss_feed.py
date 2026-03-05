import asyncio

import httpx
import pytest

from iran_monitor.scrapers import rss_feed


class _DummyResponse:
    def __init__(self, status_code: int, content_type: str, content: bytes = b""):
        self.status_code = status_code
        self.headers = {"content-type": content_type}
        self.content = content


def test_fetch_feed_http_non_2xx(monkeypatch):
    monkeypatch.setattr(
        rss_feed.httpx,
        "get",
        lambda *args, **kwargs: _DummyResponse(404, "text/html", b"<html>404</html>"),
    )
    entries, failed, reason = rss_feed._fetch_feed("https://example.com/rss")
    assert entries == []
    assert failed is True
    assert reason == "http_non_2xx"


def test_fetch_feed_html_content(monkeypatch):
    monkeypatch.setattr(
        rss_feed.httpx,
        "get",
        lambda *args, **kwargs: _DummyResponse(200, "text/html", b"<html>ok</html>"),
    )
    entries, failed, reason = rss_feed._fetch_feed("https://example.com/rss")
    assert entries == []
    assert failed is True
    assert reason == "html_content"


def test_fetch_feed_dns_error(monkeypatch):
    def _raise_dns(*args, **kwargs):
        req = httpx.Request("GET", "https://feeds.apnews.com/rss/topnews")
        raise httpx.ConnectError("getaddrinfo failed", request=req)

    monkeypatch.setattr(rss_feed.httpx, "get", _raise_dns)
    entries, failed, reason = rss_feed._fetch_feed("https://feeds.apnews.com/rss/topnews")
    assert entries == []
    assert failed is True
    assert reason == "dns_error"


def test_invalid_token_regression_no_feedparser_for_404_html(monkeypatch):
    monkeypatch.setattr(
        rss_feed.httpx,
        "get",
        lambda *args, **kwargs: _DummyResponse(404, "text/html", b"<html>404 with invalid token &nbsp;</html>"),
    )

    called = {"value": False}

    def _should_not_call_parse(_):
        called["value"] = True
        raise AssertionError("feedparser.parse should not be called for 404 HTML")

    monkeypatch.setattr(rss_feed.feedparser, "parse", _should_not_call_parse)

    _, failed, reason = rss_feed._fetch_feed("https://bad-feed.example/rss")
    assert failed is True
    assert reason == "http_non_2xx"
    assert called["value"] is False


def test_ap_feed_policy_toggle(monkeypatch):
    monkeypatch.setattr(rss_feed.settings, "RSS_ENABLE_AP_FEED", True, raising=False)
    feeds_with_ap = rss_feed._build_feed_list()
    assert any(f["name"] == "AP Top News" for f in feeds_with_ap)

    monkeypatch.setattr(rss_feed.settings, "RSS_ENABLE_AP_FEED", False, raising=False)
    feeds_without_ap = rss_feed._build_feed_list()
    assert not any(f["name"] == "AP Top News" for f in feeds_without_ap)


@pytest.mark.asyncio
async def test_scrape_rss_aggregates_fail_reasons(monkeypatch):
    monkeypatch.setattr(
        rss_feed,
        "_build_feed_list",
        lambda: [
            {"name": "A", "url": "https://a"},
            {"name": "B", "url": "https://b"},
        ],
    )

    calls = {"n": 0}

    def _fake_fetch(_url):
        calls["n"] += 1
        if calls["n"] == 1:
            return ([], True, "dns_error")
        return ([], True, "http_non_2xx")

    monkeypatch.setattr(rss_feed, "_fetch_feed", _fake_fetch)

    log_calls = []

    def _fake_log(msg, **kwargs):
        log_calls.append((msg, kwargs))

    monkeypatch.setattr(rss_feed.logger, "info", _fake_log)

    result = await rss_feed.scrape_rss()
    assert result == []
    assert len(log_calls) == 1
    kwargs = log_calls[0][1]
    assert kwargs["fail_count"] == 2
    assert kwargs["fail_by_reason"]["dns_error"] == 1
    assert kwargs["fail_by_reason"]["http_non_2xx"] == 1
