'use strict';
/**
 * Zelfde logica als combell-serve.sh maar zonder bash (Combell-minimal images).
 */
const { spawn } = require('child_process');
const path = require('path');
const { combellHostRouterEnabled } = require('./combell-host-router.cjs');

const root = path.join(__dirname, '..');
process.chdir(root);

console.error(
  '[combell-serve] root=',
  root,
  'COMBELL_HOST_ROUTER=',
  JSON.stringify(process.env.COMBELL_HOST_ROUTER),
  'PORT=',
  process.env.PORT,
);

function runNpmStartWorkspace(ws) {
  const child = spawn('npm', ['run', 'start', '-w', ws], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  child.on('error', (err) => {
    console.error('[combell-serve] spawn error:', err);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });
}

const serveApp = (process.env.SERVE_APP || 'web').trim();

if (serveApp === 'api') {
  const p = process.env.PORT || '4000';
  process.env.API_PORT = process.env.API_PORT || String(p);
  process.env.API_HOST = process.env.API_HOST || '0.0.0.0';
  runNpmStartWorkspace('@cm/api');
} else if (combellHostRouterEnabled()) {
  require('./combell-dual-proxy.cjs');
} else {
  runNpmStartWorkspace('@cm/web');
}
