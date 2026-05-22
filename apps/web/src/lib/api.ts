import { loadingBegin, loadingEnd } from '@/lib/loading-bus';

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
  if (
    trimmed.includes('Temporary failure') ||
    trimmed.includes('Gateway Time-out') ||
    trimmed.includes('504 Gateway') ||
    trimmed.includes('502 Bad Gateway') ||
    trimmed.includes('503 Service')
  ) {
    return (
      'De server (Combell/proxy) kon het verzoek niet op tijd afronden. ' +
      'Wacht tot een grote upload klaar is, probeer over 1–2 minuten opnieuw, of ververs de pagina. ' +
      'Bij bulk-mail: de verzending kan alsnog op de server doorlopen — kijk bij Communicatie → Geschiedenis.'
    );
  }
  if (trimmed.includes('<!DOCTYPE') || trimmed.includes('<html') || trimmed.includes('<title>')) {
    return (
      'Geen geldig antwoord van de API (hosting-foutpagina). API mogelijk overbelast of herstart. Probeer later opnieuw.'
    );
  }
  try {
    const j = JSON.parse(trimmed) as { message?: string | string[] };
    if (typeof j.message === 'string') return j.message;
    if (Array.isArray(j.message)) return j.message.join(', ');
  } catch {
    /* geen JSON */
  }
  if (/^internal server error$/i.test(trimmed)) {
    return 'Internal server error';
  }
  if (trimmed.length > 280) return `${trimmed.slice(0, 280)}…`;
  return text;
}

/**
 * ZIP-upload (chunked): bij voorkeur rechtstreeks naar api.* als gezet in build-env,
 * anders same-origin `/__cm_api` (geen CORS).
 */
export function getZipUploadApiBase(): string {
  const direct = process.env.NEXT_PUBLIC_LARGE_UPLOAD_API_URL?.replace(/\/$/, '');
  if (direct && /^https?:\/\//i.test(direct) && !/localhost|127\.0\.0\.1/i.test(direct)) {
    return direct;
  }
  return getLargeUploadApiBase();
}

/** Grote ZIP via same-origin `/__cm_api` (geen CORS, Combell-proxy ondersteunt lange uploads). */
export function getLargeUploadApiBase(): string {
  if (typeof window !== 'undefined' && shouldUseSameOriginApiProxy(window.location.hostname)) {
    return `${window.location.origin.replace(/\/$/, '')}${CM_API_PROXY_PREFIX}`;
  }

  const direct = process.env.NEXT_PUBLIC_LARGE_UPLOAD_API_URL?.replace(/\/$/, '');
  if (direct) return direct;

  const pub = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (pub && /^https?:\/\//i.test(pub) && !/localhost|127\.0\.0\.1/i.test(pub)) {
    return pub;
  }

  const api = getApiBase();
  if (api.startsWith('http')) return api;
  return `${typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : ''}${api}`;
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

/** Zelfde bestand, maar browser start download i.p.v. inline weergave. */
export function publicMediaDownloadUrl(key: string | null | undefined): string {
  const k = key?.trim();
  if (!k) return '';
  return `${getMediaPublicBaseUrl()}/media/download/${encodeURIComponent(k)}`;
}

/** Publieke ZIP van een mediamap (alleen als publicZipDownload in mapinstellingen aan staat). */
export function publicFolderZipUrl(folderSlug: string | null | undefined): string {
  const s = folderSlug?.trim().toLowerCase();
  if (!s) return '';
  return `${getMediaPublicBaseUrl()}/media/folder/${encodeURIComponent(s)}/download.zip`;
}

export type ApiFetchInit = RequestInit & {
  token?: string | null;
  /** Toon voortgang via useLoading() — alleen als je expliciet een label meegeeft. */
  loadingLabel?: string;
};

export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const API = getApiBase();
  const { token, loadingLabel, ...rest } = init ?? {};
  const showLoading = Boolean(loadingLabel);
  if (showLoading) loadingBegin(loadingLabel);
  try {
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
  } finally {
    if (showLoading) loadingEnd();
  }
}
