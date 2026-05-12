# Pushberichten (Web Push + inbox)

## Wat is er gebouwd

- **Historiek → push**: elke gebeurtenis die in het modellenportaal onder **Historiek** wordt gelogd, kan ook een **inbox-regel** en een **systeem-push** geven (als het model dat wil).
- **Model**: tab **Pushberichten** — voorkeuren (historiek / bureau apart), inbox, en **push op dit toestel** (Web Push + service worker).
- **Backsite**: **Pushberichten** (broadcast naar alle modellen, premium, niet-premium, of een **push-lijst**) en **Push-lijsten** (leden beheren).
- **PWA**: `public/sw.js` toont meldingen met titel + tekst; waar ondersteund een **badge** op het app-icoon (`badgeUnread`).

## iPhone / Android

- **Android / desktop Chrome**: Web Push werkt in de browser; voor vaste app-ervaring: site installeren (PWA).
- **iPhone (iOS 16.4+)**: Web Push werkt voor sites die **aan het beginscherm zijn toegevoegd**; meldingen inschakelen in iOS-instellingen. Zonder “Zet op beginscherm” zijn meldingen beperkt of afwezig — dat is een Apple-beperking, geen bug in deze code.

## Omgeving (API)

Genereer VAPID-sleutels (één keer per omgeving):

```bash
cd apps/api && npx web-push generate-vapid-keys
```

Zet in `apps/api/.env` (of root `.env`):

- `VAPID_PUBLIC_KEY` — publiek
- `VAPID_PRIVATE_KEY` — geheim, nooit in de frontend
- `VAPID_CONTACT_EMAIL` — bv. `mailto:info@classmodels.be`
- `APP_PUBLIC_URL` — volledige basis-URL van de website (bv. `https://class-models.be`) voor de klik-URL in meldingen
- `APP_PUBLIC_BASE_PATH` — alleen als Next `basePath` gebruikt (zelfde waarde als `NEXT_PUBLIC_BASE_PATH`)

**CORS**: zet je webdomein in `CORS_ORIGIN` (komma-gescheiden), bv. `https://class-models.local`.

## Permissies

- Model: `portal.model.push.read`, `portal.model.push.subscribe` (staan in seed op modelrollen).
- Backoffice: `admin.push.send`, `admin.push.lists` (admin-rol heeft `*` en ziet alles).

## Firebase

Het bestaande `PushCampaign`-model wordt nu gebruikt voor backstage-broadcasts. Optionele Firebase-integratie kan later naast VAPID worden toegevoegd voor native apps.
