# Pushberichten (testmodus)

## Doel

- **Firebase** voor mobiele/web push
- **Web push** (VAPID) voor PWA

## Variabelen (`.env.example`)

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (let op newline-escaping in `.env`)
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` — voor web clients

## Testmodus

1. Maak een Firebase-project (test) en download service account JSON → map naar de env-variabelen.
2. Schakel **Cloud Messaging** in; registreer web app en VAPID key.
3. In de app: service worker registreren (PWA) en FCM token naar de API sturen (endpoint volgt in API-module `push`).

## Wat nog gebouwd wordt

- API-endpoints: campagnes aanmaken/plannen (model `PushCampaign` bestaat al)
- Worker/queue (Redis staat in `docker-compose.yml` voor latere jobverwerking)
- Doelgroepfilters (rollen, premium, portaal)

## Lokaal zonder Firebase

Laat de Firebase-velden leeg; push is dan uitgeschakeld maar de rest van het platform blijft bruikbaar.
