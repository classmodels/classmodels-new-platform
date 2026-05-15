# Mollie (testmodus en premium-flow)

## Overzicht

De API gebruikt `@mollie/api-client` voor:

- eenmalige **premiumbetaling** (standaard €48, uit `MollieSettings` of `PREMIUM_PRICE_EUROS`);
- een **webhook** die de betalingsstatus ophaalt bij Mollie en `User.isPremium` / `premiumUntil` bijwerkt;
- registratie in `Subscription` + `AuditLog`.

Premium is **effectief** zolang `isPremium` aan staat én er geen verstreken `premiumUntil` is (tenzij `premiumUntil` leeg is). Handmatig premium zet je in de admin bij gebruikers.

## Omgevingsvariabelen

Zie root `.env.example`:

| Variabele | Uitleg |
|-----------|--------|
| `MOLLIE_API_KEY_TEST` | Test key (`test_...`) |
| `MOLLIE_API_KEY_LIVE` | Live key (alleen productie) |
| `MOLLIE_MODE` | `test` of `live` — fallback als backoffice geen modus heeft ingesteld |
| `PREMIUM_PRICE_EUROS` | Fallback als DB-rij geen prijs heeft |
| `PREMIUM_DURATION_DAYS` | Dagen premium na status `paid` (default 365) |
| `API_PUBLIC_URL` | Basis-URL van de API voor webhook, bv. `https://jouwdomein.be/api-test` |
| `PAYMENT_REDIRECT_URL` | Volledige URL waar de gebruiker na betaling terugkomt (optioneel) |
| `WEB_APP_URL` | Fallback voor redirect: `{WEB_APP_URL}/portal/model/betaling/bedankt?soort=premium` |

Webhook-URL die je in Mollie configureert (of die automatisch wordt meegestuurd):

`{API_PUBLIC_URL}/payments/mollie/webhook`

**Lokaal:** Mollie moet je server bereiken — gebruik **ngrok** of test op een server met publieke URL.

## API-endpoints

### `GET /payments/premium/info`

Publiek. Geeft o.a. `amount`, `currency`, `premiumDurationDays`.

### `POST /payments/premium/checkout`

Headers: `Authorization: Bearer <JWT>`

Body (JSON, optioneel): `{ "recurring": true }` → wordt **geweigerd** tot Mollie Subscriptions is geïmplementeerd; gebruik eenmalige flow.

**Antwoorden:**

- `{ checkoutUrl, paymentId, subscriptionId }` — redirect de browser naar `checkoutUrl`.
- `{ skipCheckout: true, reason, ... }` — o.a. wanneer premium nog actief is tot `premiumUntil`.

### `POST /payments/mollie/webhook`

Body: `application/x-www-form-urlencoded` of JSON met veld **`id`** (Mollie payment id).

De server haalt de payment op bij Mollie (verificatie), zoekt `Subscription` op `molliePaymentId` en werkt status + gebruiker bij.

## Backoffice (aanbevolen)

**Admin → Mollie-instellingen** (`/admin/mollie`):

- Kies **Test API** of **Live API** (veld `activeMode` in database).
- Vul `test_…` en/of `live_…` keys in; gebruik **Test verbinding** om te controleren.
- Webhook-URL wordt getoond; leeg laten = `{API_PUBLIC_URL}/payments/mollie/webhook`.

Op productie werd vroeger automatisch live gebruikt; nu volgt de API **altijd** de modus uit de backoffice (of `MOLLIE_MODE` in `.env` als fallback).

## Testmodus in Mollie Dashboard

1. Backoffice: modus **Test** + test API key opslaan.
2. Webhook-URL instellen op je **publiek bereikbare** API (zelfde URL als in backoffice).
3. Testbetaling afronden; controleer `Subscription.status`, `User.isPremium`, `AuditLog`.

## Live

Backoffice: modus **Live** + live key. Zorg voor HTTPS-webhook en pas `docs/LIVE.md` toe.
