const TOKEN_LOCAL = 'cm_access_token';
const TOKEN_SESSION = 'cm_access_token_session';
const TOKEN_COOKIE = 'cm_access_token';
const REMEMBER_KEY = 'cm_remember_me';

function cookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const h = window.location.hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return undefined;
  if (h === 'class-models.be' || h.endsWith('.class-models.be')) return '.class-models.be';
  if (h === 'class-models.com' || h.endsWith('.class-models.com')) return '.class-models.com';
  return undefined;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    const v = part.slice(idx + 1).trim();
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

function writeCookie(name: string, value: string | null, maxAgeSec: number) {
  if (typeof document === 'undefined') return;
  const domain = cookieDomain();
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  const domainPart = domain ? `; Domain=${domain}` : '';
  if (!value) {
    // Wis host-only én parent-domain cookie (www vs apex).
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    if (domain) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}${domainPart}`;
    }
    return;
  }
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax` +
    `${secure}${domainPart}`;
}

export function getRememberMePreference(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(REMEMBER_KEY);
  if (v === '0') return false;
  return true;
}

export function setRememberMePreference(remember: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
}

/**
 * JWT uit localStorage, sessionStorage of cookie (cookie deelt www + apex
 * en overleeft top-level return van Mollie met SameSite=Lax).
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(TOKEN_LOCAL) ||
    sessionStorage.getItem(TOKEN_SESSION) ||
    readCookie(TOKEN_COOKIE)
  );
}

export function setStoredToken(token: string | null, rememberMe = true) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_LOCAL);
  sessionStorage.removeItem(TOKEN_SESSION);
  writeCookie(TOKEN_COOKIE, null, 0);
  if (!token) return;
  // Altijd “onthouden” aan clientzijde: Mollie-return mag de sessie nooit kwijtraken.
  // (Server-JWT-duur blijft wel respecteren via rememberMe bij login.)
  setRememberMePreference(rememberMe);
  localStorage.setItem(TOKEN_LOCAL, token);
  // Cookie: 400 dagen — SameSite=Lax wordt meegestuurd bij top-level navigatie vanaf Mollie.
  writeCookie(TOKEN_COOKIE, token, 60 * 60 * 24 * 400);
}

/**
 * Voor externe redirects (Mollie): forceer JWT in localStorage + cookie.
 */
export function persistSessionForExternalRedirect() {
  if (typeof window === 'undefined') return;
  const tok = getStoredToken();
  if (!tok) return;
  setStoredToken(tok, true);
}

/** Navigeer naar Mollie zonder de login kwijt te raken. */
export function goToExternalCheckout(checkoutUrl: string) {
  persistSessionForExternalRedirect();
  window.location.assign(checkoutUrl);
}

/** Herstel sessie uit Mollie-return query `cm_resume` (éénmalig, daarna uit URL). */
export function consumeResumeTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const resume = url.searchParams.get('cm_resume')?.trim() || null;
    if (!resume) return null;
    url.searchParams.delete('cm_resume');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setStoredToken(resume, true);
    return resume;
  } catch {
    return null;
  }
}

/** Origin die de API mag gebruiken als Mollie-return (zelfde host als de browser). */
export function paymentReturnOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin.replace(/\/$/, '');
}
