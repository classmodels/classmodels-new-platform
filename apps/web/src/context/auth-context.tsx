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

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  bio?: string | null;
  companyName?: string | null;
  defaultPortal?: string | null;
  roles: string[];
  isPremium: boolean;
  permissions: string[];
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshMe: () => Promise<void>;
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
      return;
    }
    const me = await apiFetch<AuthUser>('/users/me', { token: tok });
    setUser({
      ...me,
      permissions: me.permissions ?? [],
      roles: me.roles ?? [],
    });
  }, [token]);

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

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ access_token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.access_token);
    setToken(res.access_token);
    const u = {
      ...res.user,
      permissions: res.user.permissions ?? [],
      roles: res.user.roles ?? [],
    };
    setUser(u);
    return u;
  }, []);

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
      logout,
      refreshMe: () => refreshMe(),
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
      logout,
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
