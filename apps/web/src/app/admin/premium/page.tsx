'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Sub = {
  id: string;
  status: string;
  amount: string;
  createdAt: string;
  molliePaymentId?: string | null;
  user: { email: string };
};

export default function AdminPremiumPage() {
  const { token } = useAuth();
  const [subs, setSubs] = useState<Sub[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setSubs(await adminFetch<Sub[]>('/admin/subscriptions', token));
  }, [token]);

  useEffect(() => {
    load().catch(() => setSubs([]));
  }, [load]);

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Premium & betalingen</h1>
      <p className="text-sm text-muted">
        Mollie-checkout en webhooks vullen subscriptions. Gebruikersbeheer voor handmatige premium:{' '}
        <a href="/admin/gebruikers" className="text-burgundy hover:underline">
          Gebruikers
        </a>
        .
      </p>
      <div className="overflow-x-auto rounded-md border border-line bg-white text-xs shadow-sm">
        <table className="min-w-full">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Datum</th>
              <th className="px-3 py-2 text-left">Gebruiker</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Bedrag</th>
              <th className="px-3 py-2 text-left">Mollie</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-3 py-2 text-muted">{new Date(s.createdAt).toLocaleString('nl-BE')}</td>
                <td className="px-3 py-2">{s.user.email}</td>
                <td className="px-3 py-2">{s.status}</td>
                <td className="px-3 py-2">€{s.amount}</td>
                <td className="px-3 py-2 font-mono text-muted">{s.molliePaymentId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
