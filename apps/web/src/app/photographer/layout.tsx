'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

function parseApiError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  try {
    const j = JSON.parse(err.message) as { message?: string | string[] };
    if (typeof j.message === 'string') return j.message;
    if (Array.isArray(j.message)) return j.message.join(', ');
  } catch {
    if (err.message && !err.message.startsWith('{')) return err.message;
  }
  return fallback;
}

function PhotographerLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = await login(email.trim(), password, { rememberMe });
      const perms = u.permissions ?? [];
      const ok =
        perms.includes('*') ||
        perms.includes('photographer.portfolio.upload') ||
        u.roles.includes('fotograaf');
      if (!ok) {
        setErr('Dit account heeft geen fotograaf-rechten voor portfolio-upload.');
      }
      // Layout herlaadt via auth-context; bij ok zie je de uploadpagina.
    } catch (error) {
      setErr(parseApiError(error, 'Inloggen mislukt. Controleer e-mail en wachtwoord.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Fotograaf — portfolio uploaden</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Log in met je fotograaf-account. Daarna kun je portfolios uploaden.
          </p>
        </div>
        <label className="block text-sm">
          <span className="text-zinc-600">E-mail</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Wachtwoord</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Ingelogd blijven
        </label>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#7a1f2b] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>
    </div>
  );
}

export default function PhotographerLayout({ children }: { children: ReactNode }) {
  const { user, loading, can, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        Laden…
      </div>
    );
  }

  if (!user) {
    return <PhotographerLogin />;
  }

  if (!can('photographer.portfolio.upload')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-100 px-4 text-center">
        <p className="text-sm text-zinc-700">
          Je bent ingelogd als <strong>{user.email}</strong>, maar dit account mag geen portfolios
          uploaden.
        </p>
        <button
          type="button"
          className="text-sm font-medium text-[#7a1f2b] underline"
          onClick={() => {
            logout();
          }}
        >
          Uitloggen en opnieuw proberen
        </button>
        <button
          type="button"
          className="text-xs text-zinc-500 underline"
          onClick={() => router.replace('/')}
        >
          Naar homepage
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-sm font-semibold text-ink">Class Models — fotograaf (portfolio)</h1>
        <button
          type="button"
          className="text-xs font-medium text-burgundy hover:underline"
          onClick={() => {
            logout();
          }}
        >
          Uitloggen
        </button>
      </header>
      <main className="mx-auto w-full max-w-page px-4 py-6">{children}</main>
    </div>
  );
}
