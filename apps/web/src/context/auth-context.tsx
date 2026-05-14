'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, getApiBase } from '@/lib/api';
import { getStoredToken, setStoredToken } from '@/lib/storage';

export type ModelPushSummary = {
  unreadCount: number;
  notifyHistoryEvents: boolean;
  notifyAgencyBroadcasts: boolean;
  webPushConfigured: boolean;
  vapidPublicKey: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  bio?: string | null;
  companyName?: string | null;
  defaultPortal?: string | null;
  /** Modellenfiche (WP cm_* velden in camelCase), server: Json */
  modelSheet?: Record<string, unknown> | null;
  /** Publieke media-sleutel voor hoofdportret (rooster + profiel). */
  profileThumbKey?: string | null;
  /** MediaAsset-id van de hoofdfoto (map Modellen), exclusief in galerij-pijlen. */
  profilePhotoAssetId?: string | null;
  /** ISO string, laatste wachtwoord-login (API). */
  lastLoginAt?: string | null;
  roles: string[];
  isPremium: boolean;
  /** ISO; premium loopt tot deze datum (indien gezet). */
  premiumUntil?: string | null;
  permissions: string[];
  /** Samenvatting push (alleen na /users/me). */
  push?: ModelPushSummary | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
};

export type RegisterInput = {
  role: 'model' | 'client';
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
  /** JWT in localStorage + context zetten en /users/me laden (o.a. admin-impersonatie). */
  applySessionToken: (accessToken: string) => Promise<AuthUser>;
  refreshMe: (tokenOverride?: string | null) => Promise<AuthUser | null>;
  /** Heeft minstens één `admin.*` permissie of `*`. */
  hasBackofficeAccess: boolean;
  /** Mag /admin-layout openen (incl. alleen content-schrijfrechten). */
  canAccessAdminShell: boolean;
  /** `*` of specifieke permissie. */
  can: (permission: string) => boolean;
  /** @deprecated gebruik hasBackofficeAccess */
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async (t?: string | null) => {
    const tok = t ?? token;
    if (!tok) {
      setUser(null);
      return null;
    }
    const me = await apiFetch<AuthUser>('/users/me', { token: tok });
    const u = {
      ...me,
      permissions: me.permissions ?? [],
      roles: me.roles ?? [],
    };
    setUser(u);
    return u;
  }, [token]);

  const applySessionToken = useCallback(
    async (accessToken: string) => {
      setStoredToken(accessToken);
      setToken(accessToken);
      const u = await refreshMe(accessToken);
      if (!u) throw new Error('Sessie kon niet worden geladen.');
      return u;
    },
    [refreshMe],
  );

  useEffect(() => {
    const t = getStoredToken();
    setToken(t);
    if (!t) {
      setLoading(false);
      return;
    }
    refreshMe(t)
      .catch(() => {
        setStoredToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ access_token: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return applySessionToken(res.access_token);
    },
    [applySessionToken],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await apiFetch<{ access_token: string; user: AuthUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return applySessionToken(res.access_token);
    },
    [applySessionToken],
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const can = useCallback(
    (permission: string) => {
      const p = user?.permissions ?? [];
      return p.includes('*') || p.includes(permission);
    },
    [user?.permissions],
  );

  const hasBackofficeAccess = useMemo(() => {
    const p = user?.permissions ?? [];
    return p.includes('*') || p.some((x) => x.startsWith('admin.'));
  }, [user?.permissions]);

  const canAccessAdminShell = useMemo(() => {
    const p = user?.permissions ?? [];
    return (
      p.includes('*') ||
      p.some((x) => x.startsWith('admin.')) ||
      p.includes('content.strings.write')
    );
  }, [user?.permissions]);

  const isAdmin = hasBackofficeAccess;

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      register,
      logout,
      applySessionToken,
      refreshMe: (override?: string | null) => refreshMe(override),
      hasBackofficeAccess,
      canAccessAdminShell,
      can,
      isAdmin,
    }),
    [
      token,
      user,
      loading,
      login,
      register,
      logout,
      applySessionToken,
      refreshMe,
      hasBackofficeAccess,
      canAccessAdminShell,
      can,
      isAdmin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth binnen AuthProvider gebruiken');
  return ctx;
}

export function apiUrl(path: string) {
  const base = getApiBase();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
