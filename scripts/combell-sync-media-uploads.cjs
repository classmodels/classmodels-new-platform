'use strict';
/** Kopieer www/cm-media/uploads → apps/api/uploads (tijdens build én bij Node-start). */
const fs = require('fs');
const path = require('path');

/** Telt bestanden recursief (cap tegen enorme bomen). Zo worden o.a. mp4 en nested uploads meeteld voor bronkeuze. */
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

function hostingMediaSources(root) {
  const out = [];
  const fromEnv = process.env.MEDIA_SYNC_SOURCE?.trim();
  if (fromEnv) out.push(fromEnv);
  const home = process.env.HOME?.trim();
  const isContainerHome = home && (home.replace(/\\/g, '/').replace(/\/+$/, '') === '/app' || home.endsWith('/app'));
  if (home && !isContainerHome) out.push(path.join(home, 'www/cm-media/uploads'));
  const user = process.env.USER?.trim();
  if (user) out.push(path.join('/home', user, 'www/cm-media/uploads'));
  out.push('/home/ID460044/www/cm-media/uploads');
  out.push(path.join(root, 'www/cm-media/uploads'));
  out.push(path.join(root, '..', 'www', 'cm-media', 'uploads'));
  out.push(path.join(root, '..', '..', 'www', 'cm-media', 'uploads'));
  return [...new Set(out)];
}

function syncHostingMediaToApp(root) {
  const dest = path.join(root, 'apps', 'api', 'uploads');
  let src = null;
  let srcCount = 0;
  for (const candidate of hostingMediaSources(root)) {
    const n = countMediaFiles(candidate);
    if (n > srcCount) {
      src = candidate;
      srcCount = n;
    }
  }
  if (!src || srcCount < 1) {
    console.error('[combell] media sync: geen bron met bestanden (probeer MEDIA_SYNC_SOURCE)');
    return false;
  }
  const destCount = countMediaFiles(dest);
  if (destCount >= srcCount && destCount > 50) {
    console.error(`[combell] media sync: overslaan (doel heeft al ${destCount} mediabestanden)`);
    return true;
  }
  console.error(`[combell] media sync: ${src} (${srcCount}) → ${dest}`);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.error(`[combell] media sync OK (${countMediaFiles(dest)} mediabestanden in doel)`);
  return true;
}

module.exports = { syncHostingMediaToApp };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const ok = syncHostingMediaToApp(root);
  if (!ok) {
    console.error(
      '[combell] media sync overgeslagen (www niet bereikbaar tijdens build — ok; sync bij Node-start)',
    );
  }
  process.exit(0);
}
