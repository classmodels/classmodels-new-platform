# Grote ZIP-upload (mediatheek)

## Methode

| Grootte | Methode |
|---------|---------|
| **≤ 48 MB** | Eén HTTP POST naar `/media/upload-zip` |
| **> 48 MB** (tot 6 GB) | **Chunked upload** — delen van ±8 MB (`/media/upload-zip/init`, `/chunk`, `/finish`) |

Combell weigert vaak **één POST van 4+ GB** (proxy body-limiet) → dan krijg je “Internal server error”. Chunked upload omzeilt dat.

## Build / env (Combell)

1. **Web build:** `NEXT_PUBLIC_API_URL=https://api.class-models.be`
2. **Optioneel (aanbevolen voor chunked):** `NEXT_PUBLIC_LARGE_UPLOAD_API_URL=https://api.class-models.be`
3. **Node:** `COMBELL_UPLOAD_TIMEOUT_MS=21600000`, `API_UPLOAD_TIMEOUT_MS=21600000`
4. **Schijf:** `MEDIA_ROOT=/app/shared/uploads` — voldoende vrije ruimte (ZIP + tijdelijke assembly ≈ 2× bestandsgrootte tijdens upload)
5. **Optioneel:** `ZIP_UPLOAD_CHUNK_BYTES=8388608` (8 MB, default)

## Gebruik

1. Map kiezen (bv. film modeshow)
2. ZIP kiezen → **ZIP uploaden**
3. Voortgangsbalk volgen; tabblad **open laten**
4. 4–5 GB: vaak **30–90 minuten** (veel kleine requests)

## Fouten

| Melding | Oorzaak |
|---------|---------|
| Internal server error / serverfout | Meestal één te grote POST of schijf vol — na deploy: automatisch chunked |
| Deel X/Y incompleet | Netwerk/proxy — opnieuw proberen |
| Schijf vol | Ruimte op MEDIA_ROOT vrijmaken |

## Combell support

Vraag om voldoende **schijfruimte** en **proxy-timeout** (uren) op `www` en `api.class-models.be`.
