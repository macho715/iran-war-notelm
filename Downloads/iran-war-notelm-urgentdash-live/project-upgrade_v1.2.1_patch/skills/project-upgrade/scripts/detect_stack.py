#!/usr/bin/env python3
"""Detect build/test/CI stack from repo. Usage: python detect_stack.py [repo_root]."""
import sys
from pathlib import Path

def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    hints = []
    if (root / "package.json").exists():
        hints.append("Node/JS")
    if (root / "requirements.txt").exists() or (root / "pyproject.toml").exists():
        hints.append("Python")
    if (root / "Dockerfile").exists():
        hints.append("Docker")
    gh = root / ".github" / "workflows"
    if gh.exists() and list(gh.glob("*.yml")):
        hints.append("GitHub Actions")
    for h in hints:
        print(h)
    return 0

if __name__ == "__main__":
    sys.exit(main())
