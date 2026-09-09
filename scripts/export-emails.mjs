#!/usr/bin/env node
/**
 * Unieke e-mails uit de lokale/productie-DB → exports/emails-export.csv
 *
 *   node scripts/export-emails.mjs
 *
 * Vereist DB_URL of DATABASE_URL (root .env of apps/api/.env).
 * Print alleen telling, geen e-mailadressen.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv(join(root, '.env'));
loadEnv(join(root, 'apps/api/.env'));
if (!process.env.DB_URL?.trim() && process.env.DATABASE_URL?.trim()) {
  process.env.DB_URL = process.env.DATABASE_URL.trim();
}
if (!process.env.DB_URL?.trim()) {
  console.error('DB_URL / DATABASE_URL ontbreekt. Zet hem in .env en probeer opnieuw.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const prismaClientPath = [
  join(root, 'node_modules/@prisma/client'),
  join(root, 'apps/api/node_modules/@prisma/client'),
].find((p) => existsSync(p));
if (!prismaClientPath) {
  console.error('Prisma Client ontbreekt. Run: npx prisma generate --schema apps/api/prisma/schema.prisma');
  process.exit(1);
}
const { PrismaClient } = require(prismaClientPath);
const prisma = new PrismaClient();

function csvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isoDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function add(map, { email, name, source, date }) {
  const raw = String(email || '').trim();
  if (!raw || !raw.includes('@')) return;
  const key = raw.toLowerCase();
  const existing = map.get(key);
  const sources = new Set(existing?.sources || []);
  sources.add(source);
  const nameVal = (name && String(name).trim()) || existing?.name || '';
  const dateVal = date || existing?.date || '';
  const keepEmail = existing?.email && existing.email.includes('@') ? existing.email : raw;
  map.set(key, { email: keepEmail, name: nameVal, sources, date: dateVal });
}

function fullName(...parts) {
  return parts
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(' ');
}

const rows = new Map();

try {
  const users = await prisma.user.findMany({
    select: { email: true, firstName: true, lastName: true, createdAt: true },
  });
  for (const u of users) {
    add(rows, {
      email: u.email,
      name: fullName(u.firstName, u.lastName),
      source: 'User',
      date: isoDate(u.createdAt),
    });
  }

  const bookings = await prisma.agendaBooking.findMany({
    select: { email: true, name: true, firstname: true, lastname: true, createdAt: true },
  });
  for (const b of bookings) {
    add(rows, {
      email: b.email,
      name: fullName(b.name, b.firstname, b.lastname),
      source: 'AgendaBooking',
      date: isoDate(b.createdAt),
    });
  }

  const tryouts = await prisma.tryoutModeshowRegistration.findMany({
    select: { createdAt: true, user: { select: { email: true, firstName: true, lastName: true } } },
  });
  for (const t of tryouts) {
    add(rows, {
      email: t.user?.email,
      name: fullName(t.user?.firstName, t.user?.lastName),
      source: 'TryoutModeshowRegistration',
      date: isoDate(t.createdAt),
    });
  }

  const bulk = await prisma.bulkContactListEntry.findMany({
    select: {
      email: true,
      displayName: true,
      createdAt: true,
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  for (const e of bulk) {
    add(rows, {
      email: e.email || e.user?.email,
      name: e.displayName || fullName(e.user?.firstName, e.user?.lastName),
      source: 'BulkContactListEntry',
      date: isoDate(e.createdAt),
    });
  }

  const outDir = join(root, 'exports');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'emails-export.csv');
  const lines = ['email,name,source,date'];
  const sorted = [...rows.values()].sort((a, b) => a.email.localeCompare(b.email, 'en', { sensitivity: 'base' }));
  for (const r of sorted) {
    const source = [...r.sources].sort().join(';');
    lines.push([csvCell(r.email), csvCell(r.name), csvCell(source), csvCell(r.date)].join(','));
  }
  writeFileSync(outFile, `\uFEFF${lines.join('\n')}\n`, 'utf8');

  const sourceCounts = {};
  for (const r of rows.values()) {
    for (const s of r.sources) sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  }
  console.log(`CSV: ${outFile}`);
  console.log(`Unieke e-mails: ${rows.size}`);
  console.log('Bronnen:', sourceCounts);
} finally {
  await prisma.$disconnect();
}
