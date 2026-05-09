# Lokaal testen

## 1. Vereisten

- Node.js 22+ en npm
- Docker Desktop (aanbevolen voor Postgres)

## 2. Omgeving

```bash
cd classmodels-new-platform
cp .env.example .env
```

Vul minstens in:

- `DATABASE_URL` — standaard in `.env.example`: `postgresql://cmuser:cmpass@localhost:5433/classmodels?schema=public`
- `JWT_SECRET` — lang willekeurig geheim (min. 32 tekens in productie)
- `NEXT_PUBLIC_API_URL=http://localhost:4000`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `CORS_ORIGIN=http://localhost:3000`

## 3. Database starten

```bash
npm run docker:up
```

Dit start PostgreSQL (poort **5433**) en Redis (**6380**), los van andere projecten op de standaard 5432.

## 4. Installatie en migratie

```bash
npm install
npm run db:deploy
npm run db:seed
```

- `db:deploy` past alle Prisma-migraties toe (`prisma migrate deploy`).
- `db:seed` maakt rollen, demo-gebruikers en basis-content aan.

## 5. Applicatie starten

```bash
npm run dev
```

- Website: http://localhost:3000  
- API: http://localhost:4000  
- Healthcheck: GET http://localhost:4000/health  

## 6. Functioneel testen

1. **Inloggen** — `/login` met demo-accounts (zie README).
2. **Portaalrouting** — model/klant wordt na login naar het juiste portaal gestuurd; admin blijft op de site en ziet de adminbalk.
3. **Inline tekst (admin)** — “Tekst aanpassen” in de adminbalk, hero-titels bewerken; opslaan gebeurt automatisch (geen volledige reload).
4. **Backsite** — “Backsite” → `/admin` (sidebar + placeholders).
5. **Media (admin)** — via API: `POST /media/upload` met JWT (zie `docs/MEDIA.md`).
6. **Mollie (test)** — zet `MOLLIE_API_KEY_TEST` en publieke `API_PUBLIC_URL` (of ngrok); zie `docs/MOLLIE.md`. `POST /payments/premium/checkout` met JWT.
7. **WordPress WXR** — `npm run wp:migrate -- --file=export.xml --dry-run` (zie `docs/MIGRATION.md`).

## 7. Handige commando’s

| Commando | Betekenis |
|----------|-----------|
| `npm run build` | Productiebuild shared + API + web |
| `npm run db:generate` | Prisma Client genereren |
| `npm run db:migrate` | Nieuwe migratie ontwikkelen (`migrate dev`) |
| `npm run docker:down` | Containers stoppen |
