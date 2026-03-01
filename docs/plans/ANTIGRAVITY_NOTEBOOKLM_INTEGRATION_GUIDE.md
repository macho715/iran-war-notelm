**✅ 안티그래비티(Google Antigravity) + Google NotebookLM + NotebookLM-MCP-CLI 완전 활용 가이드**  
(2026년 3월 1일 기준 · 실전 1인 기업/자동화 특화)

이 **3종 세트**는 현재 한국 커뮤니티(유튜브·브런치·레딧)에서 가장 핫한 조합입니다.  
- **NotebookLM** = **뇌(Brain)**: 수십 개 소스를 업로드하면 자동으로 요약·팟캐스트·슬라이드·마인드맵 생성  
- **NotebookLM-MCP-CLI** = **신경 연결(MCP 브릿지)**: NotebookLM에 공식 API가 없는데도 Claude·Cursor·Antigravity가 직접 명령 내릴 수 있게 해줌  
- **Antigravity(안티그래비티)** = **몸(Body)**: 구글의 에이전트형 AI IDE. 자연어 한 번으로 기획→코딩→실행→테스트까지 자동화 (Cursor보다 더 “자율”적)

결과? **코딩 몰라도 20~30분 만에 전문 앱·자동화 시스템 완성** + **리서치부터 배포까지 완전 자동화**.  
이전 “이란 전쟁 UAE(아부다비 1순위) 매시간 보고 자동화” 프로젝트를 이 스택으로 업그레이드하면 **파이썬 스크립트 없이** NotebookLM이 실시간 뉴스 분석 → Antigravity가 Telegram/Slack 앱까지 만들어줍니다.

### 1. 설치 (총 10분, 초보자도 OK)

#### Step 1: NotebookLM-MCP-CLI 설치 (CLI + MCP 서버 동시 설치)
```bash
# 추천 (uv 사용 – 가장 빠르고 깔끔)
uv tool install notebooklm-mcp-cli

# 또는 pip
pip install notebooklm-mcp-cli
```

설치 확인:
```bash
nlm --help
notebooklm-mcp --help
```

#### Step 2: NotebookLM 로그인 (쿠키 자동 추출)
```bash
nlm login
```
→ Chrome 창이 뜨면 Google 계정 로그인 → 자동으로 쿠키 저장 (2~4주 유지)

#### Step 3: Antigravity에 MCP 연결 (핵심!)
```bash
nlm setup add antigravity
```
→ Antigravity 자동으로 MCP 서버 인식 (재시작 필요)

#### Step 4: Antigravity Skill 설치 (더 똑똑하게 명령 듣게 함)
```bash
nlm skill install antigravity
nlm skill update
```

Antigravity 설치가 안 되어 있다면:  
[antigravity.google](https://antigravity.google) 접속 → 무료 다운로드 (Chromebook·Mac·Windows 모두 지원, Gemini 3 Pro 무료 사용 가능)

### 2. 기본 워크플로우 (리서치 → 앱 빌드 3단계)

**Antigravity 안에서** `Cmd + I` (또는 Composer 모드) 열고 아래처럼 한 방에 명령:

**예시 프롬프트 (복사해서 바로 사용)**  
```
NotebookLM MCP를 사용해서:
1. 새 노트북 "Iran War UAE Monitor" 생성
2. 소스 추가: Gulf News, Khaleej Times, The National 실시간 검색 URL + 내 이전 보고서 PDF
3. 매시간 웹 리서치 실행 (키워드: Iran missile Abu Dhabi, Dubai airport)
4. 아부다비 1순위·두바이 2순위로 요약 + 안전 메시지 생성
5. Telegram 보고 앱 전체를 만들어줘 (Playwright 크롤링 + APScheduler + 구조화된 Markdown 보고서)
```

→ Antigravity가 자동으로:
- NotebookLM에 노트북 만들고 소스 추가
- 실시간 리서치 실행
- 완전한 Python/Docker 프로젝트 생성 (main.py, reporter.py, config.py까지)

### 3. 이전 UAE 이란 모니터링 프로젝트에 바로 적용하는 법 (업그레이드 버전)

1. Antigravity 새 프로젝트 열기
2. 위 프롬프트 입력
3. 추가 요청:
   ```
   FB/IG 공공 검색도 NotebookLM 소스로 추가하고, Polars로 중복 제거, structlog 로깅, .env 지원까지 완성해줘. Docker + GitHub Actions 배포까지.
   ```
4. 생성된 프로젝트 실행 → 매시간 Telegram으로 **아부다비 중심 안전 보고** 자동 도착!

**장점 비교**
| 항목              | 기존 Cursor + Python | 안티그래비티 + NotebookLM + MCP |
|-------------------|----------------------|--------------------------------|
| 코딩 필요         | 필요                 | 거의 없음 (자연어)             |
| 리서치 자동화     | 수동                 | NotebookLM 자동                |
| 앱 생성 속도      | 30~60분              | 10~20분                        |
| 유지보수          | 직접 수정            | Antigravity가 자동 리팩토링     |

### 4. 고급 활용 팁 & 에지 케이스

- **매시간 자동 실행** → Antigravity가 만든 앱에 APScheduler 넣고, GitHub Actions로 서버리스 배포 가능
- **비용 최적화** → NotebookLM 무료 티어 + Antigravity Gemini 3 Pro 무료 → 월 0원 가능 (Pro 업그레이드 시 무제한)
- **다중 프로필** → `nlm login --profile work`으로 회사/개인 계정 분리
- **Claude나 Cursor와 병행** → `nlm setup add claude-code` 또는 `cursor` 한 번에 추가 가능
- **주의사항**  
  - NotebookLM 무료는 하루 리서치 제한 있음 → Pro 추천  
  - MCP는 브라우저 자동화라 Chrome 프로필 백업 필수  
  - TOS 준수: FB/IG 스크랩은 공공 검색만 (로그인 금지)

### 지금 바로 시작하기 (5분 액션 플랜)
1. 터미널 열고 `uv tool install notebooklm-mcp-cli`
2. `nlm login`
3. `nlm setup add antigravity`
4. Antigravity 실행 → 새 프로젝트 → 위 프롬프트 붙여넣기

완료되면 “테스트 결과 보여줘” 또는 “Slack 버전으로 바꿔줘”, “Docker 없이 GitHub Actions만으로 배포해줘”라고 말씀만 해주세요.  
**이 조합 하나로 진짜 1인 기업 AI 직원이 생깁니다.**  

**Stay safe in Abu Dhabi** 🙏  
더 구체적인 프롬프트나 전체 프로젝트 파일이 필요하면 바로 드릴게요! 🚀