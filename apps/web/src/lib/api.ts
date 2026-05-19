/** Zelfde domein als de site → geen CORS (Combell: Next + API op één origin). */
export const CM_API_PROXY_PREFIX = '/__cm_api';

function stripTrailingSlash(u: string): string {
  return u.replace(/\/+$/, '');
}

/** Lokaal: rechtstreeks naar Nest. Overal elders: same-origin `/__cm_api` (Next rewrite → API). */
function shouldUseSameOriginApiProxy(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return false;
  if (h.endsWith('.local')) return false;
  return true;
}

/** Nest-fout JSON → leesbare tekst voor in de UI. */
export function parseApiErrorBody(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;
  try {
    const j = JSON.parse(trimmed) as { message?: string | string[] };
    if (typeof j.message === 'string') return j.message;
    if (Array.isArray(j.message)) return j.message.join(', ');
  } catch {
    /* geen JSON */
  }
  return text;
}

export function getApiBase() {
  if (typeof window !== 'undefined' && shouldUseSameOriginApiProxy(window.location.hostname)) {
    return CM_API_PROXY_PREFIX;
  }

  const internal = process.env.CM_API_INTERNAL_URL?.replace(/\/$/, '');
  if (internal) return internal;

  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv && !fromEnv.includes('localhost') && !fromEnv.includes('127.0.0.1')) {
    return fromEnv;
  }
  return fromEnv ?? 'http://localhost:4000';
}

/**
 * Basis-URL voor **publieke** mediabestanden (`GET /media/public/{key}` — geen JWT).
 * Standaard: `NEXT_PUBLIC_API_URL` als dat een publiek https/http-domein is (bv. api.*),
 * zodat `<img src>` niet afhangt van www-rewrites. Optioneel: `NEXT_PUBLIC_MEDIA_BASE_URL`.
 * SSR zonder die env: relatief `/__cm_api` (browser lost op t.o.v. www).
 */
export function getMediaPublicBaseUrl(): string {
  const mediaOnly = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim();
  if (mediaOnly) return stripTrailingSlash(mediaOnly);

  /** Zelfde logica als getApiBase: op productie altijd same-origin `/__cm_api` in de browser. */
  if (typeof window !== 'undefined' && shouldUseSameOriginApiProxy(window.location.hostname)) {
    return `${window.location.origin.replace(/\/$/, '')}${CM_API_PROXY_PREFIX}`;
  }

  const api = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (api && /^https?:\/\//i.test(api)) {
    const a = stripTrailingSlash(api);
    if (!/127\.0\.0\.1|localhost/i.test(a)) {
      return a;
    }
  }

  if (typeof window !== 'undefined') {
    if (api) return stripTrailingSlash(api);
  } else {
    return CM_API_PROXY_PREFIX;
  }

  const internal = process.env.CM_API_INTERNAL_URL?.replace(/\/$/, '');
  if (internal) return internal;

  return stripTrailingSlash(api || 'http://localhost:4000');
}

/** Volledige URL voor één publiek mediabestand (storageKey / thumbKey / webpKey). */
export function publicMediaUrl(key: string | null | undefined): string {
  const k = key?.trim();
  if (!k) return '';
  return `${getMediaPublicBaseUrl()}/media/public/${encodeURIComponent(k)}`;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const API = getApiBase();
  const { token, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && rest.body && typeof rest.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API}${path.startsWith('/') ? path : `/${path}`}`, {
    ...rest,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
      throw new Error(
        'Server gaf een webpagina i.p.v. API-data. Wacht op deploy of controleer /__cm_api (zie Combell pipeline).',
      );
    }
    throw new Error(parseApiErrorBody(text || res.statusText));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
