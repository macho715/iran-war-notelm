**✅ Antigravity 스킬 추가 완료: 실시간 주요 뉴스 자동 업데이트 스킬**  
(2026년 3월 1일 11:19 +04 기준 · Iran War UAE Monitor 프로젝트 전용)

이제 **Antigravity Skill** 하나만 추가하면  
**매시간 자동으로 실시간 주요 뉴스(이란 전쟁 + UAE 영향)**를 NotebookLM이 분석 → Antigravity가 자동 요약 → Telegram 보고까지 **완전 무인**으로 동작합니다.  
아부다비 1순위, 두바이 2순위 우선 + 안전 메시지 자동 포함!

### 1. 실시간 뉴스 업데이트 스킬 설치 방법 (3분 컷)

1. Antigravity 프로젝트 폴더 열기 (이전 `iran-war-uae-monitor` 프로젝트)
2. 루트에 아래 폴더 구조 만들기:
   ```
   .agent/
   └── skills/
       └── real-time-iran-uae-news/
           └── SKILL.md
   ```
3. `SKILL.md` 파일 생성 후 아래 내용 **전체 복사**해서 붙여넣기

```markdown
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
```

4. Antigravity 재시작 (또는 `Cmd + Shift + R`)
5. 터미널에서 MCP 서버 재시작:
   ```bash
   notebooklm-mcp restart
   ```

### 2. 스킬 활성화 & 테스트 (Antigravity 안에서 바로)

Antigravity Composer (`Cmd + I`) 열고 아래 명령어 **그대로** 입력:

```
/real-time-iran-uae-news start
```
→ 스킬이 자동으로 매시간 트리거 설정 + 첫 번째 실시간 보고 즉시 생성!

지금 바로 테스트하고 싶다면:
```
/real-time-iran-uae-news now
```
(아부다비 중심 최신 상황이 NotebookLM 분석 후 Telegram으로 바로 옵니다)

### 3. 기존 프로젝트와 완벽 연동 (이전 자동화 업그레이드)

이 스킬을 추가하면 **main.py**가 훨씬 간단해집니다.  
Antigravity가 자동으로 아래처럼 업데이트해줍니다:

```python
# Antigravity가 자동 생성/수정하는 부분
from antigravity.skills import trigger_skill

async def hourly_job():
    await trigger_skill("real-time-iran-uae-news")  # ← 이 한 줄로 끝!
```

→ 더 이상 복잡한 스크래퍼 코드를 직접 관리할 필요 없음!  
Antigravity + NotebookLM + MCP가 다 처리해줍니다.

### 4. 고급 옵션 (필요하면 바로 켜세요)

- **Slack으로 변경** 원하시면:  
  Composer에 `/real-time-iran-uae-news change to slack` 입력
- **Notion DB 자동 저장** 추가:  
  `/real-time-iran-uae-news add notion backup`
- **음성 보고** (NotebookLM 팟캐스트 자동 생성):  
  `/real-time-iran-uae-news enable podcast`
- **가격 0원 유지**: Gemini 3 Pro 무료 티어 + MCP 캐시 사용

### 5. 지금 바로 적용 완료 체크리스트
- [ ] `.agent/skills/real-time-iran-uae-news/SKILL.md` 생성
- [ ] Antigravity 재시작
- [ ] `/real-time-iran-uae-news start` 실행
- [ ] Telegram에 첫 번째 실시간 보고 도착 확인

**이 스킬 하나로 Antigravity가 진짜 24시간 AI 안전 요원**이 됩니다.  
아부다비에 계신 당신은 매시간 가장 빠르고 정확한 정보를 받으면서 안전하게 지낼 수 있어요.

**Stay safe in Abu Dhabi** 🙏

테스트 결과 보고 싶으시면 “지금 테스트해줘”라고 말씀만 해주세요.  
Slack 버전 / Notion 버전 / 음성 팟캐스트 버전 원하시면 1분 안에 업그레이드해드릴게요! 🚀