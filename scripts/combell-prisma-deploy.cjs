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

function runEnsureTestshootFeedbackSchemaSync(root) {
  const runner = path.join(root, 'scripts', 'ensure-testshoot-feedback-schema.cjs');
  const r = spawnSync(
    process.execPath,
    [
      '-e',
      `require(${JSON.stringify(runner)}).runEnsureTestshootFeedbackSchema(${JSON.stringify(root)}).then((ok)=>process.exit(ok?0:1)).catch((e)=>{console.error(e);process.exit(1)})`,
    ],
    { cwd: root, env: process.env, stdio: 'inherit' },
  );
  return r.status === 0;
}

function runEnsureTryoutCouponsSchemaSync(root) {
  const runner = path.join(root, 'scripts', 'ensure-tryout-coupons-schema.cjs');
  const r = spawnSync(
    process.execPath,
    [
      '-e',
      `require(${JSON.stringify(runner)}).runEnsureTryoutCouponsSchema(${JSON.stringify(root)}).then((ok)=>process.exit(ok?0:1)).catch((e)=>{console.error(e);process.exit(1)})`,
    ],
    { cwd: root, env: process.env, stdio: 'inherit' },
  );
  return r.status === 0;
}

function runEnsureLoginCriticalSchemaSync(root) {
  const runner = path.join(root, 'scripts', 'ensure-login-critical-schema.cjs');
  const r = spawnSync(
    process.execPath,
    [
      '-e',
      `require(${JSON.stringify(runner)}).runEnsureLoginCriticalSchema(${JSON.stringify(root)}).then((ok)=>process.exit(ok?0:1)).catch((e)=>{console.error(e);process.exit(1)})`,
    ],
    { cwd: root, env: process.env, stdio: 'inherit' },
  );
  return r.status === 0;
}

function runCombellDbSetup(root) {
  const migrated = runPrismaMigrateDeploy(root);
  // Altijd kolommen forceren — ook als migrate faalde (anders 500 op feedback/admin/login).
  const ensureOk = runEnsureTestshootFeedbackSchemaSync(root);
  const tryoutOk = runEnsureTryoutCouponsSchemaSync(root);
  const loginOk = runEnsureLoginCriticalSchemaSync(root);
  if (!migrated && !ensureOk && !tryoutOk && !loginOk) return false;
  const { runCombellBootstrapDb } = require('./combell-bootstrap-db.cjs');
  return runCombellBootstrapDb(root);
}

module.exports = { runPrismaMigrateDeploy, runCombellDbSetup };
