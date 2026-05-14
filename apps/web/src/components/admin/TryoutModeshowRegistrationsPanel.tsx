'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/admin-api';

export type TryoutPipelinePhase =
  | 'paid'
  | 'awaiting_payment'
  | 'awaiting_terms'
  | 'declined'
  | 'no_response';

type AdminUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  legacyWpUserId: number | null;
  accountStatus: string;
  accountCreatedAt: string;
};

export type AdminRegistrationRow = {
  id: string;
  userId: string;
  editionSlug: string;
  interestStatus: string;
  termsAcceptedAt: string | null;
  molliePaymentId: string | null;
  paymentStatus: string | null;
  amount: string | null;
  createdAt: string;
  updatedAt: string;
  pipelinePhase: TryoutPipelinePhase;
  user: AdminUser;
};

type AdminPayload = {
  editionSlug: string;
  search: string | null;
  generatedAt: string;
  counts: {
    total: number;
    paid: number;
    awaitingPayment: number;
    awaitingTerms: number;
    declined: number;
    noResponse: number;
  };
  groups: {
    paid: AdminRegistrationRow[];
    awaitingPayment: AdminRegistrationRow[];
    awaitingTerms: AdminRegistrationRow[];
    declined: AdminRegistrationRow[];
    noResponse: AdminRegistrationRow[];
  };
  all: AdminRegistrationRow[];
};

function phaseLabelNl(p: TryoutPipelinePhase): string {
  switch (p) {
    case 'paid':
      return 'Ingeschreven (betaald)';
    case 'awaiting_payment':
      return 'Wacht op betaling (Mollie)';
    case 'awaiting_terms':
      return 'Geïnteresseerd — voorwaarden nog niet afgerond';
    case 'declined':
      return 'Geen deelname';
    case 'no_response':
      return 'Nog geen keuze';
    default:
      return p;
  }
}

function fmtNlShort(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('nl-BE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadCsv(rows: AdminRegistrationRow[], filename: string) {
  const headers = [
    'Fase',
    'Voornaam',
    'Achternaam',
    'E-mail',
    'GSM',
    'Account status',
    'WP user id',
    'Interest status',
    'Voorwaarden geaccepteerd',
    'Bedrag EUR',
    'Mollie payment status',
    'Mollie payment id',
    'Registratie aangemaakt',
    'Laatst gewijzigd',
    'User id',
    'Registratie id',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        phaseLabelNl(r.pipelinePhase),
        r.user.firstName ?? '',
        r.user.lastName ?? '',
        r.user.email,
        r.user.phone ?? '',
        r.user.accountStatus,
        r.user.legacyWpUserId != null ? String(r.user.legacyWpUserId) : '',
        r.interestStatus,
        r.termsAcceptedAt ?? '',
        r.amount ?? '',
        r.paymentStatus ?? '',
        r.molliePaymentId ?? '',
        r.createdAt,
        r.updatedAt,
        r.user.id,
        r.id,
      ]
        .map((c) => csvEscape(String(c)))
        .join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type PhaseFilter = 'all' | TryoutPipelinePhase;

export function TryoutModeshowRegistrationsPanel({
  token,
  editionSlug,
}: {
  token: string;
  editionSlug: string;
}) {
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [data, setData] = useState<AdminPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const q = search.trim();
      const url = `/admin/tryout-modeshow/registrations?editionSlug=${encodeURIComponent(editionSlug)}${
        q ? `&search=${encodeURIComponent(q)}` : ''
      }`;
      const payload = await adminFetch<AdminPayload>(url, token);
      setData(payload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setData(null);
    } finally {
      setBusy(false);
    }
  }, [token, editionSlug, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchDraft.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    if (phaseFilter === 'all') return data.all;
    return data.all.filter((r) => r.pipelinePhase === phaseFilter);
  }, [data, phaseFilter]);

  const countTiles = data?.counts;

  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Registraties</p>
          <p className="mt-1 text-[11px] text-zinc-600">
            Editie: <code className="rounded bg-zinc-100 px-1 font-mono text-[11px]">{editionSlug}</code>
            {data?.generatedAt ? <> · Sync: {fmtNlShort(data.generatedAt)}</> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy ? 'Laden…' : 'Vernieuwen'}
          </button>
          <button
            type="button"
            disabled={!data?.all.length}
            onClick={() =>
              data &&
              downloadCsv(
                phaseFilter === 'all' ? data.all : filteredRows,
                `tryout-modeshow-${editionSlug}-${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
            className="rounded border border-zinc-300 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            CSV-export
          </button>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-[11px] font-medium text-zinc-600">Zoeken (naam, e-mail, GSM, WP-id)</span>
        <input
          className="mt-1 w-full max-w-lg rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm"
          placeholder="bv. jan@… / Jan / 047… / 12345"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
        />
      </label>

      {err ? <p className="mt-2 text-xs text-red-700">{err}</p> : null}

      {countTiles ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {(
            [
              ['all', 'Totaal', countTiles.total],
              ['paid', 'Betaald', countTiles.paid],
              ['awaiting_payment', 'Wacht op betaling', countTiles.awaitingPayment],
              ['awaiting_terms', 'Wacht op voorwaarden', countTiles.awaitingTerms],
              ['declined', 'Geen deelname', countTiles.declined],
              ['no_response', 'Nog geen keuze', countTiles.noResponse],
            ] as const
          ).map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPhaseFilter(key === 'all' ? 'all' : (key as TryoutPipelinePhase))}
              className={`rounded border px-3 py-2 text-left text-xs transition ${
                (key === 'all' && phaseFilter === 'all') || (key !== 'all' && phaseFilter === key)
                  ? 'border-zinc-900 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white'
              }`}
            >
              <span className="block font-semibold">{label}</span>
              <span className="text-lg font-bold tabular-nums">{n}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded border border-zinc-200">
        <table className="min-w-[960px] w-full border-collapse text-left text-[11px]">
          <thead className="bg-zinc-100 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="border-b border-zinc-200 px-2 py-2">Fase</th>
              <th className="border-b border-zinc-200 px-2 py-2">Naam</th>
              <th className="border-b border-zinc-200 px-2 py-2">E-mail</th>
              <th className="border-b border-zinc-200 px-2 py-2">GSM</th>
              <th className="border-b border-zinc-200 px-2 py-2">Account</th>
              <th className="border-b border-zinc-200 px-2 py-2">WP</th>
              <th className="border-b border-zinc-200 px-2 py-2">Voorwaarden</th>
              <th className="border-b border-zinc-200 px-2 py-2">€</th>
              <th className="border-b border-zinc-200 px-2 py-2">Mollie</th>
              <th className="border-b border-zinc-200 px-2 py-2">Payment id</th>
              <th className="border-b border-zinc-200 px-2 py-2">Gewijzigd</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-sm text-zinc-500">
                  Geen registraties voor deze filter{search ? ' / zoekopdracht' : ''}.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} className="odd:bg-white even:bg-zinc-50/90">
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top text-zinc-800">
                    {phaseLabelNl(r.pipelinePhase)}
                  </td>
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top font-medium text-zinc-900">
                    {[r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top">
                    <a className="text-zinc-900 underline hover:text-zinc-700" href={`mailto:${r.user.email}`}>
                      {r.user.email}
                    </a>
                  </td>
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top">{r.user.phone ?? '—'}</td>
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top text-zinc-600">{r.user.accountStatus}</td>
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top">{r.user.legacyWpUserId ?? '—'}</td>
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top">{fmtNlShort(r.termsAcceptedAt)}</td>
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top">{r.amount ? `€${r.amount}` : '—'}</td>
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top">{r.paymentStatus ?? '—'}</td>
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top font-mono text-[10px] text-zinc-700">
                    {r.molliePaymentId ?? '—'}
                  </td>
                  <td className="border-b border-zinc-100 px-2 py-1.5 align-top whitespace-nowrap">
                    {fmtNlShort(r.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data?.groups ? (
        <div className="mt-6 space-y-3 text-[11px] text-zinc-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Groepen</p>
          <div className="grid gap-3 lg:grid-cols-2">
            <GroupBlok title="Ingeschreven (betaald)" rows={data.groups.paid} empty="Niemand betaald." />
            <GroupBlok title="Wacht op betaling (voorwaarden OK)" rows={data.groups.awaitingPayment} empty="Niemand in checkout." />
            <GroupBlok title="Geïnteresseerd — voorwaarden nog open" rows={data.groups.awaitingTerms} empty="Niemand in deze fase." />
            <GroupBlok title="Geen deelname" rows={data.groups.declined} empty="Niemand aangeduid." />
            <GroupBlok
              title="Nog geen keuze (portaal)"
              rows={data.groups.noResponse}
              empty="Nog geen registraties of iedereen heeft gekozen."
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GroupBlok({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: AdminRegistrationRow[];
  empty: string;
}) {
  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
        {title} ({rows.length})
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className="border-b border-zinc-200/80 pb-1.5 text-zinc-800 last:border-0 last:pb-0">
              <span className="font-medium text-zinc-900">
                {[r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || '—'}
              </span>
              <span className="text-zinc-600"> — {r.user.email}</span>
              {r.user.phone ? <span className="text-zinc-600"> · {r.user.phone}</span> : null}
              {r.molliePaymentId ? (
                <span className="block font-mono text-[10px] text-zinc-500">Mollie: {r.molliePaymentId}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
