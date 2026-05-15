'use strict';
/** Kopieer www/cm-media/uploads → apps/api/uploads (Node ziet www vaak niet op runtime). */
const fs = require('fs');
const path = require('path');

function hasMediaFiles(dir) {
  try {
    return fs.readdirSync(dir).some((f) => /\.(jpe?g|webp|png|gif)$/i.test(f));
  } catch {
    return false;
  }
}

function hostingMediaSources(root) {
  const home = process.env.HOME?.trim();
  const out = [];
  if (home) out.push(path.join(home, 'www/cm-media/uploads'));
  const user = process.env.USER?.trim();
  if (user) out.push(path.join('/home', user, 'www/cm-media/uploads'));
  out.push(path.join(root, 'www/cm-media/uploads'));
  out.push(path.join(root, '..', 'www', 'cm-media', 'uploads'));
  out.push(path.join(root, '..', '..', 'www', 'cm-media', 'uploads'));
  return [...new Set(out)];
}

function syncHostingMediaToApp(root) {
  const dest = path.join(root, 'apps', 'api', 'uploads');
  let src = null;
  for (const candidate of hostingMediaSources(root)) {
    if (hasMediaFiles(candidate)) {
      src = candidate;
      break;
    }
  }
  if (!src) {
    console.error('[combell] media sync: geen bron met bestanden (www/cm-media/uploads)');
    return false;
  }
  if (hasMediaFiles(dest)) {
    try {
      const srcN = fs.readdirSync(src).length;
      const destN = fs.readdirSync(dest).length;
      if (destN >= srcN && destN > 50) {
        console.error(`[combell] media sync: overslaan (doel heeft al ${destN} items)`);
        return true;
      }
    } catch {
      /* doorgaan met sync */
    }
  }
  console.error(`[combell] media sync: ${src} → ${dest}`);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
  const n = fs.readdirSync(dest).length;
  console.error(`[combell] media sync OK (${n} items in doel)`);
  return true;
}

module.exports = { syncHostingMediaToApp };
