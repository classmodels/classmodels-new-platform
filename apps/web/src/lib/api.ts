/** Productie-fallback als NEXT_PUBLIC_API_URL bij build ontbrak (Combell). */
const PRODUCTION_API = 'https://api.class-models.be';

function productionApiFromBrowser(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname.toLowerCase();
  if (host === 'www.class-models.be' || host === 'class-models.be') {
    return PRODUCTION_API;
  }
  return null;
}

export function getApiBase() {
  const fromBrowser = productionApiFromBrowser();
  if (fromBrowser) return fromBrowser;

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
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
