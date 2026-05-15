'use strict';
/** Kopieer www/cm-media/uploads → apps/api/uploads (tijdens build én bij Node-start). */
const fs = require('fs');
const path = require('path');

function countMediaFiles(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => /\.(jpe?g|webp|png|gif)$/i.test(f)).length;
  } catch {
    return 0;
  }
}

function hostingMediaSources(root) {
  const out = [];
  const fromEnv = process.env.MEDIA_SYNC_SOURCE?.trim();
  if (fromEnv) out.push(fromEnv);
  const home = process.env.HOME?.trim();
  if (home) out.push(path.join(home, 'www/cm-media/uploads'));
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
  process.exit(ok ? 0 : 1);
}
