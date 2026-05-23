#!/bin/bash
# Verwijder losse JPG/PNG als dezelfde foto al als .webp op schijf staat (modellen-opslag).
# Gebruik op Combell SSH (pas UPLOADS aan indien nodig):
#   bash scripts/cleanup-model-jpg-orphans.sh
set -euo pipefail
UPLOADS="${1:-$HOME/www/cm-media/uploads}"
if [ ! -d "$UPLOADS" ]; then
  UPLOADS="/data/sites/web/class-modelsbe/www/cm-media/uploads"
fi
if [ ! -d "$UPLOADS" ]; then
  echo "Map niet gevonden: $UPLOADS"
  exit 1
fi
echo "Zoeken in: $UPLOADS"
removed=0
while IFS= read -r -d '' jpg; do
  base="${jpg%.*}"
  webp="${base}.webp"
  if [ -f "$webp" ]; then
    rm -f "$jpg"
    removed=$((removed + 1))
  fi
done < <(find "$UPLOADS" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0)
echo "Verwijderd: $removed losse JPG/PNG (waar WebP al bestond)."
