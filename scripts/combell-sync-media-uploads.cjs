'use strict';
/**
 * Combell: alle mediabestanden horen op een **persistente** map (buiten de git-release),
 * typisch `$HOME/www/cm-media/uploads`. De API schrijft daarheen via `MEDIA_ROOT`.
 *
 * Dit script:
 * - Bepaalt die map (`resolvePersistentMediaDest`)
 * - Migreert eenmalig bestanden uit `apps/api/uploads` in de release als de persistente map leeg is
 * - Kopieert van oudere bronnen (MEDIA_SYNC_SOURCE, hosting-paden) naar die map als de doelmap
 *   nog weinig bevat t.o.v. de bron (zelfde logica als vroeger, maar doel = persistent)
 */
const fs = require('fs');
const path = require('path');

/** Telt bestanden recursief (cap tegen enorme bomen). */
function countMediaFiles(dir) {
  let n = 0;
  const max = 20000;
  function walk(d) {
    if (n >= max) return;
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      try {
        if (e.isDirectory()) walk(p);
        else if (e.isFile()) {
          n += 1;
          if (n >= max) return;
        }
      } catch {
        /* symlink / rechten */
      }
    }
  }
  try {
    walk(dir);
  } catch {
    return 0;
  }
  return n;
}

function isContainerHome(home) {
  if (!home) return true;
  const h = home.replace(/\\/g, '/').replace(/\/+$/, '');
  return h === '/app' || h.endsWith('/app');
}

function hostingMediaSources(root) {
  const out = [];
  const fromEnv = process.env.MEDIA_SYNC_SOURCE?.trim();
  if (fromEnv) out.push(fromEnv);
  const home = process.env.HOME?.trim();
  if (home && !isContainerHome(home)) out.push(path.join(home, 'www/cm-media/uploads'));
  const user = process.env.USER?.trim();
  if (user) out.push(path.join('/home', user, 'www/cm-media/uploads'));
  out.push('/home/ID460044/www/cm-media/uploads');
  out.push(path.join(root, 'www/cm-media/uploads'));
  out.push(path.join(root, '..', 'www', 'cm-media', 'uploads'));
  out.push(path.join(root, '..', '..', 'www', 'cm-media', 'uploads'));
  return [...new Set(out)];
}

/**
 * Absoluut pad waar alle uploads moeten staan (Combell shared hosting).
 * - Expliciet absoluut `MEDIA_ROOT` in env → die map (aangemaakt indien nodig)
 * - Anders eerste bestaande hosting-bron
 * - Anders `$HOME/www/cm-media/uploads` (bestaand of nieuw in production / COMBELL_RESOLVE_MEDIA_HOME=1)
 * - Fallback: `apps/api/uploads` in de repo (alleen voor Docker/dev — niet persistent op Combell-release)
 */
function resolvePersistentMediaDest(root) {
  const raw = process.env.MEDIA_ROOT?.trim();
  if (raw && path.isAbsolute(raw)) {
    const abs = path.resolve(raw);
    try {
      fs.mkdirSync(abs, { recursive: true });
    } catch {
      /* read-only of rechten */
    }
    return abs;
  }
  for (const candidate of hostingMediaSources(root)) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return path.resolve(candidate);
      }
    } catch {
      /**/
    }
  }
  const home = process.env.HOME?.trim();
  if (home && !isContainerHome(home)) {
    const ensured = path.resolve(path.join(home, 'www', 'cm-media', 'uploads'));
    try {
      if (fs.existsSync(ensured) && fs.statSync(ensured).isDirectory()) {
        return ensured;
      }
    } catch {
      /**/
    }
    const allowHomeCreate =
      process.env.NODE_ENV === 'production' || String(process.env.COMBELL_RESOLVE_MEDIA_HOME || '').trim() === '1';
    if (allowHomeCreate) {
      try {
        fs.mkdirSync(ensured, { recursive: true });
      } catch {
        /**/
      }
      return ensured;
    }
  }
  return path.resolve(path.join(root, 'apps', 'api', 'uploads'));
}

/**
 * Als er nog bestanden in de release-map staan maar de persistente map leeg is,
 * éénmalig kopiëren (herstel na verkeerde MEDIA_ROOT-config).
 */
function migrateReleaseUploadsIfNewer(root, dest) {
  const ephemeral = path.resolve(path.join(root, 'apps', 'api', 'uploads'));
  const destAbs = path.resolve(dest);
  if (ephemeral === destAbs) return;
  const eCount = countMediaFiles(ephemeral);
  const pCount = countMediaFiles(destAbs);
  if (eCount > 0 && pCount === 0) {
    console.error(`[combell] media: migreren ${eCount} bestanden uit release-map → ${destAbs}`);
    fs.mkdirSync(destAbs, { recursive: true });
    fs.cpSync(ephemeral, destAbs, { recursive: true, force: true });
  }
}

/**
 * Kopieer van de “rijkste” bron naar `dest` (persistente map), tenzij dest al voldoende gevuld is.
 */
function syncHostingMediaToApp(root, destArg) {
  const dest = destArg ? path.resolve(destArg) : resolvePersistentMediaDest(root);
  let src = null;
  let srcCount = 0;
  for (const candidate of hostingMediaSources(root)) {
    const c = path.resolve(candidate);
    if (c === dest) continue;
    const n = countMediaFiles(c);
    if (n > srcCount) {
      src = c;
      srcCount = n;
    }
  }
  if (!src || srcCount < 1) {
    console.error('[combell] media sync: geen bron met bestanden (optioneel MEDIA_SYNC_SOURCE)');
    return false;
  }
  const destCount = countMediaFiles(dest);
  if (destCount >= srcCount && destCount > 50) {
    console.error(`[combell] media sync: overslaan (doel ${dest} heeft al ${destCount} mediabestanden)`);
    return true;
  }
  console.error(`[combell] media sync: ${src} (${srcCount}) → ${dest}`);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.error(`[combell] media sync OK (${countMediaFiles(dest)} mediabestanden in doel)`);
  return true;
}

module.exports = {
  syncHostingMediaToApp,
  resolvePersistentMediaDest,
  migrateReleaseUploadsIfNewer,
};

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const dest = resolvePersistentMediaDest(root);
  migrateReleaseUploadsIfNewer(root, dest);
  const ok = syncHostingMediaToApp(root, dest);
  if (!ok) {
    console.error(
      '[combell] media sync overgeslagen (www niet bereikbaar tijdens build — ok; sync bij Node-start)',
    );
  }
  process.exit(0);
}
