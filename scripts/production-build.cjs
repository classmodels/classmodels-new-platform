'use strict';
/**
 * Productiebuild.
 * Op Vercel alleen de website: de API draait op Railway en prisma generate
 * heeft daar geen database nodig.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { applyDbEnv } = require('./railway-db-url.cjs');

const root = path.join(__dirname, '..');
process.chdir(root);

function run(label, cmd, args) {
  console.error(`[build] ${label}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: false, cwd: root, env: process.env });
  if (result.signal) {
    console.error(`[build] afgebroken (${result.signal}):`, cmd, ...args);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[build] mislukt (${result.status}):`, cmd, ...args);
    process.exit(result.status === null ? 1 : result.status);
  }
}

run('ensure next', 'node', ['scripts/ensure-next-for-combell.cjs']);
run('shared', 'npm', ['run', 'build', '-w', '@cm/shared']);

if (process.env.VERCEL) {
  run('web', 'npm', ['run', 'build', '-w', '@cm/web']);
  process.exit(0);
}

applyDbEnv({ allowDummyForGenerate: true });
run('prisma generate', 'npm', ['run', 'db:generate']);
run('api', 'npm', ['run', 'build', '-w', '@cm/api']);
run('web', 'npm', ['run', 'build', '-w', '@cm/web']);
