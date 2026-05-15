/** Zelfde domein als de site → geen CORS (Combell www + api op één Node). */
export const CM_API_PROXY_PREFIX = '/__cm_api';

function isClassModelsSiteHost(host: string) {
  const h = host.toLowerCase();
  return h === 'www.class-models.be' || h === 'class-models.be';
}

export function getApiBase() {
  if (typeof window !== 'undefined') {
    if (isClassModelsSiteHost(window.location.hostname)) {
      return CM_API_PROXY_PREFIX;
    }
  }

  const internal = process.env.CM_API_INTERNAL_URL?.replace(/\/$/, '');
  if (internal) return internal;

  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv && !fromEnv.includes('localhost') && !fromEnv.includes('127.0.0.1')) {
    return fromEnv;
  }
  return fromEnv ?? 'http://localhost:4000';
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
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
