import { getApiBase } from '@/lib/api';

/** Pad naar publieke mediabestanden (API: `/media/public/{basename}` — alleen bestandsnaam, geen submap). */
export function guestPortalPublicMediaUrl(basename: string | null | undefined): string | null {
  const b = basename?.trim();
  if (!b) return null;
  return `${getApiBase()}/media/public/${encodeURIComponent(b)}`;
}
