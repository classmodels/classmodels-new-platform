'use strict';
/**
 * Zelfde patroon als apps/api/build.cjs: Combell zet `next` niet in PATH.
 * 1) Zoek `next/dist/bin/next` omhoog in node_modules.
 * 2) Anders: `npx --yes next@… build`
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname;
/** Gelijk met apps/web/package.json dependency */
const NEXT_VERSION = '15.0.3';

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

const nextBin = findUp('next/dist/bin/next');
let r;
if (nextBin) {
  r = spawnSync(process.execPath, [nextBin, 'build'], { stdio: 'inherit', cwd });
} else {
  r = spawnSync('npx', ['--yes', `next@${NEXT_VERSION}`, 'build'], {
    stdio: 'inherit',
    cwd,
    shell: true,
  });
}
process.exit(r.status === null ? 1 : r.status);
