# Media uploads testen

## Opslag

- Servermap: `MEDIA_ROOT` (default `./apps/api/uploads` of geconfigureerd pad op de server)
- Publieke URL: `GET {API}/media/public/{bestandsnaam}`  
  Voorbeeld: `http://localhost:4000/media/public/uuid.webp`

`bestandsnaam` is exact de `storageKey`, `webpKey` of `thumbKey` uit de database (geen paden).

## Schijf vs. mediatheek (database)

- De **mediatheek** toont alleen rijen in `MediaAsset`. Bestanden die enkel op schijf staan (FTP, handmatig), zie je **niet** tot ze geregistreerd zijn.
- **Admin → Media**: onder *Schijf → mediatheek* kun je een **proefrun** doen of **Registreer van schijf** (max. 300 per keer). Daarmee worden ontbrekende mediabestanden onder `MEDIA_ROOT` als assets in de **huidige map** aangemaakt.
- API: `POST /media/register-disk-orphans?folderSlug=models&limit=300` (optioneel `dryRun=true`), JWT + `admin.media.write`.

## Productie (Combell) — waarom foto’s “weg” zijn na deploy

1. **Release-map**: bij een nieuwe pipeline wordt vaak een **verse checkout** uitgerold. Alles onder `apps/api/uploads` **in die checkout** hoort bij die release en **verdwijnt** bij de volgende deploy.
2. **Foute combinatie**: de API schreef naar `apps/api/uploads`, terwijl een sync-script oude bestanden van `~/www/cm-media/uploads` **éénrichting** naar de release kopieerde. Nieuwe uploads kwamen **nooit** in de persistente map → na deploy weg.
3. **Dotenv**: `combell-dual-proxy` kan een absoluut `MEDIA_ROOT` zetten, maar `apps/api/.env` met `MEDIA_ROOT=uploads` en `override: true` **overschreef** dat weer → terug naar de release-map.

**Combell Node-container (antwoord support):** Node draait in een container; persistente data hoort in **`./shared/`** → **`/app/shared`** (gebruik **`MEDIA_ROOT=/app/shared/uploads`**). De hosting file manager (`www/`, `data/`) is **niet** de Node-container.

**Git `shared/uploads`:** mediabestanden horen in de repo onder `shared/uploads/`. Bij build (`combell-pipeline-build`) worden ze gestaged naar `apps/api/.deploy-media-bundle/uploads`; bij **start** kopieert `combell-dual-proxy` die bundle naar `/app/shared/uploads` als de persistente map nog leeg/ouder is (Combell mount verbergt anders de git-map).

**Definitieve aanpak (ingebouwd):**

- Start via **`scripts/combell-dual-proxy.cjs`**: vóór Nest wordt `MEDIA_ROOT` gezet op een **absoluut persistent pad** (`/app/shared/uploads` in de container, of `$HOME/www/cm-media/uploads` op klassieke hosting).
- **`env.bootstrap.ts`**: een absoluut `MEDIA_ROOT` dat al in het proces stond vóór dotenv, wordt **niet** overschreven door `.env`.
- **`combell-sync-media-uploads.cjs`**: synchroniseert naar **diezelfde** persistente map (niet meer naar `apps/api/uploads` in de release).
- **Agenda- en fotograaf-uploads** schrijven onder `MEDIA_ROOT/agenda` en `MEDIA_ROOT/photographer-tmp` (zelfde schijf als de mediatheek).

**Handmatig controleren na deploy:** in de API-log staat `[media] opslag=…` en bij dual-proxy ook `MEDIA_ROOT=/home/.../www/cm-media/uploads`. Controleer dat dat pad op schijf bestaat en groeit na een testupload.

**Docker / VPS:** zet `MEDIA_ROOT` op een **gemount volume** (bv. `/data/media`), niet op een map binnen de image.

## Combell dual-proxy en zichtbare foto’s (www)

- De browser vraagt bestanden aan via **`/__cm_api/media/public/{bestandsnaam}`** (zelfde origin als de site).
- De dual-proxy stuurt **`/__cm_api/*`** en **`GET /media/*`** **rechtstreeks naar Nest** en verwijdert het prefix `__cm_api`, zodat media **niet** afhangt van Next standalone-rewrites (die kunnen voor binaire responses problemen geven).
- **Diepere optie (aanbevolen op productie):** zet bij de **web-build** `NEXT_PUBLIC_API_URL=https://api.jouwdomein.be` (publiek bereikbare API). De UI bouwt `<img src>` dan naar **`https://api…/media/public/…`** — buiten www en buiten `/__cm_api` om, zolang de bestanden op de API-schijf staan (`MEDIA_ROOT`).
- Optioneel: `NEXT_PUBLIC_MEDIA_BASE_URL` als CDN of andere host dan de API.
- Controle na deploy: `curl -I "https://api…/media/public/EEN_KEY_UIT_DE_DB"` → `200` en `Content-Type: image/…`. Bij `404` ontbreekt het bestand onder `MEDIA_ROOT` of klopt de naam niet t.o.v. de database.

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
