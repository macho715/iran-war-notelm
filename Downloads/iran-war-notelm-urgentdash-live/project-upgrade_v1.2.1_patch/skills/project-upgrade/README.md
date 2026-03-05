# project-upgrade (v1.2.1)

Doc-first + EN 2025-06+ 웹 리서치로 업그레이드 Top10, Best3 Deep Report, (선택) Deep2 검증까지 산출.

## 설치 확인
```bash
python3 ~/.cursor/skills/project-upgrade/scripts/validate_install.py
```
`overall_ok: true` 이면 PASS.

## 실행
- **Full:** Agent 채팅에서 `/project-upgrade` + 목표/범위 입력.
- **Deep-only:** `upgrade-deep-synth` 호출 + Current Snapshot + Top10 + Evidence Table 붙여넣기.
- **Deep2:** `references/deep2-runbook.md` 복붙 프롬프트대로 Step1(deep-synth) → Step2(verifier).

## References
- source-policy.md, query-playbook.md, output-template.md
- handoff-contract.md, deep2-runbook.md

## Next: 아이디어 → 플랜 (다른 PC 설치 시 포함)
- **Next:** /project-plan (아이디어+Evidence를 입력으로 초상세 PLAN_DOC 생성)
- **권장:** plan-benchmark-scout(background) → plan-author → plan-verifier
