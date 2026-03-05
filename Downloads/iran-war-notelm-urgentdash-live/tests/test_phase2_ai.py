import pytest
import json

from phase2_ai import (
    analyze_with_notebooklm_or_fallback,
    extract_json_payload,
    fallback_analyze,
    score_to_level,
)


class DummyClient:
    def __init__(self, answer: str):
        self.answer = answer

    def query(self, notebook_id: str, query_text: str, timeout: float = 90.0):
        return {"answer": self.answer, "conversation_id": "cid-1"}


def _level_rank(level: str) -> int:
    return {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}[level]


def test_extract_json_payload_direct():
    payload = extract_json_payload('{"threat_level":"HIGH","threat_score":75}')
    assert payload["threat_level"] == "HIGH"
    assert payload["threat_score"] == 75


def test_extract_json_payload_fenced_json():
    text = """
```json
{
  "threat_level": "MEDIUM",
  "threat_score": 58
}
```
"""
    payload = extract_json_payload(text)
    assert payload["threat_level"] == "MEDIUM"
    assert payload["threat_score"] == 58


def test_extract_json_payload_fenced_nested_json_stress():
    nested = {"level": 1}
    for i in range(100):
        nested = {"depth": i, "node": nested}
    nested["threat_level"] = "HIGH"
    nested["threat_score"] = 77
    nested["sentiment"] = "일반"
    nested["abu_dhabi_level"] = "MEDIUM"
    nested["dubai_level"] = "LOW"
    nested["summary"] = "nested nested stress test"
    nested["recommended_action"] = "감시 강화"
    nested["key_points"] = ["a", "b", "c"]
    text = "```json\n" + json.dumps(nested, ensure_ascii=False) + "\n```"
    payload = extract_json_payload(text)
    assert payload["threat_level"] == "HIGH"
    assert payload["threat_score"] == 77


def test_extract_json_payload_without_fence_chooses_valid_braced_object():
    payload = {"threat_level": "LOW", "threat_score": 12, "key_points": ["a"], "summary": "", "recommended_action": "", "abu_dhabi_level": "LOW", "dubai_level": "LOW", "sentiment": "일반"}
    raw_json = json.dumps(payload, ensure_ascii=False)
    text = f"noise {raw_json} trailing text"
    result = extract_json_payload(text)
    assert result["threat_level"] == "LOW"
    assert result["threat_score"] == 12


def test_invalid_json_switches_to_fallback():
    articles = [{"source": "Gulf News", "title": "Missile attack near Abu Dhabi airport", "link": "https://a"}]
    client = DummyClient("this is not valid json")
    analysis = analyze_with_notebooklm_or_fallback(client=client, notebook_id="nb-1", articles=articles)
    assert analysis["analysis_source"] == "fallback"
    assert analysis["threat_level"] in {"MEDIUM", "HIGH", "CRITICAL"}


@pytest.mark.parametrize(
    "score,expected",
    [
        (0, "LOW"),
        (39, "LOW"),
        (40, "MEDIUM"),
        (70, "HIGH"),
        (85, "CRITICAL"),
        (100, "CRITICAL"),
    ],
)
def test_score_to_level_thresholds(score, expected):
    assert score_to_level(score, medium=40, high=70, critical=85) == expected


def test_fallback_sentiment_and_city_levels():
    urgent_articles = [
        {"source": "The National", "title": "Missile attack warning near Abu Dhabi airport", "link": "https://x1"},
        {"source": "Khaleej Times", "title": "Drone intercepted over Abu Dhabi", "link": "https://x2"},
        {"source": "Gulf News", "title": "Dubai mall operations resumed", "link": "https://x3"},
    ]
    urgent = fallback_analyze(urgent_articles)
    assert urgent["sentiment"] == "긴급"
    assert _level_rank(urgent["abu_dhabi_level"]) >= _level_rank(urgent["dubai_level"])

    recovery_articles = [
        {"source": "Gulf News", "title": "Dubai airport resume normal operations", "link": "https://r1"},
    ]
    recovery = fallback_analyze(recovery_articles)
    assert recovery["sentiment"] == "회복"

    normal_articles = [
        {"source": "The National", "title": "UAE minister meets delegation in Abu Dhabi", "link": "https://n1"},
    ]
    normal = fallback_analyze(normal_articles)
    assert normal["sentiment"] == "일반"
