'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/admin-api';
import { useAuth } from '@/context/auth-context';

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
  gender: string | null;
  age: number | null;
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
  listPrice: string | null;
  discountAmount: string | null;
  isFree: boolean;
  couponCode: string | null;
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
    free: number;
    awaitingPayment: number;
    awaitingTerms: number;
    declined: number;
    noResponse: number;
    revenuePaid: string;
  };
  groups: {
    paid: AdminRegistrationRow[];
    free: AdminRegistrationRow[];
    awaitingPayment: AdminRegistrationRow[];
    awaitingTerms: AdminRegistrationRow[];
    declined: AdminRegistrationRow[];
    noResponse: AdminRegistrationRow[];
  };
  all: AdminRegistrationRow[];
};

type CouponRow = {
  id: string;
  code: string;
  discountType: string;
  discountValue: string;
  maxTotalUses: number | null;
  maxUsesPerUser: number;
  usedCount: number;
  active: boolean;
  editionSlug: string | null;
  note: string | null;
};

function phaseLabelNl(p: TryoutPipelinePhase): string {
  switch (p) {
    case 'paid':
      return 'Deelname (betaald)';
    case 'awaiting_payment':
      return 'Wacht op betaling';
    case 'awaiting_terms':
      return 'Wil deelnemen — voorwaarden open';
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
    'Geslacht',
    'Leeftijd',
    'Gratis',
    'Coupon',
    'Lijstprijs',
    'Korting',
    'Bedrag EUR',
    'Mollie status',
    'Mollie id',
    'Voorwaarden',
    'Gewijzigd',
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
        r.user.gender ?? '',
        r.user.age != null ? String(r.user.age) : '',
        r.isFree ? 'ja' : 'nee',
        r.couponCode ?? '',
        r.listPrice ?? '',
        r.discountAmount ?? '',
        r.amount ?? '',
        r.paymentStatus ?? '',
        r.molliePaymentId ?? '',
        r.termsAcceptedAt ?? '',
        r.updatedAt,
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

type PhaseFilter = 'all' | 'free' | TryoutPipelinePhase;

export function TryoutModeshowRegistrationsPanel({
  token,
  editionSlug,
}: {
  token: string;
  editionSlug: string;
}) {
  const { can } = useAuth();
  const canWrite = can('admin.billing.write');

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [data, setData] = useState<AdminPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mailSubject, setMailSubject] = useState('Try-out modeshow — Class-Models');
  const [mailBody, setMailBody] = useState(
    '<p>Hallo {{voornaam}},</p><p>Bericht over de Try-out Modeshow.</p><p>Class-Models</p>',
  );
  const [mailMsg, setMailMsg] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '10',
    maxTotalUses: '',
    maxUsesPerUser: '1',
    note: '',
  });

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
      const couponRows = await adminFetch<CouponRow[]>('/admin/tryout-modeshow/coupons', token);
      setCoupons(couponRows);
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
    if (phaseFilter === 'free') return data.groups.free;
    return data.all.filter((r) => r.pipelinePhase === phaseFilter);
  }, [data, phaseFilter]);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectFiltered = () => {
    setSelected(new Set(filteredRows.map((r) => r.id)));
  };

  const sendMail = async (mode: 'selection' | 'phase') => {
    if (!canWrite) return;
    setMailMsg(null);
    setBusy(true);
    try {
      const body =
        mode === 'selection'
          ? { registrationIds: [...selected], subject: mailSubject, html: mailBody, editionSlug }
          : {
              phases:
                phaseFilter === 'all'
                  ? undefined
                  : phaseFilter === 'free'
                    ? (['paid'] as TryoutPipelinePhase[])
                    : ([phaseFilter] as TryoutPipelinePhase[]),
              registrationIds:
                phaseFilter === 'free' ? data?.groups.free.map((r) => r.id) : undefined,
              subject: mailSubject,
              html: mailBody,
              editionSlug,
            };
      if (mode === 'phase' && phaseFilter === 'all') {
        setMailMsg('Kies eerst een fase (bv. Geen deelname) of selecteer rijen.');
        return;
      }
      if (mode === 'selection' && selected.size === 0) {
        setMailMsg('Selecteer minstens één rij.');
        return;
      }
      const res = await adminFetch<{ sent: number; failed: number; targeted: number }>(
        '/admin/tryout-modeshow/mail',
        token,
        { method: 'POST', body: JSON.stringify(body) },
      );
      setMailMsg(`Verzonden: ${res.sent}/${res.targeted}${res.failed ? ` (mislukt: ${res.failed})` : ''}`);
    } catch (e) {
      setMailMsg(e instanceof Error ? e.message : 'Mailen mislukt');
    } finally {
      setBusy(false);
    }
  };

  const createCoupon = async () => {
    if (!canWrite) return;
    setBusy(true);
    setErr(null);
    try {
      await adminFetch('/admin/tryout-modeshow/coupons', token, {
        method: 'POST',
        body: JSON.stringify({
          code: couponForm.code,
          discountType: couponForm.discountType,
          discountValue: parseFloat(couponForm.discountValue),
          maxTotalUses: couponForm.maxTotalUses ? parseInt(couponForm.maxTotalUses, 10) : null,
          maxUsesPerUser: parseInt(couponForm.maxUsesPerUser, 10) || 1,
          note: couponForm.note || null,
          editionSlug,
        }),
      });
      setCouponForm({
        code: '',
        discountType: 'percent',
        discountValue: '10',
        maxTotalUses: '',
        maxUsesPerUser: '1',
        note: '',
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Coupon aanmaken mislukt');
    } finally {
      setBusy(false);
    }
  };

  const toggleCouponActive = async (c: CouponRow) => {
    if (!canWrite) return;
    await adminFetch(`/admin/tryout-modeshow/coupons/${c.id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ active: !c.active }),
    });
    await load();
  };

  const countTiles = data?.counts;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Registraties</p>
            <p className="mt-1 text-[11px] text-zinc-600">
              Editie: <code className="rounded bg-zinc-100 px-1 font-mono text-[11px]">{editionSlug}</code>
              {data?.generatedAt ? <> · Sync: {fmtNlShort(data.generatedAt)}</> : null}
            </p>
            {countTiles ? (
              <p className="mt-2 text-sm font-semibold text-zinc-900">
                Omzet betaald: €{countTiles.revenuePaid} · Gratis: {countTiles.free}
              </p>
            ) : null}
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
              disabled={!filteredRows.length}
              onClick={() =>
                downloadCsv(
                  filteredRows,
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
            placeholder="bv. jan@… / Jan / 047…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </label>

        {err ? <p className="mt-2 text-xs text-red-700">{err}</p> : null}

        {countTiles ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {(
              [
                ['all', 'Totaal', countTiles.total],
                ['paid', 'Deelname', countTiles.paid],
                ['free', 'Gratis', countTiles.free],
                ['awaiting_payment', 'Wacht betaling', countTiles.awaitingPayment],
                ['awaiting_terms', 'Wacht voorwaarden', countTiles.awaitingTerms],
                ['declined', 'Geen deelname', countTiles.declined],
                ['no_response', 'Geen keuze', countTiles.noResponse],
              ] as const
            ).map(([key, label, n]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPhaseFilter(key as PhaseFilter)}
                className={`rounded border px-3 py-2 text-left text-xs transition ${
                  phaseFilter === key
                    ? 'border-zinc-900 bg-zinc-100 text-zinc-900'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white'
                }`}
              >
                <span className="block font-semibold">{label}</span>
                <span className="text-lg font-bold tabular-nums">{n}</span>
              </button>
            ))}
            <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs text-emerald-950">
              <span className="block font-semibold">Omzet</span>
              <span className="text-lg font-bold tabular-nums">€{countTiles.revenuePaid}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectFiltered}
            className="rounded border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
          >
            Selecteer zichtbare ({filteredRows.length})
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="rounded border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
          >
            Selectie wissen
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-[1100px] w-full border-collapse text-left text-[11px]">
            <thead className="bg-zinc-100 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="border-b border-zinc-200 px-2 py-2">Sel</th>
                <th className="border-b border-zinc-200 px-2 py-2">Fase</th>
                <th className="border-b border-zinc-200 px-2 py-2">Voornaam</th>
                <th className="border-b border-zinc-200 px-2 py-2">Naam</th>
                <th className="border-b border-zinc-200 px-2 py-2">E-mail</th>
                <th className="border-b border-zinc-200 px-2 py-2">Telefoon</th>
                <th className="border-b border-zinc-200 px-2 py-2">Geslacht</th>
                <th className="border-b border-zinc-200 px-2 py-2">Leeftijd</th>
                <th className="border-b border-zinc-200 px-2 py-2">€</th>
                <th className="border-b border-zinc-200 px-2 py-2">Coupon</th>
                <th className="border-b border-zinc-200 px-2 py-2">Gratis</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-sm text-zinc-500">
                    Geen registraties voor deze filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.id} className="odd:bg-white even:bg-zinc-50/90">
                    <td className="border-b border-zinc-100 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleRow(r.id)}
                      />
                    </td>
                    <td className="border-b border-zinc-100 px-2 py-1.5">{phaseLabelNl(r.pipelinePhase)}</td>
                    <td className="border-b border-zinc-100 px-2 py-1.5 font-medium">{r.user.firstName ?? '—'}</td>
                    <td className="border-b border-zinc-100 px-2 py-1.5 font-medium">{r.user.lastName ?? '—'}</td>
                    <td className="border-b border-zinc-100 px-2 py-1.5">
                      <a className="underline" href={`mailto:${r.user.email}`}>
                        {r.user.email}
                      </a>
                    </td>
                    <td className="border-b border-zinc-100 px-2 py-1.5">{r.user.phone ?? '—'}</td>
                    <td className="border-b border-zinc-100 px-2 py-1.5">{r.user.gender ?? '—'}</td>
                    <td className="border-b border-zinc-100 px-2 py-1.5">{r.user.age ?? '—'}</td>
                    <td className="border-b border-zinc-100 px-2 py-1.5">
                      {r.amount != null ? `€${r.amount}` : '—'}
                    </td>
                    <td className="border-b border-zinc-100 px-2 py-1.5 font-mono text-[10px]">
                      {r.couponCode ?? '—'}
                    </td>
                    <td className="border-b border-zinc-100 px-2 py-1.5">{r.isFree ? 'ja' : 'nee'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-line bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mailen</p>
        <p className="mt-1 text-[11px] text-zinc-600">
          Placeholders: <code>{'{{voornaam}}'}</code>, <code>{'{{naam}}'}</code>, <code>{'{{email}}'}</code>
        </p>
        <label className="mt-3 block text-[11px] font-medium text-zinc-600">
          Onderwerp
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            value={mailSubject}
            onChange={(e) => setMailSubject(e.target.value)}
            disabled={!canWrite}
          />
        </label>
        <label className="mt-3 block text-[11px] font-medium text-zinc-600">
          Bericht (HTML)
          <textarea
            className="mt-1 min-h-[120px] w-full rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
            value={mailBody}
            onChange={(e) => setMailBody(e.target.value)}
            disabled={!canWrite}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canWrite || busy || selected.size === 0}
            onClick={() => void sendMail('selection')}
            className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Mail selectie ({selected.size})
          </button>
          <button
            type="button"
            disabled={!canWrite || busy || phaseFilter === 'all'}
            onClick={() => void sendMail('phase')}
            className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Mail huidige fase
          </button>
        </div>
        {mailMsg ? <p className="mt-2 text-xs text-zinc-700">{mailMsg}</p> : null}
        {!canWrite ? (
          <p className="mt-2 text-xs text-amber-800">Mailen vereist admin.billing.write.</p>
        ) : null}
      </div>

      <div className="rounded-md border border-line bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Couponcodes</p>
        <p className="mt-1 text-[11px] text-zinc-600">
          % of € korting, max. gebruik totaal en per persoon. Modellen geven de code in bij inschrijven.
        </p>

        {canWrite ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <input
              className="rounded border border-zinc-300 px-2 py-1.5 text-xs uppercase"
              placeholder="CODE"
              value={couponForm.code}
              onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
            />
            <select
              className="rounded border border-zinc-300 px-2 py-1.5 text-xs"
              value={couponForm.discountType}
              onChange={(e) =>
                setCouponForm({
                  ...couponForm,
                  discountType: e.target.value as 'percent' | 'fixed',
                })
              }
            >
              <option value="percent">% korting</option>
              <option value="fixed">€ korting</option>
            </select>
            <input
              className="rounded border border-zinc-300 px-2 py-1.5 text-xs"
              placeholder="Waarde"
              value={couponForm.discountValue}
              onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
            />
            <input
              className="rounded border border-zinc-300 px-2 py-1.5 text-xs"
              placeholder="Max totaal (leeg = ∞)"
              value={couponForm.maxTotalUses}
              onChange={(e) => setCouponForm({ ...couponForm, maxTotalUses: e.target.value })}
            />
            <input
              className="rounded border border-zinc-300 px-2 py-1.5 text-xs"
              placeholder="Max per persoon"
              value={couponForm.maxUsesPerUser}
              onChange={(e) => setCouponForm({ ...couponForm, maxUsesPerUser: e.target.value })}
            />
            <button
              type="button"
              disabled={busy || !couponForm.code.trim()}
              onClick={() => void createCoupon()}
              className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Aanmaken
            </button>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-left text-[11px]">
            <thead className="bg-zinc-100 text-[10px] uppercase text-zinc-600">
              <tr>
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Waarde</th>
                <th className="px-2 py-2">Gebruikt</th>
                <th className="px-2 py-2">Max / persoon</th>
                <th className="px-2 py-2">Actief</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-zinc-500">
                    Nog geen coupons.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="border-t border-zinc-100">
                    <td className="px-2 py-1.5 font-mono font-semibold">{c.code}</td>
                    <td className="px-2 py-1.5">{c.discountType === 'percent' ? '%' : '€'}</td>
                    <td className="px-2 py-1.5">{c.discountValue}</td>
                    <td className="px-2 py-1.5">
                      {c.usedCount}
                      {c.maxTotalUses != null ? ` / ${c.maxTotalUses}` : ' / ∞'}
                    </td>
                    <td className="px-2 py-1.5">{c.maxUsesPerUser}</td>
                    <td className="px-2 py-1.5">
                      {canWrite ? (
                        <button
                          type="button"
                          className="underline"
                          onClick={() => void toggleCouponActive(c)}
                        >
                          {c.active ? 'Actief' : 'Uit'}
                        </button>
                      ) : c.active ? (
                        'Actief'
                      ) : (
                        'Uit'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
