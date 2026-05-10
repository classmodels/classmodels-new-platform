#!/usr/bin/env bash
# Maakt poorten 3000 (Next) en 4000 (API) vrij — lost vaak EADDRINUSE + vage 500 op localhost op.
set -e
for p in 3000 4000; do
  pids=$(lsof -nP -iTCP:"$p" -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Stop processen op poort $p: $pids"
    kill -9 $pids 2>/dev/null || true
  else
    echo "Poort $p is vrij."
  fi
done
echo "Klaar. Start daarna: npm run dev  (of npm run dev:web)"
