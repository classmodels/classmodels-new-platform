# Later live zetten (na succesvolle test)

**Niet automatisch uitvoeren** — dit is een checklist wanneer je bewust van test naar productie gaat.

## 1. Infra

- **VPS of managed Node + MySQL** (aanbevolen). Zorg voor TLS (Let’s Encrypt).
- Back-ups van database en mediabestanden (`MEDIA_ROOT` / volume).

## 2. Omgeving (productie)

- Sterke `JWT_SECRET`, geen demo-seed op productie.
- `NODE_ENV=production`
- `DATABASE_URL` naar productie-MySQL
- `MOLLIE_API_KEY_LIVE` alleen wanneer live betalingen gewenst zijn (zie `docs/MOLLIE.md`)
- `CORS_ORIGIN` = exacte publieke origin(s) van de frontend
- `NEXT_PUBLIC_BASE_PATH` leeg laten als de site op `/` draait
- `NEXT_PUBLIC_API_URL` en `NEXT_PUBLIC_APP_URL` op productie-URL’s

## 3. Deploy-volgorde

1. `prisma migrate deploy` op productie-DB
2. API starten (Docker of process manager)
3. Web build + start standalone server
4. Proxy: `/` → Next, `/` of subdomein voor API volgens jouw API-URL-keuze

## 4. WordPress

- DNS en vhost **bewust** omschakelen van oude naar nieuwe stack, of gefaseerd subdomein (`nieuw.class-models.be`) gebruiken.
- **Geen** automatische overschrijving van `wp-content` of database zonder migratie (zie `docs/MIGRATION.md`).

## 5. Na go-live

- Monitoring (logs, uptime)
- Webhook-URL’s Mollie controleren
- Firebase / push credentials productie (zie `docs/PUSH.md`)
