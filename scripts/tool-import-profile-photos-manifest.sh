#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi
cd "$ROOT/apps/api"
export TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS"}'
exec npx ts-node scripts/import-profile-photos-manifest.ts "$@"
