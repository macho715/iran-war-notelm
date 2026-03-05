# project-upgrade v1.2.1 패치 적용 방법

## 판정·근거
- **판정:** 조건부 예(패치 완료본 제공)
- **근거:** SESSION_LOG_project-upgrade_skill.md 요구사항(v1.2/deep/deep2, Best3, 2-step pipeline) 기준 스킬/서브에이전트 정합성 + 날짜/출처 강제 보강.

## 생성 파일 트리 (이 패치팩)
```
project-upgrade_v1.2.1_patch/
  skills/project-upgrade/
    SKILL.md
    README.md
    references/
      source-policy.md
      query-playbook.md
      output-template.md
      handoff-contract.md
      deep2-runbook.md
    scripts/
      list_docs.py
      detect_stack.py
      validate_install.py
  agents/
    upgrade-doc-auditor.md
    upgrade-web-scout.md
    upgrade-deep-synth.md
    upgrade-verifier.md
```

## 적용 절차 (전역 ~/.cursor/)

### Step 1) 전역 폴더에 배치(덮어쓰기)
**Windows (PowerShell)** — 패치 폴더(`project-upgrade_v1.2.1_patch`)에서 실행:
```powershell
$cursor = "$env:USERPROFILE\.cursor"
$patch = "."
New-Item -ItemType Directory -Force -Path "$cursor\skills\project-upgrade"
New-Item -ItemType Directory -Force -Path "$cursor\agents"
Copy-Item -Path "$patch\skills\project-upgrade\*" -Destination "$cursor\skills\project-upgrade" -Recurse -Force
Copy-Item -Path "$patch\agents\*.md" -Destination "$cursor\agents" -Force
```

**Linux/macOS** — 패치 폴더에서 실행:
```bash
CURSOR=~/.cursor
mkdir -p $CURSOR/skills/project-upgrade $CURSOR/agents
cp -R skills/project-upgrade/* $CURSOR/skills/project-upgrade/
cp agents/*.md $CURSOR/agents/
```

**zip 사용 시** (zip 내부가 `skills/`, `agents/` 한 단계):
```bash
unzip -o project-upgrade_v1.2.1_patch.zip -d ~/.cursor
```
이미 다른 스킬이 있으면 `skills/project-upgrade`만 덮어쓰기 위해 위 수동 복사 권장.

### Step 2) 설치 검증(필수)
```bash
python3 ~/.cursor/skills/project-upgrade/scripts/validate_install.py
```
- `overall_ok: true` 이면 **PASS**
- `missing`에 경로가 나오면 해당 파일 누락 → Step 1 재확인

### Step 3) Cursor 재시작 후 노출 확인
- Cursor 재시작(또는 Reload Window: `Ctrl+Shift+P` → "Developer: Reload Window")
- Agent 채팅에서 `/` 입력 → **/project-upgrade** 노출 확인
- **안 보이면:** Cursor nightly 채널 여부, 경로(`.cursor` vs `Cursor`), `name: project-upgrade`와 폴더명 일치 여부 확인

## 검증 체크리스트 (PASS 기준)
- [ ] `~/.cursor/skills/project-upgrade/SKILL.md` 존재, frontmatter `name`이 폴더명과 동일
- [ ] `~/.cursor/agents/*.md` YAML frontmatter 유지(IDE가 frontmatter 제거 시 기능 깨짐)
- [ ] (nightly) Skills/Subagents 노출
- [ ] `validate_install.py` 결과 `overall_ok: true`
- [ ] `/project-upgrade` 실행 시 Best3 Deep/Deep2 경로가 문서대로 동작

## ZERO (중단 조건)
- **ZERO:** Cursor가 stable이고 nightly 전환이 불가한데 Skills/Subagents를 강제해야 하는 경우 → 설치해도 "안 보임" 가능. 대안: stable에서는 Rules/Commands 기반 축소 운영(별도 패치).

## 설치 옵션
| 옵션 | 위치 | 위험 |
|------|------|------|
| A(권장) | 전역 ~/.cursor/ | SSH/원격에서 전역 로딩 이슈 가능 |
| B | 프로젝트 \<repo\>/.cursor/ | 프로젝트마다 설치 필요 |
| C | 혼합 | 중복 로딩/혼선 → 1개 경로만 권장 |
