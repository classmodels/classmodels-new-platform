'use strict';
/**
 * Build alleen de API-motor voor Railway/Render (niet de Next-website).
 * Website blijft op Vercel. Combell-pipeline blijft ongewijzigd.
 *
 * Railway Build Command:
 *   npm run railway:build
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
process.chdir(root);

function run(label, cmd, args) {
  console.error(`[railway-build] ${label}`);
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: false,
    cwd: root,
    env: process.env,
  });
  if (r.status !== 0 && r.status !== null) {
    console.error(`[railway-build] MISLUKT (${r.status}):`, cmd, ...args);
    process.exit(r.status);
  }
  if (r.signal) {
    console.error(`[railway-build] afgebroken (${r.signal}):`, cmd, ...args);
    process.exit(1);
  }
}

run('npm ci', 'npm', ['ci']);
run('build @cm/shared', 'npm', ['run', 'build', '-w', '@cm/shared']);
run('prisma generate', 'npm', ['run', 'db:generate']);
run('build @cm/api', 'npm', ['run', 'build', '-w', '@cm/api']);
console.error('[railway-build] klaar');
