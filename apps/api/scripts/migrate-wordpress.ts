/**
 * WordPress WXR (export) — preview & batch logging naar MigrationBatch.
 *
 * Gebruik:
 *   DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-wordpress.ts --file=export.xml [--dry-run]
 *
 * Of: npm run migrate:wp -- --file=pad/naar/export.xml --dry-run
 *
 * --dry-run: status `preview` (geen schrijfoperaties op User/Content; wel MigrationBatch voor audit).
 * Zonder --dry-run: zelfde parse, status `parsed` (nog steeds geen automatische import — die volgt in een latere stap).
 */
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function argValue(name: string): string | undefined {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function normalizeItems(channel: Record<string, unknown>): unknown[] {
  const raw = channel.item;
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function postType(item: Record<string, unknown>): string {
  const v =
    item['post_type'] ??
    item['wp:post_type'] ??
    (item as { posttype?: string }).posttype;
  return typeof v === 'string' ? v : 'unknown';
}

function postStatus(item: Record<string, unknown>): string {
  const v = item['status'] ?? item['wp:status'] ?? item['wp:post_status'];
  return typeof v === 'string' ? v : 'unknown';
}

async function main() {
  const file = argValue('file');
  const dryRun = hasFlag('dry-run');

  if (!file) {
    console.error(
      'Gebruik: npm run migrate:wp -- --file=export.xml [--dry-run]\n' +
        '  --file=   Pad naar WordPress WXR (Tools → Export → All content).\n' +
        '  --dry-run Preview-only label in MigrationBatch (aanbevolen eerst).',
    );
    process.exit(1);
  }

  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    console.error(`Bestand niet gevonden: ${abs}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(abs, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    trimValues: true,
  });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const rss = doc.rss as Record<string, unknown> | undefined;
  const channel = (rss?.channel ?? doc.channel) as Record<string, unknown> | undefined;

  if (!channel) {
    console.error('Ongeldige WXR: geen rss.channel of channel.');
    process.exit(1);
  }

  const items = normalizeItems(channel).filter(Boolean) as Record<string, unknown>[];
  const byPostType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const item of items) {
    const pt = postType(item);
    byPostType[pt] = (byPostType[pt] ?? 0) + 1;
    const st = postStatus(item);
    byStatus[st] = (byStatus[st] ?? 0) + 1;
  }

  const title = channel.title;
  const generator = channel['wp:wxr_version'] ?? channel['wxr_version'];

  const report = {
    sourceFile: abs,
    dryRun,
    channelTitle: typeof title === 'string' ? title : null,
    wxrVersion: generator ?? null,
    totalItems: items.length,
    byPostType,
    byStatus,
    errors: [] as string[],
    note:
      'Geen gebruikers/media/posts geïmporteerd in deze stap. Volgende iteratie: mapping + upserts + media kopiëren.',
  };

  console.log(JSON.stringify(report, null, 2));

  const batch = await prisma.migrationBatch.create({
    data: {
      source: 'wordpress',
      status: dryRun ? 'preview' : 'parsed',
      report: report as object,
    },
  });

  console.error(`MigrationBatch aangemaakt: id=${batch.id} status=${batch.status}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
