#!/bin/bash
# Waar staan mediatheek-bestanden op Combell? (SSH op class-modelsbe)
set -euo pipefail
SITE="${CM_SITE_ROOT:-/data/sites/web/class-modelsbe}"

echo "=== Class-Models media-inventaris ==="
echo "Site-root: $SITE"
echo ""

check_dir() {
  local d="$1"
  [ -d "$d" ] || return 0
  local imgs jpgs webps
  imgs=$(find "$d" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) 2>/dev/null | wc -l | tr -d ' ')
  jpgs=$(find "$d" -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) 2>/dev/null | wc -l | tr -d ' ')
  webps=$(find "$d" -type f -iname '*.webp' 2>/dev/null | wc -l | tr -d ' ')
  du -sh "$d" 2>/dev/null | awk -v d="$d" -v i="$imgs" -v j="$jpgs" -v w="$webps" '{printf "%-55s %8s  beelden:%6s  jpg:%6s  webp:%6s\n", d, $1, i, j, w}'
}

check_dir "$SITE/data"
check_dir "$SITE/data/uploads"
check_dir "$SITE/www/cm-media/uploads"
check_dir "$SITE/www/wp-content/uploads"
check_dir "/app/shared/uploads"
check_dir "/app/shared"

echo ""
echo "Voorbeeld JPG (max 3 per map):"
for d in "$SITE/data" "$SITE/data/uploads" "$SITE/www/cm-media/uploads"; do
  [ -d "$d" ] || continue
  echo "--- $d ---"
  find "$d" -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) 2>/dev/null | head -3
done

echo ""
echo "JPG opruimen (alleen waar .webp naast staat) in data/:"
echo "  find \"$SITE/data\" -type f \\( -iname '*.jpg' -o -iname '*.jpeg' \\) | while read -r jpg; do"
echo "    webp=\"\${jpg%.*}.webp\"; [ -f \"\$webp\" ] && rm -f \"\$jpg\"; done"
