'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { redirectAfterPortalAuth } from '@/lib/redirect-after-auth';

function normalizeTokenFromUrl(raw: string): string {
  let t = raw.trim();
  try {
    t = decodeURIComponent(t);
  } catch {
    /* */
  }
  return t.replace(/\s+/g, '');
}

export function ResetPasswordForm({ tokenFromUrl }: { tokenFromUrl: string }) {
  const token = normalizeTokenFromUrl(tokenFromUrl);
  const { applySessionToken } = useAuth();
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(
    token.length < 32 ? 'Deze link is onvolledig. Vraag een nieuwe link aan via wachtwoord vergeten.' : null,
  );
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (token.length < 32) {
      setErr('Ongeldige link. Vraag opnieuw een reset aan.');
      return;
    }
    if (pw !== pw2) {
      setErr('Wachtwoorden komen niet overeen.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ access_token: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: pw }),
      });
      const u = await applySessionToken(res.access_token);
      redirectAfterPortalAuth(u, router);
    } catch (er) {
      setErr(er instanceof Error ? er.message : 'Reset mislukt.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-2xl text-burgundy">Nieuw wachtwoord</h1>
      {err ? <p className="mt-3 text-sm text-red-700">{err}</p> : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          type="password"
          className="w-full rounded-cm border border-line px-3 py-2 text-sm"
          placeholder="Nieuw wachtwoord (min. 8)"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          minLength={8}
          disabled={token.length < 32}
        />
        <input
          type="password"
          className="w-full rounded-cm border border-line px-3 py-2 text-sm"
          placeholder="Opnieuw"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          required
          minLength={8}
          disabled={token.length < 32}
        />
        <button
          type="submit"
          disabled={busy || token.length < 32}
          className="w-full rounded-cm bg-burgundy py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Wachtwoord opslaan
        </button>
      </form>
      <Link href="/wachtwoord-vergeten" className="mt-6 inline-block text-sm text-burgundy underline">
        Nieuwe link aanvragen
      </Link>
    </div>
  );
}
