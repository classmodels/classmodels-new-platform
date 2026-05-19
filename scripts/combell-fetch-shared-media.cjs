'use strict';
/**
 * Haalt shared/uploads op uit GitHub (sparse) wanneer die map niet in de Docker build-context zit.
 * Vereist: git, netwerk, publieke repo.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'shared', 'uploads');

function countFiles(dir) {
  let n = 0;
  const walk = (d) => {
    if (n > 5000) return;
    let ents;
    try {
      ents = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else n += 1;
    }
  };
  walk(dir);
  return n;
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    if (process.env.COMBELL_MEDIA_FETCH_OPTIONAL === '1') {
      console.error(`[combell] media fetch stap mislukt (${cmd}) — overgeslagen (OPTIONAL)`);
      process.exit(0);
    }
    process.exit(r.status || 1);
  }
}

const repo =
  process.env.COMBELL_MEDIA_GIT_URL?.trim() ||
  'https://github.com/classmodels/classmodels-new-platform.git';
const branch = process.env.COMBELL_MEDIA_GIT_BRANCH?.trim() || 'main';

const existing = fs.existsSync(dest) ? countFiles(dest) : 0;
if (existing > 100) {
  console.error(`[combell] shared/uploads al aanwezig (${existing} bestanden) — fetch overgeslagen`);
  process.exit(0);
}

const tmp = path.join(root, '.tmp-sparse-media');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

console.error(`[combell] media fetch: sparse clone ${repo} (${branch}) → shared/uploads`);
run('git', ['clone', '--depth', '1', '--branch', branch, '--filter=blob:none', '--sparse', repo, tmp], {
  cwd: root,
});
run('git', ['sparse-checkout', 'set', 'shared/uploads'], { cwd: tmp });
run('git', ['checkout', branch], { cwd: tmp });

const src = path.join(tmp, 'shared', 'uploads');
if (!fs.existsSync(src)) {
  console.error('[combell] media fetch MISLUKT: shared/uploads niet in repo');
  process.exit(1);
}

fs.mkdirSync(path.join(root, 'shared'), { recursive: true });
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });

console.error(`[combell] media fetch OK (${countFiles(dest)} bestanden in shared/uploads)`);
