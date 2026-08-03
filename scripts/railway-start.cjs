'use strict';
/**
 * Start alleen de Nest-API op Railway/Render.
 * Draait prisma migrate deploy (als DB_URL/DATABASE_URL gezet is), daarna de API.
 *
 * Railway Start Command:
 *   npm run railway:start
 *
 * Let op: dit wijzigt niets op Combell. Alleen gebruiken op de Railway-service.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
process.chdir(root);

const dbUrl = (process.env.DB_URL || process.env.DATABASE_URL || '').trim();
if (dbUrl) {
  if (!process.env.DATABASE_URL?.trim()) process.env.DATABASE_URL = dbUrl;
  if (!process.env.DB_URL?.trim()) process.env.DB_URL = dbUrl;
  console.error('[railway-start] prisma migrate deploy…');
  const migrate = spawnSync(
    process.execPath,
    [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
    {
      stdio: 'inherit',
      cwd: path.join(root, 'apps/api'),
      env: process.env,
    },
  );
  if (migrate.status !== 0 && migrate.status !== null) {
    console.error('[railway-start] migrate mislukt — API start toch (controleer DB_URL)');
  }
} else {
  console.error('[railway-start] geen DB_URL/DATABASE_URL — migrate overgeslagen');
}

const candidates = [
  path.join(root, 'apps/api/dist/src/main.js'),
  path.join(root, 'apps/api/dist/main.js'),
];
const entry = candidates.find((p) => fs.existsSync(p));
if (!entry) {
  console.error('[railway-start] API-build niet gevonden. Draai eerst npm run railway:build');
  process.exit(1);
}

console.error(`[railway-start] start ${entry}`);
const r = spawnSync(process.execPath, [entry], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});
process.exit(r.status === null ? 1 : r.status);
