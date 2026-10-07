'use strict';
/**
 * Start alleen de Nest-API op Railway/Render.
 * Draait prisma migrate deploy (als DB bereikbaar is), daarna de API.
 *
 * Railway Start Command:
 *   npm run railway:start
 *
 * Let op: dit wijzigt niets op Combell. Alleen gebruiken op de Railway-service.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { applyDbEnv, canReachMysqlHost } = require('./railway-db-url.cjs');

const root = path.join(__dirname, '..');
process.chdir(root);

async function main() {
  const dbUrl = applyDbEnv({ allowDummyForGenerate: false });

  if (dbUrl) {
    console.error('[railway-start] DB-host bereikbaarheid checken…');
    const reachable = await canReachMysqlHost(dbUrl, 4000);
    if (!reachable) {
      console.error(
        '[railway-start] MySQL NIET bereikbaar vanaf Railway (vaak: Combell remote DB dicht).',
      );
      console.error(
        '[railway-start] migrate overgeslagen — API start toch. Zet externe MySQL-toegang open in Combell, of gebruik een Railway-MySQL.',
      );
    } else {
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

  // Railway injecteert PORT; laat die voorrang hebben boven een vaste API_PORT=4000.
  if (process.env.PORT?.trim()) {
    console.error(`[railway-start] luistert op PORT=${process.env.PORT}`);
  } else if (process.env.API_PORT?.trim()) {
    console.error(`[railway-start] geen PORT — fallback API_PORT=${process.env.API_PORT}`);
  }

  console.error(`[railway-start] start ${entry}`);
  const r = spawnSync(process.execPath, [entry], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  });
  process.exit(r.status === null ? 1 : r.status);
}

main().catch((err) => {
  console.error('[railway-start] fatale fout', err);
  process.exit(1);
});
