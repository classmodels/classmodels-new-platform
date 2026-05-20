/**
 * Zet één gedeeld tijdelijk wachtwoord voor **modellen (catalogus-rollen)** die op dit platform
 * **nog nooit succesvol zijn ingelogd** (`lastLoginAt` is null): `model`, `newface`, `tryout`, `inactief`.
 *
 * Standaard is dit **breder** dan alleen `legacyWpUserId`: veel imports of handmatig aangemaakte
 * accounts krijgen geen WP-id, maar hadden nog wel een **oud/ander** wachtwoord in de DB.
 *
 * Alternatief (smaller): `--scope=legacy-wp`:
 * alleen gebruikers mét `legacyWpUserId`, zonder login.
 *
 * Wijzigt alleen `passwordHash` (`mustChangePassword` blijft ongewijzigd).
 *
 * Gebruik (vanaf apps/api root, DB_URL ingesteld naar productie):
 *   npm run tool:set-model-temp-password -- --dry-run --password='classmodels2026!'
 *   npm run tool:set-model-temp-password -- --apply --password='classmodels2026!'
 *
 * Oud gedrag alleen WP-import-keys:
 *   npm run tool:set-model-temp-password -- --dry-run --scope=legacy-wp --password='classmodels2026!'
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATALOG_MODEL_ROLE_SLUGS = ['model', 'newface', 'tryout', 'inactief'] as const;

function argValue(name: string): string | undefined {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const password = argValue('password') || '';
  const dryRun = hasFlag('dry-run');
  const apply = hasFlag('apply');

  if (password.length < 10) {
    console.error('Gebruik: --password=... (minimaal 10 tekens) [--dry-run|--apply]');
    process.exit(1);
  }
  if (!apply && !dryRun) {
    console.error('Geef --dry-run (aanbevolen eerst) of --apply.');
    process.exit(1);
  }

  const scopeRaw = argValue('scope');
  const normalized = (scopeRaw || 'model-no-login').toLowerCase();

  if (normalized !== 'model-no-login' && normalized !== 'legacy-wp' && normalized !== 'legacy') {
    console.error(`Onbekende --scope. Gebruik: model-no-login (standaard) | legacy-wp`);
    process.exit(1);
  }

  const isLegacyWp = normalized === 'legacy-wp' || normalized === 'legacy';
  let filterDescription = '';

  const base = {
    lastLoginAt: null,
    status: 'active' as const,
  };

  const where = isLegacyWp
    ? { ...base, legacyWpUserId: { not: null } }
    : {
        ...base,
        roles: { some: { role: { slug: { in: [...CATALOG_MODEL_ROLE_SLUGS] } } } },
      };

  filterDescription = isLegacyWp
    ? 'legacyWpUserId set AND lastLoginAt IS NULL AND status active'
    : `catalog model role (${CATALOG_MODEL_ROLE_SLUGS.join(', ')}) AND lastLoginAt IS NULL AND status active`;

  const scopeLabel = isLegacyWp ? 'legacy-wp' : 'model-no-login';

  const targets = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      legacyWpUserId: true,
      roles: { select: { role: { select: { slug: true } } } },
    },
    orderBy: { email: 'asc' },
  });

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'apply',
        scope: scopeLabel,
        filter: filterDescription,
        matchCount: targets.length,
        users: targets.map((t) => ({
          email: t.email,
          legacyWpUserId: t.legacyWpUserId,
          roles: t.roles.map((r) => r.role.slug),
        })),
      },
      null,
      2,
    ),
  );

  if (dryRun || targets.length === 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await prisma.user.updateMany({
    where,
    data: { passwordHash },
  });

  console.log(JSON.stringify({ ok: true, updated: result.count }, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
