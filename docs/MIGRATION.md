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
DATABASE_URL="postgresql://..." npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-wordpress.ts --file=export.xml --dry-run
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

Tot die tijd: gebruik deze CLI alleen voor **inventarisatie** en audit trail in PostgreSQL.
