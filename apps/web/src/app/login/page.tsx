'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { redirectAfterPortalAuth } from '@/lib/redirect-after-auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(email, password);
      redirectAfterPortalAuth(u, router);
    } catch (err) {
      let msg = 'Inloggen mislukt. Controleer e-mail en wachtwoord.';
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
      <h1 className="font-serif text-2xl text-burgundy">Inloggen</h1>
      <div className="mt-3 rounded-md border border-line bg-panel px-3 py-2 text-xs text-ink">
        <p className="font-medium text-ink">Demo (na <code className="text-[11px]">prisma db seed</code>)</p>
        <p className="mt-1 text-muted">Alle accounts gebruiken hetzelfde wachtwoord:</p>
        <p className="mt-1 font-mono text-sm text-burgundy">Demo123!</p>
        <table className="mt-2 w-full text-left text-[11px] text-muted">
          <tbody>
            <tr>
              <td className="py-0.5 pr-2 font-medium text-ink">Admin / backoffice</td>
              <td>
                <code>admin@class-models.local</code>
              </td>
            </tr>
            <tr>
              <td className="py-0.5 pr-2 font-medium text-ink">Model</td>
              <td>
                <code>model@class-models.local</code>
              </td>
            </tr>
            <tr>
              <td className="py-0.5 pr-2 font-medium text-ink">Klant</td>
              <td>
                <code>klant@class-models.local</code>
              </td>
            </tr>
            <tr>
              <td className="py-0.5 pr-2 font-medium text-ink">Fotograaf (portfolio)</td>
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
            E-mail
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
            Wachtwoord
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
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-burgundy py-2 text-sm text-white hover:bg-burgundyDeep disabled:opacity-60"
        >
          {busy ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/" className="text-burgundy hover:underline">
          ← Terug
        </Link>
      </p>
    </div>
  );
}
