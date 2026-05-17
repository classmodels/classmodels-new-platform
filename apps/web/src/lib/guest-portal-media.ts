import { publicMediaUrl } from '@/lib/api';

/** Statisch bestand onder `public/` (bv. `/guest/film22.mp4`), met optionele `NEXT_PUBLIC_BASE_PATH`. */
export function guestPortalStaticPublicUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Pad naar publieke mediabestanden (API: `/media/public/{basename}` — alleen bestandsnaam, geen submap). */
export function guestPortalPublicMediaUrl(basename: string | null | undefined): string | null {
  const b = basename?.trim();
  if (!b) return null;
  return publicMediaUrl(b) || null;
}
