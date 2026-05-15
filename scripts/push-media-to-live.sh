#!/usr/bin/env bash
# Upload lokale apps/api/uploads naar live API (zelfde bestandsnamen als in DB).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPLOADS="${UPLOADS_DIR:-$ROOT/apps/api/uploads}"
API_URL="${API_URL:-https://api.class-models.be}"

if [[ $# -lt 2 ]]; then
  echo "Gebruik: $0 <admin-email> <wachtwoord>"
  echo "Optioneel: API_URL=https://api.class-models.be UPLOADS_DIR=.../uploads"
  exit 1
fi
EMAIL="$1"
PASS="$2"

if [[ ! -d "$UPLOADS" ]]; then
  echo "Map niet gevonden: $UPLOADS"
  exit 1
fi

echo "Inloggen op $API_URL …"
LOGIN_JSON=$(curl -sS -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

TOKEN=$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.accessToken||j.access_token||'');" "$LOGIN_JSON")
if [[ -z "$TOKEN" ]]; then
  echo "Inloggen mislukt. Controleer e-mail/wachtwoord."
  echo "$LOGIN_JSON"
  exit 1
fi

shopt -s nullglob
files=("$UPLOADS"/*)
total=${#files[@]}
if [[ "$total" -eq 0 ]]; then
  echo "Geen bestanden in $UPLOADS"
  exit 1
fi

echo "Uploaden van $total bestanden (kan 30–60+ min duren) …"
n=0
ok=0
fail=0
for f in "${files[@]}"; do
  [[ -f "$f" ]] || continue
  name=$(basename "$f")
  n=$((n + 1))
  if curl -sS -f -X POST "$API_URL/media/sync-disk-file" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$f" \
    -F "filename=$name" >/dev/null 2>&1; then
    ok=$((ok + 1))
  else
    fail=$((fail + 1))
  fi
  if (( n % 50 == 0 )); then
    echo "  … $n / $total (ok=$ok mislukt=$fail)"
  fi
done

echo "Klaar: $ok gelukt, $fail mislukt van $total."
echo "Vernieuw de mediatheek op https://www.class-models.be"
