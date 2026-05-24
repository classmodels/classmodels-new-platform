import { accessSync, constants, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import type { Dirent } from 'fs';
import { homedir } from 'os';
import { isAbsolute, join, resolve } from 'path';

/**
 * Root-.env gebruikt vaak MEDIA_ROOT=./apps/api/uploads (t.o.v. monorepo-root).
 * Nest draait met cwd apps/api → {cwd}/uploads.
 *
 * **Productie / CI:** zet `MEDIA_ROOT` op een **persistente** map (volume of bv.
 * `www/cm-media/uploads` op Combell). Als die variabele gezet is, wint die altijd —
 * ook als de map nog leeg is — zodat uploads niet terugvallen op een verse release-map.
 */
function isImageName(name: string): boolean {
  return /\.(jpe?g|webp|png|gif)$/i.test(name);
}

/** Telt afbeeldingen tot `maxDepth` mappen diep (Combell: soms jaar-/maandmappen). */
export function countMediaFilesShallow(dir: string, maxDepth = 2): number {
  let n = 0;
  const walk = (d: string, depth: number) => {
    if (n > 15000) return;
    let entries: Dirent[];
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.isFile() && isImageName(ent.name)) n += 1;
      else if (ent.isDirectory() && depth < maxDepth) walk(join(d, ent.name), depth + 1);
    }
  };
  try {
    walk(dir, 0);
  } catch {
    return 0;
  }
  return n;
}

function hostingHome(): string | undefined {
  const home = process.env.HOME?.trim() || homedir();
  return home || undefined;
}

/** Combell-container: HOME=/app — geen echte hosting-www; www/cm-media bestaat daar niet. */
function isContainerAppHome(home: string | undefined): boolean {
  if (!home) return false;
  const h = home.replace(/\\/g, '/').replace(/\/+$/, '');
  return h === '/app' || h.endsWith('/app');
}

/** Combell data-site pad (deelt de 100 GB webhosting-quota, niet de kleine /app/shared-container). */
export function combellDataSiteUploadsCandidates(): string[] {
  const out: string[] = [];
  const explicit = process.env.CM_COMBELL_DATA_UPLOADS?.trim();
  if (explicit) out.push(explicit);
  const siteUser = process.env.CM_COMBELL_SITE_USER?.trim() || 'class-modelsbe';
  out.push(`/data/sites/web/${siteUser}/www/cm-media/uploads`);
  out.push('/data/sites/web/class-modelsbe/www/cm-media/uploads');
  return [...new Set(out.map((p) => p.replace(/\\/g, '/').replace(/\/+/g, '/')))];
}

/**
 * Alle plekken waar mediabestanden op Combell kunnen staan.
 * File Manager toont vaak map `data/` (niet `www/cm-media/uploads`).
 * Node-container gebruikt vaak `/app/shared/uploads` (niet zichtbaar in File Manager).
 */
export function combellHostingDiscoveryPaths(): string[] {
  const out: string[] = [];
  const explicit = process.env.CM_COMBELL_DATA_UPLOADS?.trim();
  if (explicit) out.push(explicit);
  const siteUser = process.env.CM_COMBELL_SITE_USER?.trim() || 'class-modelsbe';
  const base = `/data/sites/web/${siteUser}`;
  out.push(
    `${base}/data`,
    `${base}/data/uploads`,
    `${base}/www/cm-media/uploads`,
    `${base}/shared/uploads`,
    '/data/sites/web/class-modelsbe/data',
    '/data/sites/web/class-modelsbe/data/uploads',
    '/data/sites/web/class-modelsbe/www/cm-media/uploads',
    '/app/shared/uploads',
    '/app/shared',
  );
  const home = hostingHome();
  if (home && !isContainerAppHome(home)) {
    out.push(join(home, 'data'), join(home, 'www', 'cm-media', 'uploads'));
  }
  const sync = process.env.MEDIA_SYNC_SOURCE?.trim();
  if (sync) out.push(sync);
  return [...new Set(out.map((p) => p.replace(/\\/g, '/').replace(/\/+/g, '/')))];
}

/** Bestaande mappen uit discovery-lijst. */
export function existingHostingDiscoveryPaths(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of combellHostingDiscoveryPaths()) {
    const dir = raw.replace(/\/+$/, '') || raw;
    if (seen.has(dir)) continue;
    try {
      if (existsSync(dir) && statSync(dir).isDirectory()) {
        seen.add(dir);
        out.push(dir);
      }
    } catch {
      /**/
    }
  }
  return out;
}

function countFilesWithExt(dir: string, extRe: RegExp, maxDepth = 3): number {
  let n = 0;
  const walk = (d: string, depth: number) => {
    if (n > 20000 || depth > maxDepth) return;
    let entries: Dirent[];
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (n > 20000) return;
      const p = join(d, ent.name);
      if (ent.isFile() && extRe.test(ent.name)) n += 1;
      else if (ent.isDirectory()) walk(p, depth + 1);
    }
  };
  try {
    walk(dir, 0);
  } catch {
    return 0;
  }
  return n;
}

export function inventoryHostingMediaPaths(maxDepth = 3): Array<{
  dir: string;
  exists: boolean;
  writable: boolean;
  imageFiles: number;
  jpgFiles: number;
}> {
  return combellHostingDiscoveryPaths().map((dir) => {
    let exists = false;
    let writable = false;
    let imageFiles = 0;
    let jpgFiles = 0;
    try {
      exists = existsSync(dir) && statSync(dir).isDirectory();
      if (exists) {
        writable = tryWritableMediaDir(dir);
        imageFiles = countMediaFilesShallow(dir, maxDepth);
        jpgFiles = countFilesWithExt(dir, /\.(jpe?g)$/i, maxDepth);
      }
    } catch {
      /**/
    }
    return { dir, exists, writable, imageFiles, jpgFiles };
  });
}

function isCombellDataSiteMediaPath(p: string): boolean {
  const n = p.replace(/\\/g, '/');
  return n.includes('/data/sites/web/') && n.includes('cm-media');
}

/** Test of map bestaat en schrijfbaar is (korte write-test). */
export function tryWritableMediaDir(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true });
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
    accessSync(dir, constants.W_OK);
    const probe = join(dir, `.cm-write-probe-${process.pid}`);
    writeFileSync(probe, '1');
    unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

/** Vrije bytes op het filesystem van `dir` (null als onbekend). */
export function mediaDirFreeBytes(dir: string): number | null {
  try {
    const { statfsSync } = require('node:fs') as typeof import('fs');
    const s = statfsSync(dir);
    return Number(s.bfree) * Number(s.bsize);
  } catch {
    return null;
  }
}

/** Persistent uploads: alle bekende hosting-paden + container /app/shared. */
function combellContainerMediaDirs(): string[] {
  return combellHostingDiscoveryPaths();
}

/** Combell-fout: absolute pad `/www/cm-media/uploads` (zonder home) bestaat niet of is leeg. */
function isRootlessWwwCmMediaPath(p: string): boolean {
  const n = p.replace(/\\/g, '/').replace(/\/+$/, '');
  return n === '/www/cm-media/uploads' || n.endsWith('/www/cm-media/uploads');
}

/** Herleid naar `$HOME/www/cm-media/uploads` of vast Combell-accountpad. */
function tryFixRootlessWwwCmMediaPath(configured: string): string | null {
  if (!isRootlessWwwCmMediaPath(configured)) return null;
  const home = hostingHome();
  if (home && !isContainerAppHome(home)) {
    const h = join(home, 'www/cm-media/uploads');
    try {
      if (existsSync(h) && statSync(h).isDirectory()) return h;
    } catch {
      /**/
    }
  }
  const idPath = '/home/ID460044/www/cm-media/uploads';
  try {
    if (existsSync(idPath) && statSync(idPath).isDirectory()) return idPath;
  } catch {
    /**/
  }
  return null;
}

/**
 * Absolute MEDIA_ROOT normaliseren: veelvoorkomende Combell-fouten en lege map vóór sync-bron.
 */
function normalizeAbsoluteMediaRoot(configured: string): string {
  if (isCombellDataSiteMediaPath(configured) && tryWritableMediaDir(configured)) {
    return configured.replace(/\\/g, '/').replace(/\/+$/, '') || configured;
  }

  if (isContainerAppHome(hostingHome()) && (configured.includes('/home/') || configured.includes('www/cm-media'))) {
    const containerDir = combellContainerMediaDirs().find((d) => {
      try {
        return existsSync(d) && statSync(d).isDirectory();
      } catch {
        return false;
      }
    });
    const dest = containerDir ?? '/app/shared/uploads';
    console.error(
      `[media] MEDIA_ROOT "${configured}" is niet bereikbaar in de Node-container — gebruik ${dest} (Combell ./shared).`,
    );
    return dest;
  }

  const fixedWww = tryFixRootlessWwwCmMediaPath(configured);
  if (fixedWww) {
    console.error(
      `[media] MEDIA_ROOT "${configured}" is geen geldige hostingmap — gebruik ${fixedWww} (onder home, niet onder /www op root).`,
    );
    return fixedWww;
  }

  let configuredOk = false;
  let configuredCount = 0;
  try {
    if (existsSync(configured) && statSync(configured).isDirectory()) {
      configuredOk = true;
      configuredCount = countMediaFilesShallow(configured, 2);
    }
  } catch {
    /**/
  }

  const syncSrc = process.env.MEDIA_SYNC_SOURCE?.trim();
  let syncOk = false;
  let syncCount = 0;
  if (syncSrc) {
    try {
      if (existsSync(syncSrc) && statSync(syncSrc).isDirectory()) {
        syncOk = true;
        syncCount = countMediaFilesShallow(syncSrc, 2);
      }
    } catch {
      /**/
    }
  }

  if (syncOk && syncSrc && syncCount > 0 && (!configuredOk || configuredCount === 0)) {
    console.error(
      `[media] MEDIA_ROOT (${configured}) ${!configuredOk ? 'bestaat niet' : 'bevat geen mediabestanden'} — gebruik MEDIA_SYNC_SOURCE=${syncSrc} (${syncCount} mediabestanden).`,
    );
    return syncSrc;
  }

  if (configuredOk) return configured;

  if (syncOk && syncSrc) return syncSrc;

  const home = hostingHome();
  if (home && !isContainerAppHome(home)) {
    const h = join(home, 'www/cm-media/uploads');
    try {
      if (existsSync(h) && statSync(h).isDirectory()) return h;
    } catch {
      /**/
    }
  }
  try {
    if (existsSync('/home/ID460044/www/cm-media/uploads') && statSync('/home/ID460044/www/cm-media/uploads').isDirectory()) {
      return '/home/ID460044/www/cm-media/uploads';
    }
  } catch {
    /**/
  }

  return configured;
}

function expandConfiguredRoot(raw: string): string {
  const t = raw.trim();
  if (isAbsolute(t)) {
    return normalizeAbsoluteMediaRoot(t);
  }

  const cwd = process.cwd();
  const noDot = t.replace(/^\.\//, '');

  if (noDot === 'apps/api/uploads' || noDot.endsWith('/apps/api/uploads')) {
    return join(cwd, 'uploads');
  }

  if (noDot === 'www/cm-media/uploads' || noDot.endsWith('www/cm-media/uploads')) {
    const walked = findCmMediaUploadsWalkingAncestors(cwd);
    if (walked) return walked;
    const siteRoot = process.env.CM_SITE_ROOT?.trim();
    if (siteRoot) {
      const abs = isAbsolute(siteRoot) ? siteRoot : resolve(cwd, siteRoot);
      const candidate = join(abs, 'www', 'cm-media', 'uploads');
      try {
        if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate;
      } catch {
        /**/
      }
    }
    const home = hostingHome();
    if (home && !isContainerAppHome(home)) {
      const h = join(home, 'www/cm-media/uploads');
      try {
        if (existsSync(h) && statSync(h).isDirectory()) return h;
      } catch {
        /**/
      }
    }
    return join(cwd, 'uploads');
  }

  return resolve(cwd, t);
}

/** Zoekt `www/cm-media/uploads` omhoog vanaf cwd (Combell: Node draait vaak in release-submap). */
function findCmMediaUploadsWalkingAncestors(startCwd: string): string | undefined {
  let cur = resolve(startCwd.replace(/\\/g, '/'));
  for (let i = 0; i < 14; i++) {
    const candidate = join(cur, 'www', 'cm-media', 'uploads');
    try {
      if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate;
    } catch {
      /**/
    }
    const parent = resolve(join(cur, '..'));
    if (parent === cur) break;
    cur = parent;
  }
  return undefined;
}

/** Vaste hostingpaden vóór app-release-map — zo komen bestanden in `www/cm-media/uploads` op Combell wél in beeld. */
function preferredHostingMediaDirs(): string[] {
  const out: string[] = [];
  const custom = process.env.CM_MEDIA_UPLOADS?.trim();
  if (custom) {
    if (isAbsolute(custom)) out.push(custom);
    else {
      const home = hostingHome();
      if (home && !isContainerAppHome(home)) out.push(resolve(home, custom));
      out.push(resolve(process.cwd(), custom));
    }
  }
  const home = hostingHome();
  if (home && !isContainerAppHome(home)) out.push(join(home, 'www/cm-media/uploads'));
  out.push('/home/ID460044/www/cm-media/uploads');
  for (const d of combellDataSiteUploadsCandidates()) out.push(d);
  return [...new Set(out.map((p) => p.replace(/\\/g, '/')))];
}

function localAppMediaCandidates(): string[] {
  const cwd = process.cwd().replace(/\\/g, '/');
  const out: string[] = [join(cwd, 'uploads')];
  if (cwd.endsWith('/apps/api')) {
    out.push(join(cwd, '..', '..', 'apps', 'api', 'uploads'));
  } else {
    out.push(join(cwd, 'apps/api/uploads'));
  }
  return [...new Set(out)];
}

/** Waar uploads naartoe mogen: MEDIA_ROOT wint als expliciet gezet en schrijfbaar. */
export function resolveWritableMediaRoot(): string {
  const mediaRoot = process.env.MEDIA_ROOT?.trim();
  if (mediaRoot) {
    const resolved = resolveMediaRoot();
    if (tryWritableMediaDir(resolved)) {
      return resolved.replace(/\\/g, '/').replace(/\/+$/, '') || resolved;
    }
  }

  const explicit = process.env.CM_COMBELL_DATA_UPLOADS?.trim();
  if (explicit && tryWritableMediaDir(explicit)) {
    return explicit.replace(/\\/g, '/').replace(/\/+$/, '') || explicit;
  }
  if (explicit) {
    console.error(
      `[media] CM_COMBELL_DATA_UPLOADS is gezet maar niet schrijfbaar: ${explicit} — Combell moet deze map aan de Node-container koppelen.`,
    );
  }

  let bestDir: string | undefined;
  let bestCount = -1;
  for (const dir of combellContainerMediaDirs()) {
    if (!tryWritableMediaDir(dir)) continue;
    const n = countMediaFilesShallow(dir, 2);
    if (n > bestCount) {
      bestCount = n;
      bestDir = dir;
    }
  }
  if (bestDir) {
    return bestDir.replace(/\\/g, '/').replace(/\/+$/, '') || bestDir;
  }
  return resolveMediaRoot();
}

export function resolveMediaRoot(): string {
  const raw = process.env.MEDIA_ROOT?.trim();
  if (raw) {
    return expandConfiguredRoot(raw);
  }

  if (isContainerAppHome(hostingHome())) {
    for (const dir of combellContainerMediaDirs()) {
      if (tryWritableMediaDir(dir)) {
        if (process.env.NODE_ENV === 'production') {
          console.error(`[media] Combell: MEDIA_ROOT → ${dir}`);
        }
        return dir;
      }
    }
    return '/app/shared/uploads';
  }

  const syncSrc = process.env.MEDIA_SYNC_SOURCE?.trim();
  if (syncSrc) {
    try {
      if (existsSync(syncSrc) && statSync(syncSrc).isDirectory()) return syncSrc;
    } catch {
      /**/
    }
  }

  for (const dir of preferredHostingMediaDirs()) {
    try {
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      if (countMediaFilesShallow(dir, 2) > 0) {
        if (process.env.NODE_ENV === 'production') {
          console.error(`[media] gebruik hosting-map: ${dir}`);
        }
        return dir;
      }
    } catch {
      /**/
    }
  }

  for (const dir of preferredHostingMediaDirs()) {
    try {
      if (existsSync(dir) && statSync(dir).isDirectory()) return dir;
    } catch {
      /**/
    }
  }

  let bestDir: string | undefined;
  let bestCount = 0;
  for (const dir of localAppMediaCandidates()) {
    const n = countMediaFilesShallow(dir, 2);
    if (n > bestCount) {
      bestCount = n;
      bestDir = dir;
    }
  }

  if (bestDir && bestCount > 0) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[media] gebruik map (heuristiek): ${bestDir} (${bestCount} mediabestanden)`);
    }
    return bestDir;
  }

  return join(process.cwd(), 'uploads');
}

/** Eén keer bij opstart (Combell-logs). */
export function logResolvedMediaRoot(): void {
  const explicit = Boolean(process.env.MEDIA_ROOT?.trim());
  const dir = resolveMediaRoot();
  const n = countMediaFilesShallow(dir, 2);
  if (process.env.NODE_ENV === 'production' && !explicit) {
    console.error(
      '[media] WAARSCHUWING: MEDIA_ROOT niet gezet — mediatheek staat onder cwd/uploads en gaat verloren bij een schone deploy. Zet MEDIA_ROOT op een persistente map (volume of bv. www/cm-media/uploads op Combell).',
    );
  }
  console.error(
    `[media] opslag=${explicit ? 'MEDIA_ROOT' : 'default/heuristiek'} → ${dir} (${n > 0 ? `${n} mediabestanden` : 'GEEN mediabestanden'})`,
  );
}
