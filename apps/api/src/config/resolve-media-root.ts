import { readdirSync } from 'fs';
import { homedir } from 'os';
import { isAbsolute, join, resolve } from 'path';

/**
 * Root-.env gebruikt vaak MEDIA_ROOT=./apps/api/uploads (t.o.v. monorepo-root).
 * Nest draait met cwd apps/api → {cwd}/uploads.
 * Combell: bron staat op shared hosting onder ~/www/cm-media/uploads; sync naar apps/api/uploads.
 */
function countMediaFiles(dir: string): number {
  try {
    return readdirSync(dir).filter((f) => /\.(jpe?g|webp|png|gif)$/i.test(f)).length;
  } catch {
    return 0;
  }
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
    const home = hostingHome();
    if (home && !isContainerAppHome(home)) return join(home, 'www/cm-media/uploads');
    return join(cwd, 'uploads');
  }

  return resolve(cwd, raw);
}

function mediaRootCandidates(): string[] {
  const raw = process.env.MEDIA_ROOT?.trim();
  const out: string[] = [];

  if (raw) out.push(expandConfiguredRoot(raw));

  const syncSrc = process.env.MEDIA_SYNC_SOURCE?.trim();
  if (syncSrc) out.push(syncSrc);

  const home = hostingHome();
  if (home && !isContainerAppHome(home)) out.push(join(home, 'www/cm-media/uploads'));

  out.push('/home/ID460044/www/cm-media/uploads');

  const cwd = process.cwd().replace(/\\/g, '/');
  out.push(join(cwd, 'uploads'));
  if (cwd.endsWith('/apps/api')) {
    out.push(join(cwd, '..', '..', 'apps', 'api', 'uploads'));
  } else {
    out.push(join(cwd, 'apps/api/uploads'));
  }

  return [...new Set(out)];
}

export function resolveMediaRoot(): string {
  let bestDir: string | undefined;
  let bestCount = 0;

  for (const dir of mediaRootCandidates()) {
    const n = countMediaFiles(dir);
    if (n > bestCount) {
      bestCount = n;
      bestDir = dir;
    }
  }

  if (bestDir && bestCount > 0) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[media] gebruik map: ${bestDir} (${bestCount} bestanden)`);
    }
    return bestDir;
  }

  const raw = process.env.MEDIA_ROOT?.trim();
  if (raw) {
    const configured = expandConfiguredRoot(raw);
    if (countMediaFiles(configured) > 0) return configured;
  }
  return join(process.cwd(), 'uploads');
}

/** Eén keer bij opstart (Combell-logs). */
export function logResolvedMediaRoot(): void {
  const dir = resolveMediaRoot();
  const n = countMediaFiles(dir);
  console.error(
    `[media] MEDIA_ROOT=${dir} (${n > 0 ? `${n} mediabestanden` : 'GEEN mediabestanden'})`,
  );
}
