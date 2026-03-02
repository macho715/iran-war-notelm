from __future__ import annotations

import os
from datetime import datetime

from .common import SourceSpec, collect_source_specs


TIER0_SPECS: list[SourceSpec] = [
    SourceSpec(
        source_id="tier0_us_embassy_uae",
        name="US Embassy UAE",
        url="https://ae.usembassy.gov/u-s-citizen-services/security-and-travel-information/",
        tier="TIER0",
        indicator_ids=("I01", "I07"),
        keywords=("security alert", "travel advisory", "ordered departure", "do not travel", "leave immediately"),
        critical_keywords=("ordered departure", "do not travel", "leave immediately"),
        interval_min=15,
        priority="critical",
        collection_target="대사관 여행경보 레벨 변경",
    ),
    SourceSpec(
        source_id="tier0_kr_mofa_0404",
        name="KR MOFA 0404",
        # old URL https://www.0404.go.kr/dev/main.mofa returns 404 (URL structure changed)
        # overseas.mofa.go.kr is the MOFA overseas portal with travel advisory content
        url="https://overseas.mofa.go.kr/eng-en/index.do",
        tier="TIER0",
        indicator_ids=("I01", "I07"),
        keywords=("여행경보", "특별여행주의보", "철수권고", "즉시 출국", "leave immediately",
                  "travel advisory", "safety", "security", "alert"),
        critical_keywords=("즉시 출국", "철수권고", "leave immediately"),
        tags=("kr_channel",),
        interval_min=15,
        priority="critical",
        collection_target="한국 외교부 특보 문자/공지",
    ),
    SourceSpec(
        source_id="tier0_uk_fcdo_uae",
        name="UK FCDO UAE Advice",
        url="https://www.gov.uk/foreign-travel-advice/united-arab-emirates",
        tier="TIER0",
        indicator_ids=("I01",),
        keywords=("do not travel", "advice against all travel", "avoid all travel", "terrorist", "missile", "evacuation"),
        critical_keywords=("do not travel", "advice against all travel", "avoid all travel"),
        interval_min=15,
        priority="critical",
        collection_target="UK FCDO 여행경보",
    ),
    SourceSpec(
        source_id="tier0_etihad_updates",
        name="Etihad Travel Updates",
        url="https://www.etihad.com/en/travel-updates",
        tier="TIER0",
        indicator_ids=("I02",),
        keywords=("flight", "cancel", "suspend", "disruption", "resume", "operational update"),
        critical_keywords=("cancel", "suspend", "disruption"),
        tags=("air_update",),
        interval_min=15,
        priority="critical",
        collection_target="Etihad 운항 상태 (AUH)",
    ),
    SourceSpec(
        source_id="tier0_emirates_updates",
        name="Emirates Updates",
        url="https://www.emirates.com/ae/english/help/travel-updates/",
        tier="TIER0",
        indicator_ids=("I02",),
        keywords=("flight", "cancel", "suspend", "disruption", "resume", "travel updates"),
        critical_keywords=("cancel", "suspend", "disruption"),
        tags=("air_update",),
        interval_min=15,
        priority="critical",
        collection_target="Emirates 운항 상태 (DXB)",
    ),
    SourceSpec(
        source_id="tier0_gcaa_notam",
        name="UAE GCAA",
        url="https://www.gcaa.gov.ae/en/Pages/default.aspx",
        tier="TIER0",
        indicator_ids=("I02",),
        keywords=("notam", "airspace", "flight", "suspended", "operations", "navigation"),
        critical_keywords=("airspace", "suspended", "notam"),
        tags=("air_update",),
        interval_min=15,
        priority="critical",
        collection_target="UAE GCAA 항공 NOTAM",
    ),
    SourceSpec(
        source_id="tier0_uae_mod",
        name="UAE Ministry of Defence",
        url="https://www.mod.gov.ae/en",
        tier="TIER0",
        indicator_ids=("I03",),
        keywords=("missile", "drone", "intercepted", "attack", "operation", "armed forces"),
        critical_keywords=("missile", "drone", "attack"),
        tags=("strike",),
        interval_min=30,
        priority="critical",
        collection_target="UAE 국방부 공식 발표",
    ),
    SourceSpec(
        source_id="tier0_uae_mofa",
        name="UAE Ministry of Foreign Affairs",
        url="https://www.mofa.gov.ae/en/mediahub/news",
        tier="TIER0",
        indicator_ids=("I01",),
        keywords=("advisory", "travel", "warning", "security", "emergency"),
        critical_keywords=("warning", "emergency"),
        interval_min=30,
        priority="high",
        collection_target="UAE 정부 외교공지",
    ),
]


async def collect_tier0_signals(*, timeout_sec: float, now: datetime) -> tuple[list[dict], dict[str, dict]]:
    if os.getenv("PYTEST_CURRENT_TEST"):
        return [], {}
    return await collect_source_specs(TIER0_SPECS, timeout_sec=timeout_sec, checked_at=now)
