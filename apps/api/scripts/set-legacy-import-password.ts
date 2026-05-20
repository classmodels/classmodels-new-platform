/**
 * Zet één gedeeld tijdelijk wachtwoord voor **geïmporteerde WordPress-accounts**
 * (`legacyWpUserId` is ingevuld) die **nog nooit succesvol zijn ingelogd** op dit platform
 * (`lastLoginAt` is null).
 *
 * Waarom: bij `import-wp-models-json.ts` krijgen **alleen nieuwe** e-mailadressen een
 * `--temp-password`; **bestaande** gebruikers worden bijgewerkt zonder het wachtwoord te
 * wijzigen — hun oude hash komt dus niet overeen met het gecommuniceerde import-wachtwoord.
 *
 * Wijzigt niet: rollen, `mustChangePassword`, e-mail of andere velden — alleen `passwordHash`.
 *
 * Gebruik (apps/api, met DB_URL naar de productie-DB):
 *   npm run tool:set-legacy-import-password -- --dry-run --password='classmodels2026!'
 *   npm run tool:set-legacy-import-password -- --apply --password='classmodels2026!'
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

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

  const where = {
    legacyWpUserId: { not: null },
    lastLoginAt: null,
    status: UserStatus.active,
  };

  const targets = await prisma.user.findMany({
    where,
    select: { id: true, email: true, firstName: true, lastName: true, legacyWpUserId: true },
    orderBy: { email: 'asc' },
  });

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'apply',
        filter: 'legacyWpUserId set AND lastLoginAt IS NULL AND status active',
        matchCount: targets.length,
        emails: targets.map((t) => t.email),
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
