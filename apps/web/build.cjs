'use strict';
/**
 * Combell: `next` staat niet in PATH. Gebruik altijd de Next-installatie uit
 * de monorepo-node_modules (geen `npx next` — dat breekt webpack-resolve).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname;

/** Alle `…/node_modules` vanaf apps/web omhoog tot monorepo-root (voor resolve + NODE_PATH). */
function ancestorNodeModulesRoots() {
  const roots = [];
  let dir = cwd;
  for (let i = 0; i < 10; i++) {
    roots.push(path.join(dir, 'node_modules'));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return roots;
}

function resolveNextBin() {
  const roots = [cwd, path.resolve(cwd, '..'), path.resolve(cwd, '../..')];
  for (const root of roots) {
    try {
      const pkgJson = require.resolve('next/package.json', { paths: [root] });
      const nextRoot = path.dirname(pkgJson);
      const bin = path.join(nextRoot, 'dist', 'bin', 'next');
      const appEntry = path.join(nextRoot, 'dist', 'pages', '_app.js');
      if (fs.existsSync(bin) && fs.existsSync(appEntry)) return bin;
    } catch (_) {
      /* volgende root */
    }
  }
  return null;
}

const nextBin = resolveNextBin();
if (!nextBin) {
  console.error(
    'Kan `next` niet vinden in node_modules (gezocht via package.json omhoog). Monorepo-root moet `npm ci` draaien.',
  );
  process.exit(1);
}

const nodePath = ancestorNodeModulesRoots()
  .filter((p) => fs.existsSync(p))
  .join(path.delimiter);

const env = {
  ...process.env,
  NODE_PATH: [nodePath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
};

const r = spawnSync(process.execPath, [nextBin, 'build'], { stdio: 'inherit', cwd, env });
process.exit(r.status === null ? 1 : r.status);
