'use strict';
/**
 * Next starten zonder `next` in PATH. Zoekt `next` met fs over alle
 * bovenliggende `node_modules` (robuuster dan require.resolve op Combell).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = fs.realpathSync(__dirname);

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

function logDiagnostics() {
  console.error('--- diagnose (next niet gevonden) ---');
  console.error('cwd (realpath):', cwd);
  let dir = cwd;
  for (let i = 0; i < 8; i++) {
    const nm = path.join(dir, 'node_modules');
    const exists = fs.existsSync(nm);
    let sample = '';
    if (exists) {
      try {
        sample = fs.readdirSync(nm).slice(0, 40).join(', ');
      } catch (e) {
        sample = '(lezen mislukt)';
      }
    }
    console.error(`  [${i}] ${nm} → ${exists ? 'JA' : 'NEE'}${exists ? ` o.a.: ${sample}` : ''}`);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  console.error('--- einde diagnose ---');
}

const nextBin = findNextBin();
if (!nextBin) {
  console.error(
    'Kan `next` niet vinden onder een node_modules-map boven apps/web.',
  );
  logDiagnostics();
  process.exit(1);
}

const nodePath = ancestorNodeModulesRoots()
  .filter((p) => fs.existsSync(p))
  .join(path.delimiter);

const env = {
  ...process.env,
  NODE_PATH: [nodePath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
};

const r = spawnSync(process.execPath, [nextBin, 'build'], { stdio: 'inherit', cwd, env });
process.exit(r.status === null ? 1 : r.status);
