/** Alleen browser localhost / 127.0.0.1 — nooit productie. */
export function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}
