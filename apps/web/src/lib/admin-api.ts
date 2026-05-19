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

/** Download een bestand (ZIP, export) met admin-JWT. */
export async function adminDownloadFile(
  path: string,
  token: string | null,
  filename: string,
): Promise<void> {
  const API = getApiBase();
  const res = await fetch(`${API}${path.startsWith('/') ? path : `/${path}`}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(parseApiErrorBody(t || res.statusText));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
