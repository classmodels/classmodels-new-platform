'use strict';
const { spawnSync } = require('child_process');

const cwd = __dirname;
const resolveOpts = { paths: [cwd] };

let prismaCli;
let nestCli;
try {
  prismaCli = require.resolve('prisma/build/index.js', resolveOpts);
} catch (e) {
  console.error('Kan prisma niet vinden:', e.message);
  process.exit(1);
}
try {
  nestCli = require.resolve('@nestjs/cli/bin/nest.js', resolveOpts);
} catch (e) {
  console.error('Kan nest CLI niet vinden:', e.message);
  process.exit(1);
}

let r = spawnSync(process.execPath, [prismaCli, 'generate'], { stdio: 'inherit', cwd });
if (r.status) process.exit(r.status === null ? 1 : r.status);

r = spawnSync(process.execPath, [nestCli, 'build'], { stdio: 'inherit', cwd });
process.exit(r.status === null ? 1 : r.status);
