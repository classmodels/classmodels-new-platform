'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { MODEL_BTN_GOLD, MODEL_BTN_SILVER } from '@/components/model-portal/model-portal-buttons';

type Sub = {
  id: string;
  status: string;
  amount: string;
  createdAt: string;
  molliePaymentId?: string | null;
  user: { email: string };
};

type OverviewModel = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isPremium: boolean;
  premiumUntil: string | null;
  premiumActive: boolean;
  createdAt: string;
  roleSlugs: string[];
};

type Overview = {
  totalModelAccounts: number;
  premiumActiveCount: number;
  nonPremiumCount: number;
  models: OverviewModel[];
};

function nameOf(m: OverviewModel): string {
  const n = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return n || m.email;
}

export default function AdminPremiumPage() {
  const { token, can } = useAuth();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'premium' | 'basic'>('all');

  const canWriteUsers = can('admin.users.write');

  const load = useCallback(async () => {
    if (!token) return;
    setLoadErr(null);
    try {
      const [s, o] = await Promise.all([
        adminFetch<Sub[]>('/admin/subscriptions', token),
        adminFetch<Overview>('/admin/premium/overview', token),
      ]);
      setSubs(s);
      setOverview(o);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Laden mislukt');
      setSubs([]);
      setOverview(null);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredModels = useMemo(() => {
    if (!overview) return [];
    if (filter === 'premium') return overview.models.filter((m) => m.premiumActive);
    if (filter === 'basic') return overview.models.filter((m) => !m.premiumActive);
    return overview.models;
  }, [overview, filter]);

  const paidSubs = useMemo(() => subs.filter((s) => s.status === 'paid' || s.status === 'completed'), [subs]);

  const setPremium = async (id: string, next: boolean) => {
    if (!token || !canWriteUsers) return;
    setBusyId(id);
    setLoadErr(null);
    try {
      await adminFetch(`/admin/users/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ isPremium: next }),
      });
      await load();
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusyId(null);
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Premium — modellen</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Overzicht van modelaccounts, betalingen via Mollie en handmatige premium-status. Voor volledig
          gebruikersbeheer zie ook{' '}
          <Link href="/admin/gebruikers" className="text-burgundy hover:underline">
            Gebruikers
          </Link>
          .
        </p>
      </div>

      {loadErr ? <p className="text-sm text-red-600">{loadErr}</p> : null}

      {overview ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Modelaccounts</p>
            <p className="mt-1 font-serif text-3xl font-semibold tabular-nums text-ink">{overview.totalModelAccounts}</p>
            <p className="mt-1 text-xs text-muted">Actieve accounts met modellenrol</p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">Premium actief</p>
            <p className="mt-1 font-serif text-3xl font-semibold tabular-nums text-emerald-900">
              {overview.premiumActiveCount}
            </p>
            <p className="mt-1 text-xs text-emerald-900/80">Geldige premium (flag + eventuele datum)</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-600">Zonder premium</p>
            <p className="mt-1 font-serif text-3xl font-semibold tabular-nums text-zinc-900">
              {overview.nonPremiumCount}
            </p>
            <p className="mt-1 text-xs text-muted">Basisportaal — geen push e.d.</p>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Modellenlijst</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'Alle'],
                ['premium', 'Alleen premium'],
                ['basic', 'Alleen basis'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  filter === id ? 'border-burgundy bg-burgundy text-white' : 'border-line bg-white text-ink hover:bg-panel'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-panel text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">E-mail</th>
                <th className="px-3 py-2">Rollen</th>
                <th className="px-3 py-2">Premium</th>
                <th className="px-3 py-2">Tot</th>
                <th className="px-3 py-2">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-3 py-2 font-medium text-ink">{nameOf(m)}</td>
                  <td className="px-3 py-2 text-muted">{m.email}</td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-xs text-muted">{m.roleSlugs.join(', ')}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        m.premiumActive ? 'rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900' : 'text-xs text-muted'
                      }
                    >
                      {m.premiumActive ? 'Actief' : 'Nee'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {m.premiumUntil ? new Date(m.premiumUntil).toLocaleDateString('nl-BE') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {canWriteUsers ? (
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={busyId === m.id || m.premiumActive}
                          onClick={() => void setPremium(m.id, true)}
                          className={`px-2 py-0.5 text-[10px] ${MODEL_BTN_GOLD}`}
                        >
                          Premium worden
                        </button>
                        <button
                          type="button"
                          disabled={busyId === m.id || !m.premiumActive}
                          onClick={() => void setPremium(m.id, false)}
                          className="rounded border border-zinc-400 bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-zinc-800 hover:bg-zinc-50 disabled:opacity-40"
                        >
                          Uit
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">Alleen lezen</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!canWriteUsers ? (
          <p className="text-xs text-muted">
            Handmatig premium aan/uit vereist <code className="rounded bg-panel px-1">admin.users.write</code>.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Mollie — abonnementregels (laatste 200)</h2>
        <p className="text-xs text-muted">
          Status <code className="rounded bg-panel px-1">paid</code> of vergelijkbaar na webhook. Teller premium:{' '}
          <strong>{paidSubs.length}</strong> betaalde registraties in dit overzicht.
        </p>
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
          <table className="min-w-full text-xs">
            <thead className="bg-panel text-left text-muted">
              <tr>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Gebruiker</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Bedrag</th>
                <th className="px-3 py-2">Mollie</th>
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
      </section>
    </div>
  );
}
