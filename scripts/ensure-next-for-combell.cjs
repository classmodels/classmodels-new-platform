'use strict';
/**
 * Combell: soms ontbreekt `next` in node_modules na `npm ci` (workspaces/hoisting).
 * Installeer dan gericht next + react (zelfde versies als package.json), vóór de rest van `npm run build`.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
if (fs.existsSync(nextBin)) {
  process.exit(0);
}

console.error('[ensure-next] next ontbreekt na npm ci; voer gerichte npm install uit…');
const r = spawnSync(
  'npm',
  [
    'install',
    '--no-audit',
    '--no-fund',
    '--legacy-peer-deps',
    'next@15.0.3',
    'react@19.0.0',
    'react-dom@19.0.0',
  ],
  { stdio: 'inherit', cwd: root, shell: true },
);
process.exit(r.status === null ? 1 : r.status ?? 1);
