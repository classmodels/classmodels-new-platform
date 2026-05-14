#!/usr/bin/env bash
# Combell Node: zet per instance SERVE_APP=web of SERVE_APP=api (zelfde repo, twee instances).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
case "${SERVE_APP:-web}" in
  api)
    export API_PORT="${API_PORT:-${PORT:-4000}}"
    export API_HOST="${API_HOST:-0.0.0.0}"
    exec npm run start -w @cm/api
    ;;
  *)
    exec npm run start -w @cm/web
    ;;
esac
