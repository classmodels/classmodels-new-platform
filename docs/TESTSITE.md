# Testsite onder `www/testsite` (bestaande site ongemoeid laten)

Het doel: de **huidige WordPress-site** en bestanden in `www` (of de live root) **niet overschrijven**. Het nieuwe platform draait in een **aparte map** op de server, bv. `www/testsite` **alleen voor statische/exporteerbare frontends**, of — realistischer — als **subpad achter een reverse proxy** naar een **Node-proces**.

## Wat moet **niet** in `www/testsite` (plat kopiëren)

- Alleen de ruwe `.next`-map zonder Node-server is **onbruikbaar** voor deze Next.js-app (SSR/standalone server).
- De **API** is een **apart** proces (poort intern, bv. 4000) en hoort **niet** als losse PHP-map in `testsite`.

## Aanbevolen architectuur op dezelfde host

1. **PostgreSQL** — aparte database, bv. `classmodels_test`, eigen gebruiker.
2. **API (NestJS)** — draait als systemd-service of Docker-container, bereikbaar intern als `http://127.0.0.1:4000`.
3. **Web (Next.js)** — `next build` met `output: 'standalone'`, start met `node server.js` (zie `Dockerfile.web`), bereikbaar intern als `http://127.0.0.1:3000`.
4. **Reverse proxy (Nginx/Caddy)** — publieke URL:

   - `https://www.class-models.be/testsite` → proxy naar Next (pad-prefix `/testsite`).
   - `https://www.class-models.be/api-test` (of een subdomein) → proxy naar Nest.

   Zo raakt de **WordPress-root** (`/` of bestaande vhost) **niet** overschreven.

## Next.js `basePath` voor `/testsite`

Voor de **test-omgeving** stel je in (build-time):

```env
NEXT_PUBLIC_BASE_PATH=/testsite
```

En in `next.config.ts` wordt dit al verwerkt (`basePath` + `assetPrefix`). **Herbouw** de web-app na het wijzigen van deze variabele.

Zet ook:

```env
NEXT_PUBLIC_APP_URL=https://www.class-models.be/testsite
NEXT_PUBLIC_API_URL=https://www.class-models.be/api-test
```

(pas paden aan naar jouw proxy-keuze).

## CORS op de API

`CORS_ORIGIN` moet de **publieke** test-URL van de frontend bevatten, bv.:

```env
CORS_ORIGIN=https://www.class-models.be
```

of een lijst met komma’s als je meerdere origins gebruikt.

## Welke bestanden “horen” waar (conceptueel)

| Locatie op server | Inhoud |
|-------------------|--------|
| Geen platte WordPress-map | Node + Postgres + proxy |
| `www/testsite` (optioneel) | Alleen als je **statische export** zou doen — **niet** het default van dit project |
| VPS / container | `standalone` Next + `dist` API + `uploads` voor media |
| Database-server | PostgreSQL schema via `prisma migrate deploy` |

## Stappen samengevat

1. Maak een **nieuwe** Postgres-database (test).
2. Zet **omgevingsvariabelen** op de server (zie `.env.example`).
3. Deploy API: `npm run db:deploy` + start `node dist/main.js` (of Docker `Dockerfile.api`).
4. Deploy web: build met `NEXT_PUBLIC_BASE_PATH=/testsite` + start standalone server (of Docker `Dockerfile.web`).
5. Configureer **Nginx/Caddy** voor `/testsite` en API-pad — **geen** overschrijven van WordPress-documentroot tenzij bewust gemigreerd.

De **live** WordPress-site blijft dienen tot je bewust omschakelt (zie `docs/LIVE.md`).
