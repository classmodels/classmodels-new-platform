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

## Prullenbak (admin)

- Standaardmap **`verwijderde`**: bestanden staan hier na “Naar Verwijderde” of bulk-actie.
- **`POST /media/assets/move-trash`** body `{ "ids": ["uuid", ...] }`
- **`POST /media/trash/empty`**: alles in de prullenbak permanent wissen.

## Mapinstellingen (JSON op `MediaFolder.settings`)

- **`deleteDaysAfterModelDownload`**: dagen na eerste download-bevestiging door het model (`POST /portal/model/media/download-ack`); daarna worden assets bij de volgende mediatheek-/portaal-load opgeruimd.
- **`storeUploadsAsWebpOnly`**: nieuwe uploads in die map alleen als `.webp` opslaan (geen apart origineel). **Uitzondering:** map `testshoot` slaat altijd een primair bestand op (nodig voor zip in volle kwaliteit).

`PATCH /media/folders/:folderId/settings` met bovenstaande velden (admin JWT).

## Batch-acties (admin)

- **`POST /media/folders/:folderId/reoptimize-images`**: WebP + thumb opnieuw vanaf het primaire bestand.
- **`POST /media/folders/:folderId/convert-primary-to-jpeg`**: primair omzetten naar compact **JPEG** (`uuid.jpg`), daarna WebP + thumb opnieuw — minder schijf dan grote PNG/WebP-only.

## Verwerking

- Primair bestand op schijf (`storageKey`) tenzij map WebP-only (behalve testshoot, zie hierboven).
- Voor afbeeldingen: afgeleide **WebP** + thumbnail (Sharp) — zie `MediaService` in de API.

## Testshoot (bezoeker-zip)

- Bezoeker: `GET /guest/testshoot/models/:id/zip?…` — zip uit `storageKey`. Na een geslaagde download met minstens één bestand in de zip worden de foto’s van dat slot **verwijderd** (publieke galerij leeg).
- Admin: `GET /admin/testshoot/models/:id/zip` (JWT) — dezelfde zip, **zonder** wissen (backup vóór bezoeker-download).

## Hard delete

Veld `hardDeleted` in `MediaAsset` (API voor restore/wissen volgt). Fysieke verwijdering op schijf hoort in dezelfde transactie/job te gebeuren zodra de module af is.

## Testchecklist

1. API draait, admin ingelogd.
2. Upload klein JPG/PNG.
3. Open `storageKey` via `/media/public/...` in de browser.
4. Controleer DB-record via Prisma Studio of admin-UI (later).
