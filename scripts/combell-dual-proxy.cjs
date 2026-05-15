'use strict';
/**
 * Eén publieke poort (Combell PORT): route op HTTP-Host.
 * - Host begint met `api.` → Nest op interne poort
 * - Anders → Next op interne poort
 *
 * Combell-deploy: meteen luisteren + warmup. Next moet op tijd reageren (anders exit 1).
 * Nest: start met `node dist/main.js` (geen `npm`-subproces). Als Nest crasht of /health uitblijft,
 * blijft het proces draaien (website werkt) — deploy kan alsnog slagen; API geeft 503 tot Nest ok is.
 */
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const publicPort = parseInt(process.env.PORT || '3000', 10);
const maxBootMs = parseInt(process.env.COMBELL_DUAL_BOOT_MS || '180000', 10);
const strictNest = String(process.env.COMBELL_DUAL_STRICT_NEST || '').trim() === '1';

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

const apiDir = path.join(root, 'apps', 'api');
const nestMain = path.join(apiDir, 'dist', 'main.js');
const webDir = path.join(root, 'apps', 'web');
const webStart = path.join(webDir, 'start.cjs');

let proxyReady = false;
let nestLive = false;

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

function spawnNext() {
  const child = spawn(process.execPath, [webStart], {
    cwd: webDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(webPort),
      COMBELL_HOST_ROUTER: '0',
    },
  });
  child.on('error', (err) => {
    console.error('[combell-dual] next spawn error:', err);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    console.error(`[combell-dual] next gestopt (code=${code} signal=${signal})`);
    process.exit(code ?? 1);
  });
  return child;
}

function spawnNest() {
  if (!fs.existsSync(nestMain)) {
    console.error('[combell-dual] Nest build ontbreekt (verwacht na pipeline build):', nestMain);
    return false;
  }
  const child = spawn(process.execPath, [nestMain], {
    cwd: apiDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      API_HOST: '127.0.0.1',
      API_PORT: String(nestPort),
      COMBELL_HOST_ROUTER: '0',
    },
  });
  child.on('error', (err) => {
    console.error('[combell-dual] nest spawn error (website blijft draaien):', err);
  });
  child.on('exit', (code, signal) => {
    nestLive = false;
    console.error(`[combell-dual] nest gestopt (code=${code} signal=${signal}) — API tijdelijk onbereikbaar`);
  });
  return true;
}

function stripFirstHost(h) {
  return String(h || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();
}

/** Combell/proxy zet vaak de echte host in X-Forwarded-Host; `Host` is dan localhost of intern. */
function effectiveHost(req) {
  const xf = stripFirstHost(req.headers['x-forwarded-host']);
  if (xf) return xf;
  const xo = stripFirstHost(req.headers['x-original-host']);
  if (xo) return xo;
  return stripFirstHost(req.headers.host);
}

const extraApiHosts = String(process.env.COMBELL_API_PUBLIC_HOSTS || '')
  .split(',')
  .map((s) => stripFirstHost(s))
  .filter(Boolean);

function hostToNest(hostRaw) {
  const host = stripFirstHost(hostRaw);
  if (!host) return false;
  if (extraApiHosts.includes(host)) return true;
  return (
    host === 'api.class-models.be' ||
    host.startsWith('api.') ||
    host.startsWith('www.api.')
  );
}

/** API-paden of api.* host → Nest (niet Next, anders 404 op /health). */
function shouldRouteToNest(req) {
  const pathOnly = String(req.url || '').split('?')[0];
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    (pathOnly === '/health' || pathOnly.startsWith('/health/'))
  ) {
    return true;
  }
  return hostToNest(effectiveHost(req));
}

async function waitNestHealthBackground() {
  try {
    await waitGet(nestPort, '/health', (c) => c === 200 || c === 204);
    nestLive = true;
    console.error('[combell-dual] Nest /health reageert');
  } catch (e) {
    console.error('[combell-dual] Nest /health binnen timeout niet ok:', e.message || e);
    console.error('[combell-dual] Website blijft actief; herstel DB_URL/env en herstart of wacht.');
  }
}

async function bootBackends() {
  console.error(
    `[combell-dual] publiek PORT=${publicPort}, intern Nest=${nestPort}, intern Next=${webPort}, strictNest=${strictNest}`,
  );

  const hadNest = spawnNest();
  spawnNext();

  try {
    await waitGet(webPort, '/', (c) => c < 500);
    console.error('[combell-dual] Next (intern) reageert');
  } catch (e) {
    console.error('[combell-dual] Next start niet op tijd:', e.message || e);
    process.exit(1);
  }

  if (strictNest) {
    if (!hadNest) {
      console.error('[combell-dual] strictNest maar geen Nest build.');
      process.exit(1);
    }
    try {
      await waitGet(nestPort, '/health', (c) => c === 200 || c === 204);
      nestLive = true;
      console.error('[combell-dual] Nest /health reageert (strict)');
    } catch (e) {
      console.error('[combell-dual] Nest strict: gestopt.', e.message || e);
      process.exit(1);
    }
  } else if (hadNest) {
    void waitNestHealthBackground();
  }

  proxyReady = true;
  console.error('[combell-dual] proxy routeert (API pas live na /health)');
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

  const toNest = shouldRouteToNest(req);
  if (toNest && !nestLive) {
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        error: 'api_not_ready',
        message: 'De API start nog op of kon niet opstarten. Controleer Combell logs en DB_URL.',
      }),
    );
    return;
  }
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
