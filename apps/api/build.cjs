'use strict';
/**
 * 1) Lokaal: prisma/nest uit node_modules (workspaces → vaak in monorepo-root).
 * 2) Combell / rare Docker: als die er niet staan → `npx --yes` met vaste versies
 *    (downloadt de CLI; build heeft normaal netwerk).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname;

const PRISMA_VERSION = '5.22.0';
const NEST_CLI_VERSION = '10.4.9';

/** Monorepo-root: `apps/api` → `../..` */
const repoRoot = path.resolve(cwd, '..', '..');

function findUp(relativePath) {
  let dir = cwd;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'node_modules', ...relativePath.split('/'));
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function runNode(scriptPath, args) {
  return spawnSync(process.execPath, [scriptPath, ...args], { stdio: 'inherit', cwd });
}

function runNpx(pkgWithVersion, args) {
  return spawnSync('npx', ['--yes', pkgWithVersion, ...args], {
    stdio: 'inherit',
    cwd,
    shell: true,
  });
}

// --- @cm/shared: Nest runtime laadt `packages/shared/dist` (niet src). Zonder build → API start niet of 500 op alle routes. ---
const sharedPkg = path.join(repoRoot, 'packages', 'shared', 'package.json');
if (fs.existsSync(sharedPkg)) {
  const rb = spawnSync('npm', ['run', 'build', '-w', '@cm/shared'], {
    stdio: 'inherit',
    cwd: repoRoot,
    shell: true,
  });
  if (rb.status) process.exit(rb.status === null ? 1 : rb.status);
}

// --- Prisma generate (zelfde DB_URL / DATABASE_URL-brug als env.bootstrap) ---
if (!process.env.DB_URL?.trim() && process.env.DATABASE_URL?.trim()) {
  process.env.DB_URL = process.env.DATABASE_URL.trim();
}
const prismaCli = findUp('prisma/build/index.js');
let r;
if (prismaCli) {
  r = runNode(prismaCli, ['generate']);
} else {
  r = runNpx(`prisma@${PRISMA_VERSION}`, ['generate']);
}
if (r.status) process.exit(r.status === null ? 1 : r.status);

// --- Nest build ---
const nestCli = findUp('@nestjs/cli/bin/nest.js');
if (nestCli) {
  r = runNode(nestCli, ['build']);
} else {
  r = runNpx(`@nestjs/cli@${NEST_CLI_VERSION}`, ['build']);
}
process.exit(r.status === null ? 1 : r.status);
