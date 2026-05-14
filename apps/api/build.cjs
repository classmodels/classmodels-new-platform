'use strict';
/**
 * Combell / npm workspaces: prisma en nest staan vaak in de **monorepo-root**
 * `node_modules`, niet in `apps/api/node_modules`. `require.resolve` met alleen
 * `paths: [__dirname]` zoekt daar niet — daarom expliciet omhoog lopen.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname;

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

const prismaCli = findUp('prisma/build/index.js');
if (!prismaCli) {
  console.error('Kan prisma niet vinden (gezocht vanaf apps/api omhoog in node_modules).');
  process.exit(1);
}

const nestCli = findUp('@nestjs/cli/bin/nest.js');
if (!nestCli) {
  console.error('Kan nest CLI niet vinden (gezocht vanaf apps/api omhoog in node_modules).');
  process.exit(1);
}

let r = spawnSync(process.execPath, [prismaCli, 'generate'], { stdio: 'inherit', cwd });
if (r.status) process.exit(r.status === null ? 1 : r.status);

r = spawnSync(process.execPath, [nestCli, 'build'], { stdio: 'inherit', cwd });
process.exit(r.status === null ? 1 : r.status);
