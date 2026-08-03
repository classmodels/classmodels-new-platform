# Railway-voorbereiding (API-motor) — Combell blijft intact

Dit document bereidt de **verhuis van de API** voor naar Railway.  
De website blijft op **Vercel**. Foto’s blijven op **R2**.  
**Niets aan Combell of DNS wijzigen** tot u expliciet de overstap doet.

## Belangrijk voor u

- U mag **nu gewoon nog een Combell-pipeline proberen**. Dat mag en moet zelfs eerst, als Combell de laatste hangende run heeft opgelost.
- Deze voorbereiding **blokkeert Combell niet** en zet de live site niet om.
- Pas als Railway getest is én u akkoord bent, draaien we `api.class-models.be` om.

## Wat al in de repo staat

| Bestand | Doel |
|---|---|
| `railway.toml` | Build/start/healthcheck voor Railway |
| `scripts/railway-build.cjs` | Bouwt alleen shared + API (niet de website) |
| `scripts/railway-start.cjs` | Migraties + start Nest-API |
| `scripts/railway-env-checklist.txt` | Lijst van variabelen om te kopiëren |
| `Dockerfile.api` | Alternatief (Docker); entrypoint gecorrigeerd |

Commando’s:

```bash
npm run railway:build
npm run railway:start
```

## Stappen — fase A (nu, veilig)

1. Account aanmaken op [railway.app](https://railway.app) (GitHub-login).
2. Nieuw project → **Deploy from GitHub repo** → `classmodels/classmodels-new-platform`.
3. Service-instellingen:
   - Build: `npm run railway:build` (of via `railway.toml`)
   - Start: `npm run railway:start`
   - Healthcheck: `/health`
4. Variabelen plakken uit `scripts/railway-env-checklist.txt`  
   (kopieer de geheimen uit Combell Environment — niet in chat plakken).
5. Deploy starten. Test-URL wordt iets als `https://….up.railway.app`.
6. Controleren: `https://….up.railway.app/health` → `{"status":"ok",…}`

### Databank

- **Ideaal eerst:** zelfde MySQL op Combell, als Combell **remote MySQL** toelaat.
- Als dat niet mag: later aparte MySQL op Railway + data-export (extra stap).

### Testen op de Railway-URL (vóór DNS)

- `/health`
- `/agenda/calendars`
- Inschrijven/testboeking met bewust fout GSM → moet de **nieuwe** foutmelding geven  
  (“Belgisch gsm-nummer…”) als die code op Railway staat.

Website (`www`) blijft naar Combell-API wijzen tot DNS/Vercel-omgeving omschakelt.

## Stappen — fase B (later, alleen met uw OK)

1. Custom domain in Railway: `api.class-models.be`
2. DNS bij Combell/registrar: `api` CNAME/A naar Railway
3. Op Vercel: `NEXT_PUBLIC_API_URL=https://api.class-models.be` (blijft meestal hetzelfde)
4. Live testen (login, agenda, foto’s, Mollie)
5. Combell Node-app pas daarna stopzetten of negeren

Terugdraaien: DNS terug naar Combell IP → oude motor weer actief.

## Wat u doet vs wat ik doe

| Taak | Wie |
|---|---|
| Railway-account + repo koppelen | U |
| Geheimen uit Combell naar Railway plakken | U (ik help met de lijst) |
| Code/scripts/docs klaarzetten | Ik (deels al gedaan) |
| Testen via Railway-URL | Samen |
| DNS omdraaien | U, op mijn signaal |
| Combell-pipeline nu nog proberen | U — **mag altijd** |

## Combell-pipeline nu

Ja: **probeer gerust eerst Combell opnieuw.**  
Als die slaagt, komen de GSM-/foto-fixes meteen live op de huidige motor.  
Railway blijft dan een backup/plan B klaarstaan voor als Combell weer vastloopt.
