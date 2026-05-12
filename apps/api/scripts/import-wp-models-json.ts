/**
 * Importeert modellen uit JSON geproduceerd door scripts/wp-export-class-models.php (WordPress).
 *
 * Vanuit apps/api (met DATABASE_URL):
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/import-wp-models-json.ts --file=/pad/wp-models-export.json --dry-run
 *
 * Echte import (nieuwe gebruikers krijgen dit wachtwoord; bestaande e-mails worden enkel bijgewerkt qua fiche):
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/import-wp-models-json.ts --file=... --apply --temp-password='KiesEenTijdelijkWachtwoord123!'
 */
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { sanitizeModelSheetMerge } from '../src/users/model-sheet.util';

const prisma = new PrismaClient();

/** Zelfde sleutels als in model-sheet.util (camelCase). */
const SHEET_CAMEL = new Set<string>([
  'geboortedatum',
  'nationaliteit',
  'straat',
  'postcode',
  'gemeente',
  'land',
  'gsmMoeder',
  'gsmVader',
  'facebook',
  'instagram',
  'tiktok',
  'rekeningnummer',
  'lengte',
  'maat',
  'schoenmaat',
  'haarkleur',
  'kleurOgen',
  'bhMaat',
  'borstomtrek',
  'confectiemaat',
  'heupomtrek',
  'jeansmaat',
  'taille',
  'gsmModel',
  'overMij',
  'ervaringen',
  'geslacht',
  'beschikbaar',
]);

function argValue(name: string): string | undefined {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

type WpUserExport = {
  wpUserId: number;
  user_login: string;
  user_email: string;
  roles: string[];
  meta: Record<string, unknown>;
};

function metaToSheetPatch(meta: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(meta)) {
    if (!key.startsWith('cm_')) continue;
    const snake = key.slice(3);
    const camel = snakeToCamel(snake);
    if (!SHEET_CAMEL.has(camel)) continue;
    if (camel === 'geslacht' || camel === 'beschikbaar') {
      if (Array.isArray(raw)) {
        patch[camel] = raw.filter((x) => typeof x === 'string');
      }
      continue;
    }
    if (raw == null) continue;
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
      patch[camel] = raw;
    }
  }
  return patch;
}

function pickStr(meta: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = meta[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

async function main() {
  const file = argValue('file');
  const dryRun = hasFlag('dry-run');
  const apply = hasFlag('apply');
  const tempPassword = argValue('temp-password');

  if (!file) {
    console.error(
      'Gebruik: --file=/pad/wp-models-export.json [--dry-run] | [--apply --temp-password=...]\n' +
        '  Export maken in WordPress: php scripts/wp-export-class-models.php > wp-models-export.json',
    );
    process.exit(1);
  }

  if (apply && (!tempPassword || tempPassword.length < 10)) {
    console.error('--apply vereist een sterk --temp-password= (min. 10 tekens) voor nieuwe accounts.');
    process.exit(1);
  }

  if (!apply && !dryRun) {
    console.error('Geef --dry-run (aanbevolen eerst) of --apply.');
    process.exit(1);
  }

  const abs = (() => {
    const candidates = [
      path.isAbsolute(file) ? file : path.resolve(process.cwd(), file),
      path.resolve(process.cwd(), '..', file),
      path.resolve(process.cwd(), '..', '..', file),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  })();
  if (!fs.existsSync(abs)) {
    console.error(`Bestand niet gevonden: ${abs}  (cwd=${process.cwd()})`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(abs, 'utf8')) as { users?: WpUserExport[] };
  const users = raw.users ?? [];
  if (!Array.isArray(users) || users.length === 0) {
    console.error('Geen users[] in JSON.');
    process.exit(1);
  }

  const catalogSlugs = ['model', 'newface', 'tryout', 'inactief'] as const;
  const roleRows = await prisma.role.findMany({
    where: { slug: { in: [...catalogSlugs] } },
    select: { id: true, slug: true },
  });
  const roleIdBySlug = new Map(roleRows.map((r) => [r.slug, r.id]));
  for (const s of catalogSlugs) {
    if (!roleIdBySlug.has(s)) {
      console.error(`Rol "${s}" niet gevonden. Run: npm run db:seed -w @cm/api`);
      process.exit(1);
    }
  }

  function wpCatalogRoles(wpRoles: string[] | undefined): { slug: string; id: string }[] {
    const s = new Set<string>();
    for (const r of wpRoles ?? []) {
      if ((catalogSlugs as readonly string[]).includes(r)) s.add(r);
    }
    if (s.has('inactief')) {
      return [{ slug: 'inactief', id: roleIdBySlug.get('inactief')! }];
    }
    if (s.size === 0) s.add('model');
    return [...s].map((slug) => ({ slug, id: roleIdBySlug.get(slug)! }));
  }

  async function syncUserRoles(userId: string, wpRoles: string[] | undefined) {
    const pairs = wpCatalogRoles(wpRoles);
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.userRole.createMany({
      data: pairs.map((p) => ({ userId, roleId: p.id })),
    });
  }

  const report = {
    sourceFile: abs,
    dryRun,
    apply,
    totalWpUsers: users.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const passwordHash = apply && tempPassword ? await bcrypt.hash(tempPassword, 10) : null;

  for (const w of users) {
    const email = (w.user_email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) {
      report.skipped += 1;
      report.errors.push(`wpUserId ${w.wpUserId}: ongeldig e-mail`);
      continue;
    }

    const meta = w.meta ?? {};
    const patch = metaToSheetPatch(meta);
    const firstName =
      pickStr(meta, ['first_name', 'cm_voornaam']) ?? (email.split('@')[0] || 'Model').slice(0, 120);
    const lastName = pickStr(meta, ['last_name', 'cm_achternaam']) ?? '';
    const phone = pickStr(meta, ['cm_gsm_model']) ?? (typeof patch.gsmModel === 'string' ? patch.gsmModel : undefined);

    if (dryRun) {
      const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      console.log(`${exists ? 'UPDATE' : 'CREATE'} ${email}  (${w.user_login}, wp ${w.wpUserId})  sheetKeys=${Object.keys(patch).length}`);
      continue;
    }

    if (!apply || !passwordHash) continue;

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, modelSheet: true, firstName: true, lastName: true, phone: true },
    });

    try {
      if (existing) {
        const merged = sanitizeModelSheetMerge(existing.modelSheet ?? null, patch);
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            firstName: firstName || existing.firstName,
            lastName: lastName || existing.lastName,
            phone: phone ?? existing.phone,
            modelSheet: merged,
            legacyWpUserId: w.wpUserId,
          },
        });
        await syncUserRoles(existing.id, w.roles);
        report.updated += 1;
      } else {
        const merged = sanitizeModelSheetMerge(null, patch);
        const pairs = wpCatalogRoles(w.roles);
        await prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName: lastName || null,
            phone: phone ?? null,
            status: 'active',
            defaultPortal: 'model',
            modelSheet: merged,
            legacyWpUserId: w.wpUserId,
            roles: { create: pairs.map((p) => ({ roleId: p.id })) },
          },
        });
        report.created += 1;
      }
    } catch (e) {
      report.skipped += 1;
      report.errors.push(`wpUserId ${w.wpUserId} ${email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (apply) {
    await prisma.migrationBatch.create({
      data: {
        source: 'wordpress-models-json',
        status: 'applied',
        report: report as object,
      },
    });
    console.log(JSON.stringify(report, null, 2));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
