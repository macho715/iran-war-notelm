#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "${1:-.}" && pwd)"
PATCH_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

copy_item () {
  local src="$1"
  local dst_root="$2"
  if [ -d "$src" ]; then
    cp -R "$src" "$dst_root/"
  else
    cp -f "$src" "$dst_root/"
  fi
}

copy_item "$PATCH_ROOT/.github" "$REPO_ROOT"
copy_item "$PATCH_ROOT/iran-war-uae-monitor" "$REPO_ROOT"
copy_item "$PATCH_ROOT/dashboard" "$REPO_ROOT"
copy_item "$PATCH_ROOT/requirements.txt" "$REPO_ROOT"
copy_item "$PATCH_ROOT/PHASE4_SETUP.md" "$REPO_ROOT"

echo "✅ Phase4+Vercel patch applied."
echo "Next: open PHASE4_SETUP.md"
