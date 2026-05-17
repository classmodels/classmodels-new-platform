import { existsSync, readdirSync, statSync } from 'fs';
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
function countMediaFilesShallow(dir: string, maxDepth: number): number {
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

function expandConfiguredRoot(raw: string): string {
  if (isAbsolute(raw)) return raw;

  const cwd = process.cwd();
  const noDot = raw.replace(/^\.\//, '');

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

  return resolve(cwd, raw);
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

export function resolveMediaRoot(): string {
  const raw = process.env.MEDIA_ROOT?.trim();
  if (raw) {
    return expandConfiguredRoot(raw);
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
