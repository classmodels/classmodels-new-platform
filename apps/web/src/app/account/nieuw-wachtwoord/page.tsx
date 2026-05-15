'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { redirectAfterPortalAuth } from '@/lib/redirect-after-auth';

export default function NieuwWachtwoordPage() {
  const { token, user, applySessionToken } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token || !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <p className="text-sm text-muted">Je bent niet ingelogd.</p>
        <a href="/" className="mt-4 inline-block text-sm text-burgundy underline">
          Naar beginpagina
        </a>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (next !== next2) {
      setErr('De nieuwe wachtwoorden komen niet overeen.');
      return;
    }
    if (next.length < 8) {
      setErr('Minimaal 8 tekens.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ access_token: string }>('/auth/change-password', {
        method: 'POST',
        token,
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const u = await applySessionToken(res.access_token);
      redirectAfterPortalAuth(u, router);
    } catch (er) {
      setErr(er instanceof Error ? er.message : 'Wijzigen mislukt.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-2xl text-burgundy">Nieuw wachtwoord kiezen</h1>
      <p className="mt-2 text-sm text-muted">
        Je logde in met een tijdelijk wachtwoord. Kies nu een eigen wachtwoord (min. 8 tekens).
      </p>
      {err ? <p className="mt-3 text-sm text-red-700">{err}</p> : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          type="password"
          className="w-full rounded-cm border border-line px-3 py-2 text-sm"
          placeholder="Huidig (tijdelijk) wachtwoord"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full rounded-cm border border-line px-3 py-2 text-sm"
          placeholder="Nieuw wachtwoord"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={8}
        />
        <input
          type="password"
          className="w-full rounded-cm border border-line px-3 py-2 text-sm"
          placeholder="Nieuw wachtwoord opnieuw"
          value={next2}
          onChange={(e) => setNext2(e.target.value)}
          required
          minLength={8}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-cm bg-burgundy py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Opslaan en verder
        </button>
      </form>
    </div>
  );
}
