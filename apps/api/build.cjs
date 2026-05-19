'use strict';
/**
 * Nest build — Prisma generate draait via `npm run db:generate` in monorepo-root vóór deze stap.
 * Geen npx (faalt op Combell met `npm i prisma -D`).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname;

function monorepoRoot() {
  let dir = cwd;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'apps', 'api'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(cwd, '../..');
}

function resolveNestCli() {
  const root = monorepoRoot();
  const searchRoots = [cwd, root, path.join(root, 'apps', 'api')];
  for (const base of searchRoots) {
    const direct = path.join(base, 'node_modules', '@nestjs/cli', 'bin', 'nest.js');
    if (fs.existsSync(direct)) return direct;
    try {
      return require.resolve('@nestjs/cli/bin/nest.js', { paths: [base] });
    } catch {
      /**/
    }
  }
  console.error('[api/build] Nest CLI niet gevonden. Zorg dat `npm ci` in monorepo-root draait.');
  return null;
}

const nestCli = resolveNestCli();
if (!nestCli) process.exit(1);

const r = spawnSync(process.execPath, [nestCli, 'build'], { stdio: 'inherit', cwd });
process.exit(r.status === null ? 1 : r.status);
