# Grote ZIP-upload (mediatheek)

## Methode: altijd één bestand

De ZIP (tot 6 GB) gaat in **één HTTP POST** naar:

`https://api.class-models.be/media/upload-zip`

**Geen upload in stukjes** — op Combell kwamen fragmenten niet volledig aan (fout “deel 1/311”).

## Vereisten Combell

1. **Web build:** `NEXT_PUBLIC_API_URL=https://api.class-models.be`
2. **Node:** `COMBELL_UPLOAD_TIMEOUT_MS=21600000`, `API_UPLOAD_TIMEOUT_MS=21600000`
3. **Schijf:** `MEDIA_ROOT=/app/shared/uploads` (persistent)
4. **Vraag aan Combell support** (als upload rond 80–95% stopt):
   - Maximale **request body** op `api.class-models.be` (min. 6 GB)
   - **Proxy/load balancer timeout** (min. 2–6 uur voor uploads)

## Gebruik

1. Map kiezen (bv. film modeshow)
2. ZIP kiezen → ZIP uploaden
3. Tabblad **open laten**, **niet verversen** tot “Klaar”
4. 4–5 GB: vaak **30–90 minuten**

## Fout “Temporary failure” of HTML

Dat is een **hosting-timeout**, geen applicatiefout. Wacht tot andere zware taken klaar zijn en probeer opnieuw.
