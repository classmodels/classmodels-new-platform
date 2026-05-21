'use strict';
/**
 * Eén publieke poort (Combell PORT): route op HTTP-Host.
 * - Host begint met `api.` → Nest op interne poort
 * - Anders → Next op interne poort
 *
 * `/__cm_api/*` en GET `/media/*` worden rechtstreeks naar Nest gestuurd (prefix strip),
 * zodat media niet afhangt van Next standalone-rewrites.
 *
 * Combell-deploy: meteen luisteren + warmup. Next moet op tijd reageren (anders exit 1).
 * Nest: `node apps/api/dist/main.js` met NODE_PATH naar monorepo-root (Combell). Crasht Nest, dan
 * blijft de site draaien; API geeft 503 of 502 tot Nest luistert.
 */
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const { runCombellDbSetup } = require('./combell-prisma-deploy.cjs');
const { syncHostingMediaToApp, resolvePersistentMediaDest, bootstrapMediaStorage } =
  require('./combell-sync-media-uploads.cjs');

const root = path.join(__dirname, '..');
const publicPort = parseInt(process.env.PORT || '3000', 10);
const maxBootMs = parseInt(process.env.COMBELL_DUAL_BOOT_MS || '180000', 10);
const strictNest = String(process.env.COMBELL_DUAL_STRICT_NEST || '').trim() === '1';
/** Grote ZIP-uploads (tot ~6 GB): lange request-timeout op proxy + upstream. */
const uploadTimeoutMs = parseInt(process.env.COMBELL_UPLOAD_TIMEOUT_MS || '7200000', 10);

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
function resolveNestMain() {
  const candidates = [
    path.join(apiDir, 'dist', 'src', 'main.js'),
    path.join(apiDir, 'dist', 'main.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}
const nestMain = resolveNestMain();
const webDir = path.join(root, 'apps', 'web');
const webStart = path.join(webDir, 'start.cjs');

let proxyReady = false;
let nestLive = false;
let nestSpawnCount = 0;
const NEST_MAX_SPAWNS = 10;
const NEST_RESTART_DELAY_MS = 5000;

/** `/__cm_api/catalog/models` → `/catalog/models` (Nest kent geen `__cm_api`-prefix). */
function stripCmApiProxyPrefix(urlPath) {
  const raw = urlPath || '/';
  const q = raw.indexOf('?');
  const pathname = q === -1 ? raw : raw.slice(0, q);
  const search = q === -1 ? '' : raw.slice(q);
  if (!pathname.startsWith('/__cm_api')) return raw;
  let stripped = pathname.slice('/__cm_api'.length);
  if (!stripped || stripped === '') stripped = '/';
  else if (!stripped.startsWith('/')) stripped = `/${stripped}`;
  return stripped + search;
}

function forward(req, res, port) {
  const headers = { ...req.headers };
  headers.host = `127.0.0.1:${port}`;
  const pathOut = port === nestPort ? stripCmApiProxyPrefix(req.url || '/') : req.url;
  const opts = {
    protocol: 'http:',
    hostname: '127.0.0.1',
    port,
    method: req.method,
    path: pathOut || '/',
    headers,
  };
  const p = http.request(opts, (pr) => {
    res.writeHead(pr.statusCode || 502, pr.headers);
    pr.pipe(res);
  });
  p.setTimeout(uploadTimeoutMs, () => {
    p.destroy(new Error('upstream timeout'));
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
      CM_API_INTERNAL_URL: `http://127.0.0.1:${nestPort}`,
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

function ancestorNodeModulesPaths(startDir) {
  const paths = [];
  let dir = startDir;
  for (let i = 0; i < 14; i++) {
    const nm = path.join(dir, 'node_modules');
    if (fs.existsSync(nm)) paths.push(nm);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return paths;
}

function nestChildEnv() {
  const nodePaths = [...ancestorNodeModulesPaths(apiDir), ...ancestorNodeModulesPaths(root)];
  const unique = [...new Set(nodePaths)];
  const nodePath = [...unique, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
  return {
    ...process.env,
    NODE_PATH: nodePath,
    API_HOST: '127.0.0.1',
    API_PORT: String(nestPort),
    COMBELL_HOST_ROUTER: '0',
  };
}

function spawnNestOnce() {
  if (!fs.existsSync(nestMain)) {
    console.error('[combell-dual] Nest build ontbreekt (verwacht na pipeline build):', nestMain);
    return false;
  }
  nestSpawnCount += 1;
  if (nestSpawnCount > NEST_MAX_SPAWNS) {
    console.error('[combell-dual] nest: max herstarts bereikt; controleer DB_URL en logs.');
    return false;
  }
  console.error(
    `[combell-dual] nest start poging ${nestSpawnCount}/${NEST_MAX_SPAWNS} → node dist/main.js :${nestPort}`,
  );
  const child = spawn(process.execPath, [nestMain], {
    cwd: apiDir,
    stdio: 'inherit',
    env: nestChildEnv(),
  });
  child.on('error', (err) => {
    console.error('[combell-dual] nest spawn error:', err);
    nestLive = false;
    setTimeout(() => spawnNestOnce(), NEST_RESTART_DELAY_MS);
  });
  child.on('exit', (code, signal) => {
    nestLive = false;
    console.error(`[combell-dual] nest gestopt (code=${code} signal=${signal})`);
    if (nestSpawnCount < NEST_MAX_SPAWNS) {
      console.error(`[combell-dual] nest herstart over ${NEST_RESTART_DELAY_MS / 1000}s…`);
      setTimeout(() => spawnNestOnce(), NEST_RESTART_DELAY_MS);
    }
  });
  return true;
}

function spawnNest() {
  nestSpawnCount = 0;
  return spawnNestOnce();
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
  /** Same-origin `/__cm_api` (alle methodes) → Nest; `forward` strip het prefix. */
  if (pathOnly.startsWith('/__cm_api/') || pathOnly === '/__cm_api') {
    return true;
  }
  /** Media op www zonder proxy-prefix (GET publiek; POST grote uploads rechtstreeks naar Nest). */
  if (pathOnly.startsWith('/media/')) {
    if (req.method === 'GET' || req.method === 'HEAD') return true;
    if (
      req.method === 'POST' &&
      (pathOnly === '/media/upload' ||
        pathOnly === '/media/upload-zip' ||
        pathOnly.startsWith('/media/upload'))
    ) {
      return true;
    }
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

  runCombellDbSetup(root);
  const boot = bootstrapMediaStorage(root);
  const mediaRoot = boot.mediaRoot || resolvePersistentMediaDest(root);
  process.env.MEDIA_ROOT = mediaRoot;
  console.error(
    `[combell-dual] MEDIA_ROOT=${mediaRoot} (bron ${boot.srcCount ?? '?'} → schijf ${boot.destCount ?? '?'})`,
  );
  syncHostingMediaToApp(root, mediaRoot);

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

  const pathOnly = String(req.url || '').split('?')[0];
  const isHealthProbe = pathOnly === '/health' || pathOnly.startsWith('/health/');
  const toNest = shouldRouteToNest(req);
  /** `/health` altijd doorsturen: zo zie je echte API-response of 502; geen blokkade op `nestLive`. */
  if (toNest && !nestLive && !isHealthProbe) {
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        error: 'api_not_ready',
        message: 'De API start nog op of kon niet opstarten. Controleer DB_URL en serverlogs.',
      }),
    );
    return;
  }
  forward(req, res, toNest ? nestPort : webPort);
});

server.requestTimeout = uploadTimeoutMs;
server.headersTimeout = uploadTimeoutMs + 60_000;
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
