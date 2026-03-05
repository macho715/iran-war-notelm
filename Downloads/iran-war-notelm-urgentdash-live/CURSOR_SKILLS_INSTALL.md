# Cursor 스킬·서브에이전트 — 다른 PC에서 설치

이 레포에 포함된 **project-upgrade**(아이디어)와 **project-plan**(플랜) 패치를 다른 컴퓨터에서도 동일하게 쓰려면, 해당 PC에서 이 레포를 clone한 뒤 아래만 진행하면 됩니다.

## 포함된 패치

| 패치 | 용도 | 경로 |
|------|------|------|
| **project-upgrade v1.2.1** | 업그레이드 Top10, Best3 Deep, Deep2 검증 | `project-upgrade_v1.2.1_patch/` |
| **project-plan v1.0** | 아이디어 → A~K+ㅋ PLAN_DOC, 벤치마크, 검증 | `project-plan_v1.0_patch/` |

## 다른 PC에서 설치 절차 (전역 ~/.cursor)

### 1) 레포 clone (해당 PC에서)
```bash
git clone <이 레포 URL>
cd iran-war-notelm-main
```

### 2) project-upgrade 설치
**Windows (PowerShell):**
```powershell
$cursor = "$env:USERPROFILE\.cursor"
$patch = "project-upgrade_v1.2.1_patch"
New-Item -ItemType Directory -Force -Path "$cursor\skills\project-upgrade" | Out-Null
New-Item -ItemType Directory -Force -Path "$cursor\agents" | Out-Null
Copy-Item -Path "$patch\skills\project-upgrade\*" -Destination "$cursor\skills\project-upgrade" -Recurse -Force
Copy-Item -Path "$patch\agents\*.md" -Destination "$cursor\agents" -Force
python "$cursor\skills\project-upgrade\scripts\validate_install.py"
```

**Linux/macOS:**
```bash
CURSOR=~/.cursor
PATCH=project-upgrade_v1.2.1_patch
mkdir -p $CURSOR/skills/project-upgrade $CURSOR/agents
cp -R $PATCH/skills/project-upgrade/* $CURSOR/skills/project-upgrade/
cp $PATCH/agents/*.md $CURSOR/agents/
python3 $CURSOR/skills/project-upgrade/scripts/validate_install.py
```

### 3) project-plan 설치
**Windows (PowerShell):**
```powershell
$cursor = "$env:USERPROFILE\.cursor"
$patch = "project-plan_v1.0_patch"
New-Item -ItemType Directory -Force -Path "$cursor\skills\project-plan" | Out-Null
New-Item -ItemType Directory -Force -Path "$cursor\agents" | Out-Null
Copy-Item -Path "$patch\skills\project-plan\*" -Destination "$cursor\skills\project-plan" -Recurse -Force
Copy-Item -Path "$patch\agents\*.md" -Destination "$cursor\agents" -Force
python "$cursor\skills\project-plan\scripts\validate_install.py"
```

**Linux/macOS:**
```bash
CURSOR=~/.cursor
PATCH=project-plan_v1.0_patch
mkdir -p $CURSOR/skills/project-plan $CURSOR/agents
cp -R $PATCH/skills/project-plan/* $CURSOR/skills/project-plan/
cp $PATCH/agents/*.md $CURSOR/agents/
python3 $CURSOR/skills/project-plan/scripts/validate_install.py
```

### 4) Cursor 재시작
- Reload Window: `Ctrl+Shift+P` → "Developer: Reload Window"
- Agent 채팅에서 `/` 입력 → `/project-upgrade`, `/project-plan` 노출 확인

## 관련 문서 (레포 내)

- **업그레이드 가이드:** `docs/SESSION_LOG_project-upgrade_skill.md`
- **패치 적용 상세:** `project-upgrade_v1.2.1_patch/APPLY.md`, `project-plan_v1.0_patch/VERIFY.md`
- **산출물 예시:** `docs/UPGRADE_REPORT_*.md`, `docs/DEEP_REPORT_*.md`, `docs/VERIFIER_REPORT_*.md`, `docs/Upgrade_Deep_Verifier_Summary.docx`
