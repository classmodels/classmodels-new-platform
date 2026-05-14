'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const tsc = require.resolve('typescript/lib/tsc.js');
const args = [tsc, '-p', path.join(__dirname, 'tsconfig.json'), ...process.argv.slice(2)];
const r = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: __dirname });
process.exit(r.status === null ? 1 : r.status);
