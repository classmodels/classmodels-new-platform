# Migratie van oude WordPress → nieuw platform

## Principes

- **Veilig:** geen destructieve acties op de bron-site zonder expliciete export.
- **Preview & mapping:** eerst rapport (counts, types) in `MigrationBatch`.
- **Herhaalbaar:** elke run maakt een nieuwe `MigrationBatch` met `report` JSON.
- **Logging:** fouten in `report.errors` (uitbreidbaar).

## WordPress-export (WXR)

In WordPress: **Tools → Export → All content** → XML-bestand downloaden.

## CLI: parse + batch (huidige stap)

Vanuit de monorepo-root (met `DATABASE_URL` gezet, zie `.env`):

```bash
# Alleen preview in DB (status: preview)
npm run wp:migrate -- --file=/pad/naar/export.xml --dry-run

# Zelfde parse, status: parsed (nog steeds geen User/Content import)
npm run wp:migrate -- --file=/pad/naar/export.xml
```

Direct in `apps/api`:

```bash
cd apps/api
DATABASE_URL="mysql://..." npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-wordpress.ts --file=export.xml --dry-run
```

### Wat wordt opgeslagen?

- Eén rij in **`MigrationBatch`**: `source: wordpress`, `status` `preview` of `parsed`, `report` met o.a.:

  - `totalItems`, `byPostType`, `byStatus`
  - `channelTitle`, `wxrVersion`
  - vaste `note` dat er nog geen users/media/posts zijn geïmporteerd

### XML-parser

`fast-xml-parser` met `removeNSPrefix: true` zodat `wp:post_type` o.a. als `post_type` verschijnt.

## Roadmap (volgende iteraties)

1. **Mappingbestand** (YAML/JSON): rol-slugs, oude user meta → `User`, pad-prefix voor media.
2. **Upsert** gebruikers en content (`ContentString` / gestructureerde tabellen).
3. **Media:** download uit `wp-content/uploads` of URLs uit attachments, schrijf naar `MediaAsset` + schijf.
4. **`--apply` vlag** voor echte import na goedgekeurde dry-run (met transacties per batch).

Tot die tijd: gebruik deze CLI alleen voor **inventarisatie** en audit trail in MySQL.

## Modellen uit oude WordPress (registratie-modellen, `cm_*` usermeta)

De oude plugin `registratie-modellen.php` bewaart fichevelden als **user meta** (`cm_voornaam`, `cm_gemeente`, …). Dat zit **niet** in een standaard WXR-export. Daarvoor:

1. **Op de WordPress-server** (map met `wp-load.php`): kopieer `scripts/wp-export-class-models.php` uit deze monorepo naast `wp-load.php` en run:
   ```bash
   php wp-export-class-models.php > wp-models-export.json
   ```
2. **Zet `wp-models-export.json`** op je machine waar MySQL draait.
3. **Dry-run** (geen schrijven, enkel console-overzicht):
   ```bash
   npm run wp:import-models -- --file=/pad/wp-models-export.json --dry-run
   ```
4. **Import** (maakt ontbrekende gebruikers aan met rol `model`, vult/werkt `modelSheet` bij; bestaand e-mail = update fiche + rol `model` toevoegen indien nodig):
   ```bash
   npm run wp:import-models -- --file=/pad/wp-models-export.json --apply --temp-password='Minstens10Tekens!'
   ```

**Foto’s:** na de modellen-import (zelfde `wp-models-export.json` in de projectroot):

```bash
npm run wp:import-model-photos -- --file=wp-models-export.json --dry-run
npm run wp:import-model-photos -- --file=wp-models-export.json --apply
```

Gebruik daarvoor een export gemaakt met de **actuele** `scripts/wp-export-class-models.php` uit deze repo: die JSON bevat `hoofdfotoUrl`/`profielfotoUrl` en per gebruiker `galerijfotos` met directe URL’s (nodig als de live-site geen `wp-json` voor media serveert). Zonder `galerijfotos` in de JSON kan alleen de hoofdfoto geïmporteerd worden.
