'use strict';
/**
 * Eén publieke poort (Combell PORT): route op HTTP-Host.
 * - Host begint met `api.` → Nest op interne poort
 * - Anders → Next op interne poort
 *
 * Luistert meteen op PORT (warmup 200) zodat deploy-probes niet falen.
 * Interne Nest/Web-poorten mogen nooit gelijk zijn aan de publieke PORT (Combell gebruikt vaak 3000/4000/8080).
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const publicPort = parseInt(process.env.PORT || '3000', 10);
const maxBootMs = parseInt(process.env.COMBELL_DUAL_BOOT_MS || '180000', 10);

const taken = new Set([publicPort]);
function pickPort(envKey, fallback) {
  let p = parseInt(String(process.env[envKey] || '').trim(), 10);
  if (!Number.isFinite(p) || p < 1 || p > 65535) p = fallback;
  while (taken.has(p)) p += 1;
  taken.add(p);
  return p;
}

const nestPort = pickPort('NEST_INTERNAL_PORT', 4000);
const webPort = pickPort('WEB_INTERNAL_PORT', 3001);

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

function spawnChild(name, npmArgs, extraEnv) {
  const child = spawn('npm', npmArgs, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: true,
  });
  child.on('error', (err) => {
    console.error(`[combell-dual] ${name} spawn error:`, err);
    process.exit(1);
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
  console.error(
    `[combell-dual] publiek PORT=${publicPort}, intern Nest=${nestPort}, intern Next=${webPort}, boot max ${maxBootMs}ms`,
  );

  spawnChild('nest', ['run', 'start', '-w', '@cm/api'], {
    API_HOST: '127.0.0.1',
    API_PORT: String(nestPort),
    COMBELL_HOST_ROUTER: '0',
  });

  spawnChild('next', ['run', 'start', '-w', '@cm/web'], {
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
    console.error('[combell-dual] Controleer DB_URL en overige API-env in Combell.');
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

server.on('error', (err) => {
  console.error('[combell-dual] HTTP-server fout:', err);
  process.exit(1);
});

server.listen(publicPort, '0.0.0.0', () => {
  console.error(`[combell-dual] luistert op 0.0.0.0:${publicPort} (warmup actief)`);
  void bootBackends().catch((e) => {
    console.error('[combell-dual]', e);
    process.exit(1);
  });
});
