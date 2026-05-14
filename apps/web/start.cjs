'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname;
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

const port = process.env.PORT || '3000';
const nextBin = findUp('next/dist/bin/next');
const args = ['start', '-p', port];
let r;
if (nextBin) {
  r = spawnSync(process.execPath, [nextBin, ...args], { stdio: 'inherit', cwd });
} else {
  r = spawnSync('npx', ['--yes', `next@${NEXT_VERSION}`, ...args], {
    stdio: 'inherit',
    cwd,
    shell: true,
  });
}
process.exit(r.status === null ? 1 : r.status);
