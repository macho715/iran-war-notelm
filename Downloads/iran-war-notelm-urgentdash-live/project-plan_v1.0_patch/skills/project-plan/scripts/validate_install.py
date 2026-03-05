#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

REQUIRED = [
    "skills/project-plan/SKILL.md",
    "skills/project-plan/README.md",
    "skills/project-plan/references/source-policy.md",
    "skills/project-plan/references/benchmark-query-playbook.md",
    "skills/project-plan/references/plan-template.md",
    "skills/project-plan/references/quality-gates.md",
    "skills/project-plan/references/plan-runbook.md",
    "agents/plan-benchmark-scout.md",
    "agents/plan-author.md",
    "agents/plan-verifier.md",
]

def main() -> None:
    # .../skills/project-plan/scripts/validate_install.py -> parents[3] = ~/.cursor
    root = Path(__file__).resolve().parents[3]
    missing = []
    for rel in REQUIRED:
        p = root / rel
        if not p.exists():
            missing.append(rel)

    # validate name match (folder == frontmatter name)
    name_ok = True
    skill = root / "skills" / "project-plan" / "SKILL.md"
    if skill.exists():
        txt = skill.read_text(encoding="utf-8", errors="ignore")
        # naive frontmatter parse
        m = None
        for line in txt.splitlines()[:40]:
            if line.strip().startswith("name:"):
                m = line.split(":", 1)[1].strip()
                break
        if m != "project-plan":
            name_ok = False

    out = {
        "root": str(root),
        "overall_ok": (len(missing) == 0 and name_ok),
        "missing": missing,
        "name_ok": name_ok,
    }
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    main()
