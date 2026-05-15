import { getApiBase, parseApiErrorBody } from '@/lib/api';

export async function adminFetch<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const API = getApiBase();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(parseApiErrorBody(t || res.statusText));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
