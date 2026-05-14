/** Admin JWT backup tijdens “open als model” (sessionStorage). */
export const IMPERSONATION_ADMIN_TOKEN_KEY = 'cm_impersonation_admin_token';
export const IMPERSONATION_ADMIN_EMAIL_KEY = 'cm_impersonation_admin_email';

export function getImpersonationAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(IMPERSONATION_ADMIN_TOKEN_KEY);
}

export function getImpersonationAdminEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(IMPERSONATION_ADMIN_EMAIL_KEY);
}

export function startImpersonationSession(adminToken: string, adminEmail: string) {
  sessionStorage.setItem(IMPERSONATION_ADMIN_TOKEN_KEY, adminToken);
  sessionStorage.setItem(IMPERSONATION_ADMIN_EMAIL_KEY, adminEmail);
}

export function clearImpersonationSession() {
  sessionStorage.removeItem(IMPERSONATION_ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(IMPERSONATION_ADMIN_EMAIL_KEY);
}
