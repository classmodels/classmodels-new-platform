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

/** Combell Node-container: persistente data onder /app/shared (zie Combell support). */
function combellContainerMediaDest(root) {
  const sharedUploads = path.join('/app/shared/uploads');
  const sharedRoot = path.join('/app/shared');
  for (const candidate of [sharedUploads, sharedRoot, path.join(root, 'shared', 'uploads'), path.join(root, 'shared')]) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return path.resolve(candidate);
    } catch {
      /**/
    }
  }
  return sharedUploads;
}

/**
 * Absoluut pad waar alle uploads moeten staan (Combell shared hosting).
 * - Expliciet absoluut `MEDIA_ROOT` in env → die map (aangemaakt indien nodig)
 * - Combell-container (HOME=/app): `/app/shared/uploads` (persistent, buiten release)
 * - Anders eerste bestaande hosting-bron
 * - Anders `$HOME/www/cm-media/uploads` (klassieke shared hosting, geen container)
 * - Fallback: `apps/api/uploads` in de repo (alleen voor Docker/dev — niet persistent op Combell-release)
 */
function resolvePersistentMediaDest(root) {
  const raw = process.env.MEDIA_ROOT?.trim();
  if (raw && path.isAbsolute(raw)) {
    const abs = path.resolve(raw);
    const home = process.env.HOME?.trim();
    if (isContainerHome(home) && (raw.includes('/home/') || raw.includes('www/cm-media'))) {
      console.error(
        `[combell] MEDIA_ROOT=${raw} is niet zichtbaar in de Node-container — gebruik /app/shared/uploads (Combell persistent).`,
      );
      return combellContainerMediaDest(root);
    }
    try {
      fs.mkdirSync(abs, { recursive: true });
    } catch {
      /* read-only of rechten */
    }
    return abs;
  }
  if (isContainerHome(process.env.HOME?.trim())) {
    return combellContainerMediaDest(root);
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

/** Pad in de release (niet onder /app/shared-mount) met mediabestanden uit git `shared/uploads`. */
function deployMediaBundlePath(root) {
  return path.resolve(path.join(root, 'apps', 'api', '.deploy-media-bundle', 'uploads'));
}

/**
 * Build-fase: kopieer `shared/uploads` uit de repo naar een bundle in de release
 * (Combell: persistent volume op /app/shared verbergt vaak de git-checkout).
 */
function stageRepoSharedMediaBundle(root) {
  const src = path.resolve(path.join(root, 'shared', 'uploads'));
  const dest = deployMediaBundlePath(root);
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
    console.error('[combell] media bundle: geen shared/uploads in repo — overslaan');
    return false;
  }
  const n = countMediaFiles(src);
  if (n < 1) {
    console.error('[combell] media bundle: shared/uploads is leeg — overslaan');
    return false;
  }
  console.error(`[combell] media bundle: staged ${n} bestanden → ${dest}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
  return true;
}

function richestMediaSource(root) {
  const candidates = [deployMediaBundlePath(root), path.resolve(path.join(root, 'shared', 'uploads'))];
  let best = null;
  let bestCount = 0;
  for (const c of candidates) {
    if (!fs.existsSync(c) || !fs.statSync(c).isDirectory()) continue;
    const n = countMediaFiles(c);
    if (n > bestCount) {
      bestCount = n;
      best = c;
    }
  }
  return { path: best, count: bestCount };
}

/**
 * Start: zet bundle/release-shared op de persistente MEDIA_ROOT-map indien die rijker is.
 */
function migrateDeployMediaBundleToDest(root, dest) {
  const destAbs = path.resolve(dest);
  const { path: src, count: srcCount } = richestMediaSource(root);
  if (!src || srcCount < 1) {
    console.error('[combell] media bundle: geen bron (.deploy-media-bundle of shared/uploads)');
    return { ok: false, srcCount: 0, destCount: countMediaFiles(destAbs), dest: destAbs };
  }
  if (path.resolve(src) === destAbs) {
    return { ok: true, srcCount, destCount: srcCount, dest: destAbs, skipped: true };
  }
  const destCount = countMediaFiles(destAbs);
  const force = String(process.env.COMBELL_FORCE_MEDIA_BUNDLE || '').trim() === '1';
  if (!force && destCount >= srcCount && destCount > 50) {
    console.error(
      `[combell] media bundle: overslaan (doel ${destAbs} heeft al ${destCount} ≥ bron ${srcCount})`,
    );
    return { ok: true, srcCount, destCount, dest: destAbs, skipped: true };
  }
  console.error(`[combell] media bundle: ${src} (${srcCount}) → ${destAbs} (was ${destCount})`);
  fs.mkdirSync(destAbs, { recursive: true });
  fs.cpSync(src, destAbs, { recursive: true, force: true });
  const after = countMediaFiles(destAbs);
  console.error(`[combell] media bundle OK (${after} mediabestanden in MEDIA_ROOT)`);
  return { ok: true, srcCount, destCount: after, dest: destAbs, copied: true };
}

/** Fetch (indien nodig) → stage → migrate naar MEDIA_ROOT. Aanroepen bij build én bij Node-start. */
function bootstrapMediaStorage(root) {
  const fetchScript = path.join(root, 'scripts', 'combell-fetch-shared-media.cjs');
  if (fs.existsSync(fetchScript)) {
    const bundleCount = countMediaFiles(deployMediaBundlePath(root));
    const sharedCount = countMediaFiles(path.join(root, 'shared', 'uploads'));
    if (bundleCount < 100 && sharedCount < 100) {
      const { spawnSync } = require('child_process');
      console.error('[combell] media bootstrap: shared/uploads ophalen van GitHub…');
      spawnSync(process.execPath, [fetchScript], { cwd: root, stdio: 'inherit' });
    }
  }
  stageRepoSharedMediaBundle(root);
  const dest = resolvePersistentMediaDest(root);
  const migrated = migrateDeployMediaBundleToDest(root, dest);
  migrateReleaseUploadsIfNewer(root, dest);
  return { mediaRoot: dest, ...migrated };
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
  stageRepoSharedMediaBundle,
  migrateDeployMediaBundleToDest,
  bootstrapMediaStorage,
  countMediaFiles,
  deployMediaBundlePath,
};

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  bootstrapMediaStorage(root);
  const dest = resolvePersistentMediaDest(root);
  const ok = syncHostingMediaToApp(root, dest);
  if (!ok) {
    console.error(
      '[combell] media sync overgeslagen (www niet bereikbaar tijdens build — ok; sync bij Node-start)',
    );
  }
  process.exit(0);
}
