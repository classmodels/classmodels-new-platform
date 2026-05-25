import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { resolveMediaRoot } from '../config/resolve-media-root';

const AGENDA_UPLOAD_NAME_RE = /^[a-z0-9][a-z0-9._-]{2,190}$/i;

/** Bestandsnaam uit opgeslagen waarde (pad of volledige URL). */
export function agendaUploadFilename(stored: string | null | undefined): string | null {
  const v = stored?.trim();
  if (!v) return null;
  let name = v;
  if (/^https?:\/\//i.test(v)) {
    try {
      name = basename(new URL(v).pathname);
    } catch {
      return null;
    }
  } else {
    name = basename(v.replace(/^\/+/, ''));
  }
  const n = name.trim();
  if (!AGENDA_UPLOAD_NAME_RE.test(n)) return null;
  if (n.includes('..') || n.includes('/') || n.includes('\\')) return null;
  return n;
}

/** Extensie voor opgeslagen bestandsnaam (ook als browser geen extensie meestuurt). */
export function agendaUploadExtFromMimetype(mime?: string | null): string {
  const m = (mime ?? '').toLowerCase();
  if (m.includes('png')) return '.png';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  if (m.includes('heic') || m.includes('heif')) return '.heic';
  return '.jpg';
}

export function agendaMimeFromFilename(filename: string): string {
  const ext = extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.heic' || ext === '.heif') return 'image/heic';
  return 'image/jpeg';
}

/** Relatief pad in fieldsJson. */
export function agendaUploadRelativeUrl(filename: string): string {
  const base = agendaUploadFilename(filename) ?? filename.replace(/^\/+/, '').replace(/^uploads\/agenda\//, '');
  return `/uploads/agenda/${base}`;
}

/** Publieke API-route (via `/__cm_api/agenda/uploads/…`). */
export function agendaUploadPublicPath(filename: string): string {
  const safe = agendaUploadFilename(filename) ?? filename;
  return `/agenda/uploads/${encodeURIComponent(safe)}`;
}

/** Zoek bestand onder MEDIA_ROOT/agenda (legacy uploads). */
export function resolveAgendaUploadAbsolutePath(stored: string | null | undefined): string | null {
  const name = agendaUploadFilename(stored);
  if (!name) return null;
  const fp = join(resolveMediaRoot(), 'agenda', name);
  try {
    if (existsSync(fp)) return fp;
  } catch {
    /**/
  }
  const flat = join(resolveMediaRoot(), name);
  try {
    if (existsSync(flat)) return flat;
  } catch {
    /**/
  }
  return null;
}
