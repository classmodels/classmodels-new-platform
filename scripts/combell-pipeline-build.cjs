'use strict';
/**
 * Één build voor Combell / CI: dezelfde stappen als `npm run build` in de monorepo-root,
 * met duidelijke logging. Zet dit als **Build command** in het Combell Node-paneel:
 *
 *   npm run combell:build
 *
 * Daarna alleen nog **herstart** van de Node-app in Combell (of wacht op auto-restart).
 * Migraties draaien bij **start** via scripts/combell-prisma-deploy.cjs (dual-proxy).
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
process.chdir(root);

function run(label, cmd, args, extra = {}) {
  console.error(`[combell-pipeline] ${label}`);
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: false,
    cwd: root,
    env: process.env,
    ...extra,
  });
  if (r.status !== 0 && r.status !== null) {
    console.error(`[combell-pipeline] MISLUKT (${r.status}):`, cmd, ...args);
    process.exit(r.status);
  }
  if (r.signal) {
    console.error(`[combell-pipeline] afgebroken (${r.signal}):`, cmd, ...args);
    process.exit(1);
  }
}

const ensureNext = path.join(root, 'scripts', 'ensure-next-for-combell.cjs');
const fetchMedia = path.join(root, 'scripts', 'combell-fetch-shared-media.cjs');
const syncMedia = path.join(root, 'scripts', 'combell-sync-media-uploads.cjs');

console.error('[combell-pipeline] root =', root);

if (fs.existsSync(fetchMedia)) {
  run('0/6 — shared/uploads ophalen (buiten Docker-context)', process.execPath, [fetchMedia]);
}

if (fs.existsSync(ensureNext)) {
  run('1/6 — controleren next/react (Combell)', process.execPath, [ensureNext]);
} else {
  console.error('[combell-pipeline] waarschuwing: ensure-next-for-combell.cjs ontbreekt');
}

run('2/6 — @cm/shared (verplicht vóór API)', 'npm', ['run', 'build', '-w', '@cm/shared']);
run('3/6 — @cm/api (Nest + Prisma generate)', 'npm', ['run', 'build', '-w', '@cm/api']);
run('4/6 — @cm/web (Next)', 'npm', ['run', 'build', '-w', '@cm/web']);

if (fs.existsSync(syncMedia)) {
  run('5/6 — media bundle + sync', process.execPath, [syncMedia]);
}

console.error('[combell-pipeline] klaar. Herstart de Node-app in Combell indien nodig.');
