#!/usr/bin/env bash
set -euo pipefail

# Vercel Ignored Build Step contract:
# - exit 0: skip build
# - exit 1: continue build

HEAD_SHA="${VERCEL_GIT_COMMIT_SHA:-}"
PREV_SHA="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [[ -z "${HEAD_SHA}" ]]; then
  HEAD_SHA="$(git rev-parse HEAD)"
fi

if [[ -z "${PREV_SHA}" || "${PREV_SHA}" =~ ^0+$ ]]; then
  if git rev-parse --verify -q "${HEAD_SHA}^" >/dev/null; then
    PREV_SHA="$(git rev-parse "${HEAD_SHA}^")"
  else
    echo "[vercel-ignore] Previous SHA is unavailable; building."
    exit 1
  fi
fi

if ! git cat-file -e "${PREV_SHA}^{commit}" 2>/dev/null; then
  echo "[vercel-ignore] PREV_SHA ${PREV_SHA} not found locally; building."
  exit 1
fi

if ! git cat-file -e "${HEAD_SHA}^{commit}" 2>/dev/null; then
  echo "[vercel-ignore] HEAD_SHA ${HEAD_SHA} not found locally; building."
  exit 1
fi

CHANGED_FILES="$(git diff --name-only "${PREV_SHA}" "${HEAD_SHA}" --)"

if [[ -z "${CHANGED_FILES}" ]]; then
  echo "[vercel-ignore] No file changes in ${PREV_SHA}..${HEAD_SHA}; skip build."
  exit 0
fi

if printf '%s\n' "${CHANGED_FILES}" | grep -Eq '^dashboard/'; then
  echo "[vercel-ignore] Dashboard changes detected in ${PREV_SHA}..${HEAD_SHA}; build."
  exit 1
fi

echo "[vercel-ignore] No dashboard/ changes in ${PREV_SHA}..${HEAD_SHA}; skip build."
exit 0
