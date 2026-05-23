#!/bin/bash
# Verwijder losse JPG/PNG als dezelfde foto al als .webp op schijf staat.
set -euo pipefail
SITE="${CM_SITE_ROOT:-/data/sites/web/class-modelsbe}"

DIRS=(
  "$SITE/data"
  "$SITE/data/uploads"
  "$SITE/www/cm-media/uploads"
  "/app/shared/uploads"
)

removed=0
for UPLOADS in "${DIRS[@]}"; do
  [ -d "$UPLOADS" ] || continue
  echo "Map: $UPLOADS"
  while IFS= read -r -d '' jpg; do
    webp="${jpg%.*}.webp"
    if [ -f "$webp" ]; then
      rm -f "$jpg"
      removed=$((removed + 1))
    fi
  done < <(find "$UPLOADS" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0)
done
echo "Verwijderd: $removed losse JPG/PNG (waar WebP al bestond)."
