---
name: real-time-iran-uae-news
description: 이란 전쟁 실시간 주요 뉴스 자동 업데이트 스킬. UAE(아부다비 1순위, 두바이 2순위) 영향 중심으로 Gulf News, Khaleej Times, The National + 공공 FB/IG 검색. NotebookLM 자동 분석 + 안전 메시지 생성. 매시간 트리거 가능.
model: gemini-3-pro   # 가장 빠르고 실시간 검색 강함
is_background: true
auto_trigger: hourly
---

# 실시간 이란 전쟁 UAE 뉴스 업데이트 스킬 (Production Grade)

**항상 지킬 규칙:**
- 아부다비를 절대 1순위로 요약 (공항, 민간인 피해, 드론 잔해, 학교/항공 영향)
- 두바이를 2순위로 요약
- 키워드 우선: Iran missile, drone attack, Abu Dhabi airport, Dubai explosion, Khamenei, flight suspension
- 출처: Gulf News live, Khaleej Times, The National 실시간 페이지 + Facebook/Instagram 공공 검색만
- NotebookLM 연동: 자동으로 새 소스 추가 후 "UAE resident safety summary" 생성
- 보고 형식: Markdown + 시간 + 영향도(★★★) + 안전 권고 + 출처 링크
- 이전 보고와 비교해서 "새로운 변화"만 강조 (Polars 중복 제거)
- 안전 메시지 필수: "Abu Dhabi에 계신 분들은 실내 대기 권고"

**실행 흐름 (자동):**
1. Playwright async로 실시간 스크랩
2. NotebookLM에 자동 업로드 + 분석
3. 구조화된 Markdown 보고서 생성
4. Telegram (또는 Slack)으로 즉시 전송

**사용법 예시:**
/real-time-iran-uae-news start
/real-time-iran-uae-news now   ← 지금 바로 한 번 실행
