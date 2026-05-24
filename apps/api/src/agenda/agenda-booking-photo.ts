import { basename } from 'node:path';
import { agendaUploadFilename } from './agenda-upload-path';

const STORAGE_KEY_RE = /^[a-z0-9][a-z0-9._-]{2,190}$/i;

/** Publieke bestandsnaam uit fieldsJson (`uuid.webp`, legacy `/uploads/agenda/…`, oude URL). */
export function agendaBookingPhotoStorageKey(stored: string | null | undefined): string | null {
  const v = stored?.trim();
  if (!v) return null;
  if (!v.includes('/') && !/^https?:\/\//i.test(v) && STORAGE_KEY_RE.test(v)) return v;
  const legacy = agendaUploadFilename(v);
  if (legacy) return legacy;
  const tail = basename(v.replace(/^\/+/, ''));
  return STORAGE_KEY_RE.test(tail) ? tail : null;
}
