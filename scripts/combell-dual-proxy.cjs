'use strict';
/**
 * Eén publieke poort (Combell PORT): route op HTTP-Host.
 * - Host begint met `api.` → Nest op NEST_INTERNAL_PORT (default 4000)
 * - Anders → Next op WEB_INTERNAL_PORT (default 3001)
 *
 * COMBELL: luister **onmiddellijk** op PORT met 200 voor GET/HEAD (warmup), zodat de
 * deploy-probe niet faalt terwijl Next/Nest nog opstarten.
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const publicPort = parseInt(process.env.PORT || '3000', 10);
const nestPort = parseInt(process.env.NEST_INTERNAL_PORT || '4000', 10);
const webPort = parseInt(process.env.WEB_INTERNAL_PORT || '3001', 10);
const maxBootMs = parseInt(process.env.COMBELL_DUAL_BOOT_MS || '120000', 10);

let proxyReady = false;

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

function hostToNest(hostRaw) {
  const host = (hostRaw || '').split(':')[0].toLowerCase().trim();
  return (
    host === 'api.class-models.be' ||
    host.startsWith('api.') ||
    host.startsWith('www.api.')
  );
}

async function bootBackends() {
  spawnChild('nest', 'npm', ['run', 'start', '-w', '@cm/api'], {
    API_HOST: '127.0.0.1',
    API_PORT: String(nestPort),
    /** Anders start apps/web/start.cjs opnieuw een proxy (zelfde env als parent). */
    COMBELL_HOST_ROUTER: '0',
  });

  spawnChild('next', 'npm', ['run', 'start', '-w', '@cm/web'], {
    PORT: String(webPort),
    COMBELL_HOST_ROUTER: '0',
  });

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

  proxyReady = true;
  console.error('[combell-dual] proxy routeert nu naar Next en Nest');
}

const server = http.createServer((req, res) => {
  if (!proxyReady) {
    if (req.method === 'GET' || req.method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      if (req.method === 'GET') res.end('OK');
      else res.end();
      return;
    }
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Nog aan het opstarten');
    return;
  }

  const host = (req.headers.host || '').split(':')[0].toLowerCase().trim();
  const toNest = hostToNest(host);
  forward(req, res, toNest ? nestPort : webPort);
});

server.listen(publicPort, '0.0.0.0', () => {
  console.error(
    `[combell-dual] luistert op 0.0.0.0:${publicPort} (warmup → Nest :${nestPort}, Next :${webPort})`,
  );
  void bootBackends().catch((e) => {
    console.error('[combell-dual]', e);
    process.exit(1);
  });
});
