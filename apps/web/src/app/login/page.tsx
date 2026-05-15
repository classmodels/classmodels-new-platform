'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { GoogleTranslate } from '@/components/GoogleTranslate';
import { useI18n } from '@/i18n/context';
import { redirectAfterPortalAuth } from '@/lib/redirect-after-auth';

function LoginForm() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(email, password, { rememberMe });
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        router.replace(next);
      } else {
        redirectAfterPortalAuth(u, router);
      }
    } catch (err) {
      let msg = t('auth.loginFailed');
      if (err instanceof Error) {
        try {
          const j = JSON.parse(err.message) as { message?: string | string[] };
          if (typeof j.message === 'string') msg = j.message;
          else if (Array.isArray(j.message)) msg = j.message.join(', ');
        } catch {
          if (err.message && !err.message.startsWith('{')) msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-4 flex justify-end">
        <GoogleTranslate />
      </div>
      <h1 className="font-serif text-2xl text-burgundy">{t('auth.loginTitle')}</h1>
      <div className="mt-3 rounded-md border border-line bg-panel px-3 py-2 text-xs text-ink">
        <p className="font-medium text-ink">{t('auth.demoTitle')}</p>
        <p className="mt-1 text-muted">{t('auth.demoPasswordHint')}</p>
        <p className="mt-1 font-mono text-sm text-burgundy">Demo123!</p>
        <table className="mt-2 w-full text-left text-[11px] text-muted">
          <tbody>
            <tr>
              <td className="py-0.5 pr-2 font-medium text-ink">{t('auth.demoAdmin')}</td>
              <td>
                <code>admin@class-models.local</code>
              </td>
            </tr>
            <tr>
              <td className="py-0.5 pr-2 font-medium text-ink">{t('auth.demoModel')}</td>
              <td>
                <code>model@class-models.local</code>
              </td>
            </tr>
            <tr>
              <td className="py-0.5 pr-2 font-medium text-ink">{t('auth.demoClient')}</td>
              <td>
                <code>klant@class-models.local</code>
              </td>
            </tr>
            <tr>
              <td className="py-0.5 pr-2 font-medium text-ink">{t('auth.demoPhotographer')}</td>
              <td>
                <code>fotograaf@class-models.local</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-cm border border-line bg-white p-6 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-ink" htmlFor="email">
            {t('auth.email')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink" htmlFor="password">
            {t('auth.password')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-line"
          />
          {t('auth.rememberMe')}
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-burgundy py-2 text-sm text-white hover:bg-burgundyDeep disabled:opacity-60"
        >
          {busy ? t('common.busy') : t('auth.login')}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/" className="text-burgundy hover:underline">
          {t('auth.backHome')}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-sm text-muted">Laden…</div>}>
      <LoginForm />
    </Suspense>
  );
}
