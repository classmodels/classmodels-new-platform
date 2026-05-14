'use strict';
/**
 * Eén publieke poort (Combell PORT): route op HTTP-Host.
 * - Host begint met `api.` → Nest op NEST_INTERNAL_PORT (default 4000)
 * - Anders → Next op WEB_INTERNAL_PORT (default 3001)
 *
 * Zet in Combell o.a.: COMBELL_HOST_ROUTER=1 (en laat npm start dit script uitvoeren).
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const publicPort = parseInt(process.env.PORT || '3000', 10);
const nestPort = parseInt(process.env.NEST_INTERNAL_PORT || '4000', 10);
const webPort = parseInt(process.env.WEB_INTERNAL_PORT || '3001', 10);
const maxBootMs = parseInt(process.env.COMBELL_DUAL_BOOT_MS || '120000', 10);

function forward(req, res, port) {
  const headers = { ...req.headers };
  headers.host = `127.0.0.1:${port}`;
  const opts = {
    protocol: 'http:',
    hostname: '127.0.0.1',
    port,
    method: req.method,
    path: req.url,
    headers,
  };
  const p = http.request(opts, (pr) => {
    res.writeHead(pr.statusCode || 502, pr.headers);
    pr.pipe(res);
  });
  p.on('error', (e) => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Upstream fout (${port}): ${e.message}`);
  });
  req.pipe(p);
}

function waitGet(port, pth, ok) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + maxBootMs;
    const tryOnce = () => {
      const r = http.get(`http://127.0.0.1:${port}${pth}`, (res) => {
        res.resume();
        if (ok(res.statusCode)) return resolve();
        if (Date.now() > deadline) return reject(new Error(`Timeout wachten op :${port}${pth}`));
        setTimeout(tryOnce, 400);
      });
      r.on('error', () => {
        if (Date.now() > deadline) return reject(new Error(`Timeout wachten op :${port}${pth}`));
        setTimeout(tryOnce, 400);
      });
    };
    tryOnce();
  });
}

function spawnChild(name, cmd, args, extraEnv) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  child.on('exit', (code, signal) => {
    console.error(`[combell-dual] ${name} gestopt (code=${code} signal=${signal})`);
    process.exit(code ?? 1);
  });
  return child;
}

async function main() {
  console.error(
    `[combell-dual] start Nest :${nestPort}, Next :${webPort}, luisteraar :${publicPort} (Host api.* → Nest)`,
  );

  spawnChild('nest', 'npm', ['run', 'start', '-w', '@cm/api'], {
    API_HOST: '127.0.0.1',
    API_PORT: String(nestPort),
  });

  spawnChild('next', 'npm', ['run', 'start', '-w', '@cm/web'], {
    PORT: String(webPort),
  });

  // Next eerst: Combell deploy-check raakt vaak de site (/) aan vóór de API.
  try {
    await waitGet(webPort, '/', (c) => c < 500);
    console.error('[combell-dual] Next (intern) reageert');
  } catch (e) {
    console.error('[combell-dual] Next start niet op tijd:', e.message || e);
    process.exit(1);
  }
  try {
    await waitGet(nestPort, '/health', (c) => c === 200 || c === 204);
    console.error('[combell-dual] Nest /health reageert');
  } catch (e) {
    console.error('[combell-dual] Nest start niet op tijd:', e.message || e);
    console.error('[combell-dual] Controleer DB_URL, JWT_SECRET, CORS_ORIGIN in Combell env.');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    const host = (req.headers.host || '').split(':')[0].toLowerCase().trim();
    const toNest =
      host === 'api.class-models.be' ||
      host.startsWith('api.') ||
      host.startsWith('www.api.');
    forward(req, res, toNest ? nestPort : webPort);
  });

  server.listen(publicPort, '0.0.0.0', () => {
    console.error(`[combell-dual] proxy luistert op 0.0.0.0:${publicPort}`);
  });
}

main().catch((e) => {
  console.error('[combell-dual]', e);
  process.exit(1);
});
