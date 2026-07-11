#!/usr/bin/env bash
# Fake harness for smoke tests — no LLM, no API.
set -euo pipefail

PROMPT="${*:-}"
echo "[smoke-worker] cwd=$(pwd)"
echo "[smoke-worker] prompt=${PROMPT:0:200}"

# Prove we can write in the worktree
echo "ok $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .tartarus-smoke-ok
echo "[smoke-worker] wrote .tartarus-smoke-ok"
echo "[smoke-worker] done"
exit 0
