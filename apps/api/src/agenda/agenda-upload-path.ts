import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  combellHostingDiscoveryPaths,
  resolveMediaRoot,
  resolveWritableMediaRoot,
} from '../config/resolve-media-root';

const AGENDA_UPLOAD_NAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|gif|webp)$/i;

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
  return AGENDA_UPLOAD_NAME_RE.test(name) ? name : null;
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

/** Zoek bestand: eerst MEDIA_ROOT (zelfde als static), daarna andere schrijfbare mappen (oude uploads). */
export function resolveAgendaUploadAbsolutePath(stored: string | null | undefined): string | null {
  const name = agendaUploadFilename(stored);
  if (!name) return null;

  const candidates = new Set<string>();
  candidates.add(join(resolveMediaRoot(), 'agenda', name));
  candidates.add(join(resolveWritableMediaRoot(), 'agenda', name));
  for (const root of combellHostingDiscoveryPaths()) {
    candidates.add(join(root, 'agenda', name));
  }

  for (const fp of candidates) {
    try {
      if (existsSync(fp)) return fp;
    } catch {
      /**/
    }
  }
  return null;
}
