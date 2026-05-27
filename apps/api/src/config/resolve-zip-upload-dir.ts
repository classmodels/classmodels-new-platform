import { accessSync, constants, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { resolveMediaRoot } from './resolve-media-root';

/** Tijdelijke ZIP-uploads: voorkeur grote Combell-map, niet de kleine /app/shared-container. */
export function resolveZipUploadTmpDir(): string {
  const candidates: string[] = [];
  const combell = process.env.CM_COMBELL_DATA_UPLOADS?.trim();
  if (combell) candidates.push(join(combell, '.zip-upload-tmp'));
  const cmMedia = process.env.CM_MEDIA_UPLOADS?.trim();
  if (cmMedia) candidates.push(join(cmMedia, '.zip-upload-tmp'));
  const home = process.env.HOME?.trim() || homedir();
  if (home && home !== '/app') {
    candidates.push(join(home, 'www/cm-media/uploads/.zip-upload-tmp'));
  }
  candidates.push('/home/ID460044/www/cm-media/uploads/.zip-upload-tmp');
  candidates.push(join(resolveMediaRoot(), '.zip-upload-tmp'));

  for (const dir of candidates) {
    try {
      mkdirSync(dir, { recursive: true });
      accessSync(dir, constants.W_OK | constants.R_OK);
      return dir;
    } catch {
      /** probeer volgende */
    }
  }
  const fallback = join(resolveMediaRoot(), '.zip-upload-tmp');
  mkdirSync(fallback, { recursive: true });
  return fallback;
}
