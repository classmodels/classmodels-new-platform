import { agendaUploadUrl, publicMediaUrl } from '@/lib/api';

const STORAGE_KEY_RE = /^[a-z0-9][a-z0-9._-]{2,190}$/i;

/** Publieke mediabestandsnaam uit fieldsJson (nieuw: storageKey; oud: pad of URL). */
export function agendaBookingPhotoStorageKey(stored: string | null | undefined): string | null {
  const v = stored?.trim();
  if (!v) return null;
  if (!v.includes('/') && !/^https?:\/\//i.test(v) && STORAGE_KEY_RE.test(v)) return v;
  let name = v;
  if (/^https?:\/\//i.test(v)) {
    try {
      name = new URL(v).pathname.split('/').pop() ?? '';
    } catch {
      return null;
    }
  } else {
    name = v.replace(/^\/+/, '').replace(/^uploads\/agenda\//, '');
    const slash = name.lastIndexOf('/');
    if (slash >= 0) name = name.slice(slash + 1);
  }
  const n = name.trim();
  return STORAGE_KEY_RE.test(n) ? n : null;
}

/** Zelfde route als modelfoto's; fallback voor oude agenda-uploads. */
export function agendaBookingPhotoPublicUrl(stored: string | null | undefined): string {
  const key = agendaBookingPhotoStorageKey(stored);
  if (key) return publicMediaUrl(key);
  return agendaUploadUrl(stored);
}
