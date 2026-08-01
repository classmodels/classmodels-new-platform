const TOKEN_LOCAL = 'cm_access_token';
const TOKEN_SESSION = 'cm_access_token_session';
const REMEMBER_KEY = 'cm_remember_me';

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

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_LOCAL) || sessionStorage.getItem(TOKEN_SESSION);
}

export function setStoredToken(token: string | null, rememberMe = true) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_LOCAL);
  sessionStorage.removeItem(TOKEN_SESSION);
  if (!token) return;
  setRememberMePreference(rememberMe);
  if (rememberMe) localStorage.setItem(TOKEN_LOCAL, token);
  else sessionStorage.setItem(TOKEN_SESSION, token);
}

/**
 * Voor externe redirects (Mollie): zet de JWT altijd in localStorage.
 * sessionStorage gaat soms verloren bij terugkeer van een andere site/tab (Safari/iOS).
 */
export function persistSessionForExternalRedirect() {
  if (typeof window === 'undefined') return;
  const tok = getStoredToken();
  if (!tok) return;
  setStoredToken(tok, true);
}

/** Navigeer naar Mollie (of andere externe checkout) zonder de login kwijt te raken. */
export function goToExternalCheckout(checkoutUrl: string) {
  persistSessionForExternalRedirect();
  window.location.href = checkoutUrl;
}
