'use strict';
/**
 * Standaard: `combell-serve.cjs` (SERVE_APP=web|api).
 * Combell één instance + www én api: zet `COMBELL_HOST_ROUTER=1` → dual proxy (scripts/combell-dual-proxy.cjs).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

if (process.env.COMBELL_HOST_ROUTER === '1') {
  require('./combell-dual-proxy.cjs');
} else {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'combell-serve.cjs')], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  });
  process.exit(r.status === null ? 1 : r.status);
}
