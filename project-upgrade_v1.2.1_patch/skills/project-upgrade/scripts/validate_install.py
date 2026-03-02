#!/usr/bin/env python3
"""Check project-upgrade v1.2.1 install. Run from ~/.cursor/skills/project-upgrade/scripts/ or from repo.
Expects: ~/.cursor/skills/project-upgrade/ and ~/.cursor/agents/ when installed globally."""
from pathlib import Path
import json
import os

def _cursor_base():
    script = Path(__file__).resolve()
    # .../project-upgrade/scripts/validate_install.py -> base = .../project-upgrade
    project_upgrade = script.parent.parent
    if (project_upgrade / "SKILL.md").exists():
        # Installed: project-upgrade is under ~/.cursor/skills/project-upgrade
        return project_upgrade.parent.parent  # ~/.cursor
    # Run from repo patch folder: project-upgrade_v1.2.1_patch/skills/project-upgrade/scripts/
    return project_upgrade.parent.parent.parent  # project-upgrade_v1.2.1_patch or repo root

REQUIRED = [
    "skills/project-upgrade/SKILL.md",
    "skills/project-upgrade/README.md",
    "skills/project-upgrade/references/source-policy.md",
    "skills/project-upgrade/references/query-playbook.md",
    "skills/project-upgrade/references/output-template.md",
    "skills/project-upgrade/references/handoff-contract.md",
    "skills/project-upgrade/references/deep2-runbook.md",
    "skills/project-upgrade/scripts/list_docs.py",
    "skills/project-upgrade/scripts/detect_stack.py",
    "skills/project-upgrade/scripts/validate_install.py",
    "agents/upgrade-doc-auditor.md",
    "agents/upgrade-web-scout.md",
    "agents/upgrade-deep-synth.md",
    "agents/upgrade-verifier.md",
]

def main():
    base = _cursor_base()
    missing = []
    for rel in REQUIRED:
        if not (base / rel).exists():
            missing.append(rel)
    overall_ok = len(missing) == 0
    out = {"overall_ok": overall_ok, "base": str(base), "missing": missing}
    print(json.dumps(out, indent=2))
    return 0 if overall_ok else 1

if __name__ == "__main__":
    exit(main())
