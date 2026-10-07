'use strict';
/**
 * Normaliseer DB_URL/DATABASE_URL voor Railway.
 * - Korte connect_timeout zodat migrate/start niet minuten hangt als Combell MySQL dicht staat.
 * - Dummy URL alleen voor `prisma generate` (heeft geen live DB nodig).
 */

function rawDbUrl() {
  return String(process.env.DB_URL || process.env.DATABASE_URL || '').trim();
}

function withConnectTimeout(url, seconds = 5) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has('connect_timeout')) {
      u.searchParams.set('connect_timeout', String(seconds));
    }
    // Prisma MySQL: socket timeout hints
    if (!u.searchParams.has('socket_timeout')) {
      u.searchParams.set('socket_timeout', String(Math.max(10, seconds * 2)));
    }
    return u.toString();
  } catch {
    if (url.includes('?')) {
      if (/connect_timeout=/i.test(url)) return url;
      return `${url}&connect_timeout=${seconds}`;
    }
    return `${url}?connect_timeout=${seconds}`;
  }
}

function applyDbEnv(opts = {}) {
  const { allowDummyForGenerate = false } = opts;
  let url = rawDbUrl();
  if (!url && allowDummyForGenerate) {
    url = 'mysql://prisma:prisma@127.0.0.1:3306/prisma';
    console.error('[railway-db] geen DB_URL — dummy voor prisma generate');
  }
  if (!url) return '';
  url = withConnectTimeout(url, 5);
  process.env.DB_URL = url;
  process.env.DATABASE_URL = url;
  return url;
}

/** Snelle TCP-check: als Combell remote MySQL dicht is, niet op migrate blijven hangen. */
function canReachMysqlHost(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    let hostname;
    let port = 3306;
    try {
      const u = new URL(url);
      hostname = u.hostname;
      port = Number(u.port || 3306) || 3306;
    } catch {
      resolve(false);
      return;
    }
    const net = require('net');
    const socket = net.connect({ host: hostname, port });
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
  });
}

module.exports = { applyDbEnv, canReachMysqlHost, rawDbUrl, withConnectTimeout };
