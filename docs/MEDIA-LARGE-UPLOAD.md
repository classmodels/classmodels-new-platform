# Grote ZIP-upload (mediatheek)

## Methode: altijd één bestand

De ZIP (tot 6 GB) gaat in **één HTTP POST** naar de API (`/__cm_api` of `https://api.class-models.be`).

**Geen upload in stukjes** — chunked upload gaf op Combell te vaak fouten (“deel 1/306 incompleet”).

## Vereisten Combell

1. **Web build:** `NEXT_PUBLIC_API_URL=https://api.class-models.be`
2. **Optioneel:** `NEXT_PUBLIC_LARGE_UPLOAD_API_URL=https://api.class-models.be`
3. **Node:** `COMBELL_UPLOAD_TIMEOUT_MS=21600000`, `API_UPLOAD_TIMEOUT_MS=21600000`
4. **Schijf:** `MEDIA_ROOT=/app/shared/uploads` (voldoende vrije ruimte)

## Gebruik

1. Map kiezen (bv. film modeshow)
2. ZIP kiezen → ZIP uploaden
3. Tabblad **open laten**, **niet verversen** tot “Klaar”
4. 2–5 GB: vaak **30–90 minuten**

## Downloadbaar blijven (mapinstellingen)

- **Dagen na model-download:** leeg = ZIP blijft staan; bv. **365** = pas een jaar na eerste download door model wissen.
