# Grote ZIP-upload (mediatheek)

## Hoe het werkt

| Bestandsgrootte | Methode |
|-----------------|--------|
| &lt; 80 MB | Eén HTTP POST naar `api.class-models.be/media/upload-zip` |
| ≥ 80 MB | Upload in **delen van 16 MB** (±300 requests voor 5 GB), op de server **één ZIP-bestand** in de gekozen map |

De browser uploadt naar **`NEXT_PUBLIC_API_URL`** (standaard `https://api.class-models.be`), niet via de www-proxy. Dat voorkomt timeouts halverwege.

## Combell-checklist (eenmalig)

1. **Web build:** `NEXT_PUBLIC_API_URL=https://api.class-models.be`
2. **Node env:** `COMBELL_UPLOAD_TIMEOUT_MS=21600000` (6 uur), `API_UPLOAD_TIMEOUT_MS=21600000`
3. **MEDIA_ROOT:** `/app/shared/uploads` (persistent volume)
4. **Optioneel:** `MEDIA_ZIP_UPLOAD_MAX_BYTES=6442450944` (6 GB)

## Gebruiker

- Map kiezen → ZIP kiezen → **ZIP uploaden**
- **Niet verversen** tot “Klaar” verschijnt
- Bij 4+ GB: 30–90 minuten is normaal

## Als het nog mislukt

Vraag Combell support: **maximale request body / upload timeout** op het **api.***-domein (niet alleen www). Sommige hosts limiteren nog vóór Node.
