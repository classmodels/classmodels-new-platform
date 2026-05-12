import { existsSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';

/**
 * Root-.env gebruikt vaak MEDIA_ROOT=./apps/api/uploads (t.o.v. monorepo-root).
 * Nest en scripts draaien met cwd apps/api — dan zou die relatieve pad dubbel apps/api worden.
 * We normaliseren naar één map: {cwd}/uploads wanneer cwd al apps/api is.
 */
export function resolveMediaRoot(): string {
  const raw = process.env.MEDIA_ROOT?.trim();
  if (!raw) return join(process.cwd(), 'uploads');
  if (isAbsolute(raw)) return raw;

  const cwd = process.cwd();
  const noDot = raw.replace(/^\.\//, '');
  if (noDot === 'apps/api/uploads' || noDot.endsWith('/apps/api/uploads')) {
    return join(cwd, 'uploads');
  }
  return resolve(cwd, raw);
}
