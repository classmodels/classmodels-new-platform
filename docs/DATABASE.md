# Database (MySQL + Prisma)

## Rol

Eén **MySQL**-database voor website, app en backoffice. Geen WordPress-tabellen.

## Verbinding

Variabele: `DATABASE_URL`  
Voorbeeld (lokaal met docker-compose uit dit project):

```text
mysql://cmuser:cmpass@127.0.0.1:3307/classmodels
```

## Eerste opzet

```bash
npm run docker:up    # of eigen MySQL
npm run db:deploy  # past migraties toe
npm run db:seed    # demo-data (alleen test/acceptatie)
```

**Let op:** `db:seed` niet op productie gebruiken zonder aanpassing (demo-wachtwoorden).

## Schema

Bron: `apps/api/prisma/schema.prisma`

Belangrijke modellen: `User`, `Role`, `ContentString`, `Menu`/`MenuItem`, `MediaAsset`, `Review`, `MollieSettings`, `Subscription`, `PluginSnippet`, `MigrationBatch`, enz.

## Nieuwe migraties (ontwikkeling)

```bash
cd apps/api
npx prisma migrate dev --name beschrijving
```

Dit vergelijkt schema met DB en maakt een nieuwe map onder `prisma/migrations/`.

## Alleen migraties toepassen (CI/productie)

```bash
npm run db:deploy
```

## Back-up

Gebruik `mysqldump` op de productie-instantie; bewaar dumps versleuteld. Media staan op schijf (`MEDIA_ROOT`), niet in de DB.
