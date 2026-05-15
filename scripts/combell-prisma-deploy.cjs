'use strict';
/** Eén keer bij start: zorg dat MySQL-tabellen bestaan (anders login → Internal server error). */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findPrismaCli(startDir) {
  let dir = startDir;
  for (let i = 0; i < 14; i++) {
    const candidate = path.join(dir, 'node_modules', 'prisma', 'build', 'index.js');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function runPrismaMigrateDeploy(root) {
  if (!process.env.DB_URL?.trim() && !process.env.DATABASE_URL?.trim()) {
    console.error('[combell] prisma migrate deploy overgeslagen: DB_URL ontbreekt');
    return false;
  }
  const prismaCli = findPrismaCli(root) || findPrismaCli(path.join(root, 'apps', 'api'));
  if (!prismaCli) {
    console.error('[combell] prisma CLI niet gevonden — migrate deploy overgeslagen');
    return false;
  }
  const apiDir = path.join(root, 'apps', 'api');
  console.error('[combell] prisma migrate deploy…');
  const r = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: apiDir,
    env: process.env,
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    console.error('[combell] prisma migrate deploy MISLUKT (login kan Internal server error geven)');
    return false;
  }
  console.error('[combell] prisma migrate deploy OK');
  return true;
}

module.exports = { runPrismaMigrateDeploy };
