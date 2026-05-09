# Media uploads testen

## Opslag

- Servermap: `MEDIA_ROOT` (default `./apps/api/uploads` of geconfigureerd pad op de server)
- Publieke URL: `GET {API}/media/public/{bestandsnaam}`  
  Voorbeeld: `http://localhost:4000/media/public/uuid.webp`

`bestandsnaam` is exact de `storageKey`, `webpKey` of `thumbKey` uit de database (geen paden).

## Upload (admin)

`POST /media/upload`  
Headers: `Authorization: Bearer <jwt>`  
Body: `multipart/form-data` veld `file`

Alleen gebruikers met rol `admin`.

Voorbeeld met curl:

```bash
TOKEN="..." # JWT van admin
curl -X POST http://localhost:4000/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/pad/naar/foto.jpg"
```

## Verwerking

- Origineel wordt opgeslagen.
- Voor afbeeldingen: **WebP** + thumbnail (Sharp) — zie `MediaService` in de API.

## Hard delete

Veld `hardDeleted` in `MediaAsset` (API voor restore/wissen volgt). Fysieke verwijdering op schijf hoort in dezelfde transactie/job te gebeuren zodra de module af is.

## Testchecklist

1. API draait, admin ingelogd.
2. Upload klein JPG/PNG.
3. Open `storageKey` via `/media/public/...` in de browser.
4. Controleer DB-record via Prisma Studio of admin-UI (later).
