# NotebookLM MCP Runbook

> 장애 시·인증 갱신 시 NotebookLM MCP를 사용하는 단계. **MCP 미사용 환경에서는 이 Runbook 단계를 스킵**한다.

---

## 전제 조건 (미충족 시 이 Runbook 단계 스킵)

- **notebooklm-mcp-cli** 설치됨 (`pip install notebooklm-mcp-cli` 또는 `uv tool install notebooklm-mcp-cli`).
- **`nlm login`** 완료(Google 로그인·쿠키 저장). 만료 시 아래 "인증 갱신" 단계 수행.
- Cursor(또는 Antigravity)에서 MCP 서버가 등록되어 있음. 미등록 시 [docs/CURSOR_MCP_SETUP.md](../CURSOR_MCP_SETUP.md) 참고.

위 조건이 하나라도 충족되지 않으면 **이 Runbook의 MCP 도구 호출 단계는 수행하지 않고**, 기존 Python API·수동 절차로 대체한다.

---

## 1. 최근 보고서 요약 (장애/점검 시)

**목적:** 최근 수집 기사·보고서를 NotebookLM MCP로 요약해 상황을 빠르게 파악한다.

1. Cursor(또는 Antigravity)를 연다.
2. MCP 도구 중 **노트북 쿼리** 도구를 사용한다.  
   - 예: Cursor 채팅에서 "NotebookLM 노트북 [Iran-UAE Monitor] 기준으로 최근 보고서 요약해줘" 또는 해당 노트북 ID로 `notebook_query` 호출.
3. 응답으로 요약·핵심 포인트를 확인한다.  
   - MCP 서버가 응답하지 않으면: 터미널에서 `nlm login` 재실행 후 Cursor 재시작, 또는 [reports/](../../reports/) 디렉터리의 최신 JSON/JSONL을 직접 확인한다.

---

## 2. 인증 갱신 (nlm login 만료 시)

**목적:** NotebookLM 세션(쿠키)이 만료된 경우 재로그인한다.

1. 터미널에서 `nlm login` 실행.
2. 브라우저에서 Google 계정 로그인 완료.
3. Cursor를 사용 중이었다면 **Cursor를 완전히 종료 후 재시작**하여 MCP 서버가 새 인증을 읽도록 한다.
4. Runbook 1단계(최근 보고서 요약)를 한 번 수행해 MCP 호출이 정상 동작하는지 확인한다.

---

## 3. 소스 목록 확인

**목적:** 현재 NotebookLM 노트북에 등록된 소스 목록을 확인한다.

1. Cursor(또는 Antigravity)에서 MCP 도구 **노트북 소스 목록** 또는 `notebook_get` / 소스 관련 도구를 호출한다.
2. 노트북 ID는 프로젝트 루트 `.notebooklm_id` 파일 또는 Cursor에서 사용 중인 노트북 이름으로 지정한다.
3. 목록 확인 후, 소스가 과다하면 정리 정책은 [UPGRADE_GRAND_PLAN.md](../../UPGRADE_GRAND_PLAN.md) Phase 1 R4를 참고한다.

---

## 4. 온디맨드 팟캐스트 생성 (스크립트 사용)

**목적:** 이번 run 기준으로 NotebookLM Studio 팟캐스트를 로컬에서 생성한다.

1. 사전 조건: `nlm login` 완료, `.notebooklm_id`에 유효한 노트북 ID가 있음(또는 `--notebook-id`로 지정).
2. 터미널에서 실행:
   ```bash
   python scripts/notebooklm_on_demand.py --action podcast [--notebook-id <ID>] [--dry-run]
   ```
3. `--dry-run`이면 실제 NotebookLM 호출 없이 명령만 검증한다.
4. 실패 시: stderr 메시지 확인. "nlm login" 만료 또는 notebooklm-mcp-cli 미설치 안내가 있으면 해당 조치 후 재실행한다.  
   - 상세 사용법: [README.md](../../README.md) 내 "온디맨드 스크립트" 섹션 참고.

---

## 롤백·대체

- MCP를 사용할 수 없을 때: 파이프라인은 기존 **Python API**(`notebooklm_tools`, `src/iran_monitor/`)만 사용한다. CI(GHA)는 항상 Python API만 사용하며, MCP는 로컬/에이전트 전용이다.
- 인증 갱신 후에도 MCP 호출이 실패하면: [docs/ARCHITECTURE.md](../ARCHITECTURE.md) 및 [docs/plans/ANTIGRAVITY_NOTEBOOKLM_INTEGRATION_GUIDE.md](../plans/ANTIGRAVITY_NOTEBOOKLM_INTEGRATION_GUIDE.md)를 참고해 설정을 재확인한다.
### 5. 대시보드 1클릭 요약 재생성 (옵션 C)

- 실행 경로: 대시보드 `Runs` 페이지
- 동작: run 기준 "요약 재생성" 버튼 클릭
- 요청: `POST /api/notebooklm/refresh`
- 파라미터: `run_id`, `source_id`, `action=report|podcast|slides`, `format=json|markdown`
- 응답:
  - 200: `{ ok, run_id, notebook_url, source_id, status: queued, outbox_count }`
  - 400/500: `{ ok:false, error_code, message }`

### 4. Runbook 실패 대응

기존 항목 외 아래를 병행합니다.

- MCP 설정이 없거나 `notebooklm` CLI가 동작하지 않는 경우: `docs/CURSOR_MCP_SETUP.md`의 설치/로그인 절차 후 재시도
- API/대시보드에서 실패: `error_code`로 원인 분기(예: `RUN_NOT_FOUND`, `SCRIPT_ERROR`)
