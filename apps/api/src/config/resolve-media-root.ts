import { readdirSync } from 'fs';
import { homedir } from 'os';
import { isAbsolute, join, resolve } from 'path';

/**
 * Root-.env gebruikt vaak MEDIA_ROOT=./apps/api/uploads (t.o.v. monorepo-root).
 * Nest en scripts draaien met cwd apps/api — dan zou die relatieve pad dubbel apps/api worden.
 * We normaliseren naar één map: {cwd}/uploads wanneer cwd al apps/api is.
 *
 * Combell: uploads staan onder ~/www/cm-media/uploads; Node draait buiten www.
 * Zet MEDIA_ROOT=www/cm-media/uploads of laat leeg — we proberen HOME/www/cm-media/uploads.
 */
function hasMediaFiles(dir: string): boolean {
  try {
    return readdirSync(dir).some((f) => /\.(jpe?g|webp|png|gif)$/i.test(f));
  } catch {
    return false;
  }
}

function hostingHome(): string | undefined {
  const home = process.env.HOME?.trim() || homedir();
  return home || undefined;
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
    if (home) return join(home, 'www/cm-media/uploads');
    return resolve(cwd, 'www/cm-media/uploads');
  }

  return resolve(cwd, raw);
}

function mediaRootCandidates(): string[] {
  const raw = process.env.MEDIA_ROOT?.trim();
  const out: string[] = [];

  if (raw) out.push(expandConfiguredRoot(raw));

  const home = hostingHome();
  if (home) out.push(join(home, 'www/cm-media/uploads'));

  const cwd = process.cwd();
  out.push(join(cwd, 'uploads'));
  out.push(join(cwd, 'apps/api/uploads'));

  return [...new Set(out)];
}

export function resolveMediaRoot(): string {
  for (const dir of mediaRootCandidates()) {
    if (hasMediaFiles(dir)) {
      if (process.env.NODE_ENV === 'production') {
        console.error(`[media] gebruik map: ${dir}`);
      }
      return dir;
    }
  }

  const raw = process.env.MEDIA_ROOT?.trim();
  if (raw) return expandConfiguredRoot(raw);
  return join(process.cwd(), 'uploads');
}

/** Eén keer bij opstart (Combell-logs). */
export function logResolvedMediaRoot(): void {
  const dir = resolveMediaRoot();
  const ok = hasMediaFiles(dir);
  console.error(
    `[media] MEDIA_ROOT=${dir} (${ok ? 'bestanden gevonden' : 'GEEN mediabestanden — controleer www/cm-media/uploads'})`,
  );
}
