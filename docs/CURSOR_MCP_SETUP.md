# Cursor IDE — NotebookLM MCP 설정 가이드

> Cursor에서 NotebookLM MCP 서버를 등록하면, 채팅에서 NotebookLM 노트북 조회·쿼리·소스 추가 등을 할 수 있다. **CI(GHA)에서는 MCP를 사용하지 않으며, Python API만 사용한다.** MCP는 로컬/에이전트 전용이다.

---

## 전제 조건

- **notebooklm-mcp-cli** 설치: `pip install notebooklm-mcp-cli` 또는 `uv tool install notebooklm-mcp-cli`
- **nlm login** 1회 실행 완료(Google 로그인·쿠키 저장)
- Cursor IDE v0.40 이상

---

## 방법 1: Cursor 설정 UI에서 추가

1. Cursor에서 **Settings** 열기: `Cmd + ,`(macOS) / `Ctrl + ,`(Windows).
2. **Tools & MCP** (또는 Features → MCP)로 이동.
3. **Add new MCP server** 클릭.
4. 다음 값 입력:
   - **Name:** `notebooklm` (또는 원하는 이름)
   - **Type:** `command`
   - **Command:** `nlm` (또는 `notebooklm-mcp` — 설치 경로에 따라 전체 경로 가능)
   - **Args:** (필요 시) MCP 서버 모드 인자. notebooklm-mcp-cli 문서 참고.
   - **Env:** (선택) 프로필 등이 있으면 `NLM_PROFILE=default` 등.
5. **Install** 클릭 후 **Cursor를 완전히 종료했다가 다시 실행**한다.

---

## 방법 2: 프로젝트 루트에 `.cursor/mcp.json` 사용

프로젝트별로 설정을 공유하려면 루트에 `.cursor/mcp.json`을 둘 수 있다.

1. 프로젝트 루트에 `.cursor` 디렉터리가 없으면 생성.
2. `.cursor/mcp.json` 파일을 만들고 아래와 같이 작성한다. (실제 경로는 환경에 맞게 수정)

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "nlm",
      "args": ["mcp"],
      "env": {}
    }
  }
}
```

- `nlm`이 PATH에 없으면 절대 경로 사용 예: `"command": "C:\\Users\\...\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\nlm.exe"` (Windows) 또는 `"/home/user/.local/bin/nlm"` (Linux/macOS).
- notebooklm-mcp-cli 버전에 따라 `args`가 다를 수 있음. `nlm --help` 또는 패키지 문서 확인.

3. Cursor를 재시작한다.

---

## 확인

- Cursor 채팅(`Cmd + L` / `Ctrl + L`)을 열고, "What MCP tools do you have?" 또는 "NotebookLM 노트북 목록 보여줘" 등으로 도구가 보이는지 확인한다.
- Settings → Tools & MCP에서 `notebooklm`이 "Installed MCP Servers"에 표시되는지 확인한다.

---

## 문제 해결

- **MCP 서버가 안 보일 때:** Cursor를 **완전 종료 후 재시작**해야 MCP가 로드된다.
- **"Command not found":** 터미널에서 `which nlm`(macOS/Linux) 또는 `where nlm`(Windows)으로 경로 확인 후, `mcp.json`의 `command`에 전체 경로를 넣는다.
- **인증 오류:** 터미널에서 `nlm login`을 다시 실행한 뒤 Cursor를 재시작한다.

---

## 참고

- [How to Configure MCP Servers in Cursor IDE (2026 Guide)](https://mcpplaygroundonline.com/blog/cursor-mcp-setup-guide)
- [MCP Servers in Cursor: Setup, Configuration, and Security](https://www.truefoundry.com/blog/mcp-servers-in-cursor-setup-configuration-and-security-guide)
- 프로젝트 Runbook: [docs/runbooks/NOTEBOOKLM_MCP_RUNBOOK.md](runbooks/NOTEBOOKLM_MCP_RUNBOOK.md)
## on_demand 스크립트 가이드

- 실행 모드: `python scripts/notebooklm_on_demand.py`
- `--action`: report|podcast|slides
- `--source-id`: 특정 NotebookLM source_id로 범위 제한(선택)
- `--use-mcp`: MCP 중심 실행
- `--dry-run`: 실제 호출 없이 실행계획/커맨드만 출력

예:

```bash
python scripts/notebooklm_on_demand.py --action report --source-id <source-id> --use-mcp --dry-run
python scripts/notebooklm_on_demand.py --action podcast --source-id <source-id>
```

MCP 환경이 없으면 “`notebooklm-mcp-cli not found` / `notebooklm-mcp-cli login`” 메시지와 함께 종료되며,
Python API 경로는 기존 운영 파이프라인에서 정상 동작합니다.
