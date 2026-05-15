'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { redirectAfterPortalAuth } from '@/lib/redirect-after-auth';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const { applySessionToken } = useAuth();
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!token) {
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
        />
        <input
          type="password"
          className="w-full rounded-cm border border-line px-3 py-2 text-sm"
          placeholder="Opnieuw"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          required
          minLength={8}
        />
        <button
          type="submit"
          disabled={busy}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-muted">Laden…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
