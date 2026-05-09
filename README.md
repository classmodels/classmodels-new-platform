# Class Models — nieuw platform (`classmodels-new-platform`)

Onafhankelijk van WordPress: **Next.js** (frontend + PWA), **NestJS** (REST API), **PostgreSQL** (Prisma), eigen backoffice en portaalroutes. De bestaande live site wordt hier **niet** aangepast; dit project staat in een **aparte map** en is bedoeld voor test (`/testsite` of lokaal) vóór eventuele productie.

## Wat zit erin

| Onderdeel | Pad |
|-----------|-----|
| API (NestJS) | `apps/api` |
| Web (Next.js 15) | `apps/web` |
| Gedeelde tokens/types | `packages/shared` |
| Postgres + Redis (dev) | `docker-compose.yml` |
| DB-migraties | `apps/api/prisma/migrations/` (o.a. `20260509120000_init`, `20260510103000_subscription_user_fk`) |
| Docker images (optioneel) | `Dockerfile.api`, `Dockerfile.web` |

## Vereisten

- Node.js 22+ en npm 10+
- Docker Desktop (optioneel, voor Postgres/Redis)

## Snelstart (lokaal)

1. Kopieer omgevingsvariabelen:

   ```bash
   cp .env.example .env
   ```

   Pas `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL` en `NEXT_PUBLIC_APP_URL` aan indien nodig.

2. Start database (Postgres op poort **5433**, Redis op **6380**):

   ```bash
   npm run docker:up
   ```

3. Installeer dependencies (eenmalig):

   ```bash
   npm install
   ```

4. Pas schema toe en vul demo-gegevens:

   ```bash
   npm run db:deploy
   npm run db:seed
   ```

5. Start API + web:

   ```bash
   npm run dev
   ```

- Frontend: [http://localhost:3000](http://localhost:3000)  
- API health: [http://localhost:4000/health](http://localhost:4000/health)

### Demo-accounts (na `db:seed`)

| Rol | E-mail | Wachtwoord |
|-----|--------|------------|
| Admin | `admin@class-models.local` | `Demo123!` |
| Model | `model@class-models.local` | `Demo123!` |
| Klant | `klant@class-models.local` | `Demo123!` |

Admin ziet op de frontend de **zwarte adminbalk** (tekst aanpassen, portaal wisselen, backsite). Inline teksten slaan op via `PATCH /content/strings` (debounced).

## Builds (productie-artefacten)

```bash
npm run build
```

- `@cm/shared`: `packages/shared/dist`
- API: `apps/api/dist`
- Web: `apps/web/.next` (+ `standalone` voor Docker)

## Hosting: shared vs VPS

- **Alleen statische HTML** is hier **niet** voldoende: Next.js gebruikt een **Node-server** (SSR/API-routes in de toekomst), en de API is een aparte **Node**-proces.
- Aanbevolen: **VPS** of managed Node-hosting + **PostgreSQL**, of **Docker** (zie Dockerfiles) achter een reverse proxy (Nginx/Caddy).
- Klassieke **shared hosting zonder Node + Postgres** is ongeschikt voor deze stack.

## Documentatie (stap-voor-stap)

| Onderwerp | Bestand |
|-----------|---------|
| Lokaal testen | [docs/LOCAL.md](docs/LOCAL.md) |
| WordPress-export analyseren | `npm run wp:migrate -- --file=export.xml --dry-run` → zie [docs/MIGRATION.md](docs/MIGRATION.md) |
| Testmap `www/testsite` (live site ongemoeid laten) | [docs/TESTSITE.md](docs/TESTSITE.md) |
| Database | [docs/DATABASE.md](docs/DATABASE.md) |
| Mollie (test) | [docs/MOLLIE.md](docs/MOLLIE.md) |
| Push (Firebase / web push) | [docs/PUSH.md](docs/PUSH.md) |
| Media uploads | [docs/MEDIA.md](docs/MEDIA.md) |
| Later productie | [docs/LIVE.md](docs/LIVE.md) |
| WordPress → nieuw (migratie) | [docs/MIGRATION.md](docs/MIGRATION.md) |

## API-overzicht (kern)

- `POST /auth/login` — JWT
- `GET /users/me` — profiel + rollen
- `GET /content/strings` — inline content
- `PATCH /content/strings` — body `{ key, value }` (admin)
- `GET /media` / `POST /media/upload` — media (admin)
- `GET /media/public/:filename` — publiek bestand (website)
- `GET /payments/premium/info` — premieprijs (publiek)
- `POST /payments/premium/checkout` — start Mollie-betaling (JWT); body optioneel `{ "recurring": false }`
- `POST /payments/mollie/webhook` — Mollie webhook (`id` = payment id)

Meer modules (Mollie, push, agenda, …) worden in de API uitgebreid; het datamodel staat in `apps/api/prisma/schema.prisma`.

## Belangrijke omgevingsvariabelen

Zie **`.env.example`**. Minimaal: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`. Voor test achter subpad: `NEXT_PUBLIC_BASE_PATH=/testsite` (zie `docs/TESTSITE.md`).
