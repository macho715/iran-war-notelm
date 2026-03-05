#!/usr/bin/env python3
"""List repo docs for Doc-first sweep. Usage: python list_docs.py [repo_root]."""
import sys
from pathlib import Path

def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    patterns = ["README*", "**/docs/*.md", "**/*.md", "**/ADR*", "**/SECURITY*", "**/CONTRIBUTING*", "**/ARCHITECTURE*"]
    seen = set()
    for p in patterns:
        for f in root.glob(p):
            if f.is_file() and f.suffix.lower() in (".md", ".mdx") and f not in seen:
                seen.add(f)
                print(str(f.relative_to(root)))
    return 0

if __name__ == "__main__":
    sys.exit(main())
