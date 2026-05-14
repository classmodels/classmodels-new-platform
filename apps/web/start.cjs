'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = fs.realpathSync(__dirname);

/** Combell start vaak alleen `node apps/web/start.cjs` (niet root `npm start`). */
if (process.env.COMBELL_HOST_ROUTER === '1') {
  const dual = path.join(cwd, '..', '..', 'scripts', 'combell-dual-proxy.cjs');
  if (!fs.existsSync(dual)) {
    console.error('[start] combell-dual-proxy ontbreekt:', dual);
    process.exit(1);
  }
  require(dual);
} else {
  function tryNextBin(nextRoot) {
    const bin = path.join(nextRoot, 'dist', 'bin', 'next');
    const app = path.join(nextRoot, 'dist', 'pages', '_app.js');
    if (fs.existsSync(bin) && fs.existsSync(app)) return bin;
    return null;
  }

  function findNextBin() {
    let dir = cwd;
    for (let i = 0; i < 24; i++) {
      const hit = tryNextBin(path.join(dir, 'node_modules', 'next'));
      if (hit) return hit;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  }

  function ancestorNodeModulesRoots() {
    const roots = [];
    let dir = cwd;
    for (let i = 0; i < 24; i++) {
      roots.push(path.join(dir, 'node_modules'));
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return roots;
  }

  const nextBin = findNextBin();
  if (!nextBin) {
    console.error('Kan `next` niet vinden.');
    process.exit(1);
  }

  const port = process.env.PORT || '3000';
  const nodePath = ancestorNodeModulesRoots()
    .filter((p) => fs.existsSync(p))
    .join(path.delimiter);
  const env = {
    ...process.env,
    NODE_PATH: [nodePath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
  };

  const r = spawnSync(process.execPath, [nextBin, 'start', '-p', String(port)], {
    stdio: 'inherit',
    cwd,
    env,
  });
  process.exit(r.status === null ? 1 : r.status);
}
