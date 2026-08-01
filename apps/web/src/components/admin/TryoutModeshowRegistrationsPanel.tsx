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
  declineReason: string | null;
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
    inProgress: number;
    declined: number;
    revenuePaid: string;
  };
  groups: {
    paid: AdminRegistrationRow[];
    free: AdminRegistrationRow[];
    awaitingPayment: AdminRegistrationRow[];
    awaitingTerms: AdminRegistrationRow[];
    inProgress: AdminRegistrationRow[];
    declined: AdminRegistrationRow[];
  };
  all: AdminRegistrationRow[];
};

type TryoutRoleItem = {
  user: AdminUser;
  registration: {
    id: string | null;
    userId: string;
    interestStatus: string;
    declineReason: string | null;
    pipelinePhase: TryoutPipelinePhase;
    amount: string | null;
    isFree: boolean;
    couponCode: string | null;
    updatedAt: string | null;
  };
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

type SectionId =
  | 'ingeschreven'
  | 'in_behandeling'
  | 'niet_deelnemen'
  | 'tryout_rol'
  | 'mailen'
  | 'push'
  | 'coupons';

function phaseLabelNl(p: TryoutPipelinePhase): string {
  switch (p) {
    case 'paid':
      return 'Ingeschreven (betaald)';
    case 'awaiting_payment':
      return 'Wacht op betaling';
    case 'awaiting_terms':
      return 'Wil deelnemen — voorwaarden open';
    case 'declined':
      return 'Wil niet deelnemen';
    case 'no_response':
      return 'Nog geen keuze';
    default:
      return p;
  }
}

function fmtNlShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('nl-BE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function displayName(u: AdminUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
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
    'Reden niet-deelname',
    'Gratis',
    'Coupon',
    'Bedrag EUR',
    'Mollie status',
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
        r.declineReason ?? '',
        r.isFree ? 'ja' : 'nee',
        r.couponCode ?? '',
        r.amount ?? '',
        r.paymentStatus ?? '',
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

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'ingeschreven', label: 'Ingeschreven' },
  { id: 'in_behandeling', label: 'In behandeling' },
  { id: 'niet_deelnemen', label: 'Niet deelnemen' },
  { id: 'tryout_rol', label: 'Try-out rol' },
  { id: 'mailen', label: 'Mailen' },
  { id: 'push', label: 'Pushberichten' },
  { id: 'coupons', label: 'Coupons' },
];

export function TryoutModeshowRegistrationsPanel({
  token,
  editionSlug,
}: {
  token: string;
  editionSlug: string;
}) {
  const { can } = useAuth();
  const canWrite = can('admin.billing.write');

  const [section, setSection] = useState<SectionId>('ingeschreven');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<AdminPayload | null>(null);
  const [roleModels, setRoleModels] = useState<TryoutRoleItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedRegs, setSelectedRegs] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [mailSubject, setMailSubject] = useState('Try-out modeshow — Class-Models');
  const [mailBody, setMailBody] = useState(
    '<p>Hallo {{voornaam}},</p><p>Bericht over de Try-out Modeshow.</p><p>Class-Models</p>',
  );
  const [mailMsg, setMailMsg] = useState<string | null>(null);
  const [pushTitle, setPushTitle] = useState('Try-out modeshow');
  const [pushBody, setPushBody] = useState('Bericht over de try-out modeshow van Class-Models.');
  const [pushMsg, setPushMsg] = useState<string | null>(null);
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
      const qs = `editionSlug=${encodeURIComponent(editionSlug)}${
        q ? `&search=${encodeURIComponent(q)}` : ''
      }`;
      const [payload, rolePayload] = await Promise.all([
        adminFetch<AdminPayload>(`/admin/tryout-modeshow/registrations?${qs}`, token),
        adminFetch<{ items: TryoutRoleItem[] }>(`/admin/tryout-modeshow/tryout-role-models?${qs}`, token),
      ]);
      setData(payload);
      setRoleModels(rolePayload.items);
      try {
        setCoupons(await adminFetch<CouponRow[]>('/admin/tryout-modeshow/coupons', token));
      } catch {
        setCoupons([]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setData(null);
      setRoleModels([]);
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

  const sectionRows = useMemo(() => {
    if (!data) return [] as AdminRegistrationRow[];
    if (section === 'ingeschreven') return data.groups.paid;
    if (section === 'in_behandeling') return data.groups.inProgress;
    if (section === 'niet_deelnemen') return data.groups.declined;
    return [];
  }, [data, section]);

  const toggleReg = (id: string) => {
    setSelectedRegs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeRegistration = async (id: string, mode: 'delete' | 'undo') => {
    if (!canWrite) return;
    const label =
      mode === 'delete'
        ? 'Deze inschrijving definitief verwijderen?'
        : 'Inschrijving ongedaan maken (status wissen)?';
    if (!window.confirm(label)) return;
    setBusy(true);
    setErr(null);
    try {
      if (mode === 'delete') {
        await adminFetch(`/admin/tryout-modeshow/registrations/${id}`, token, { method: 'DELETE' });
      } else {
        await adminFetch(`/admin/tryout-modeshow/registrations/${id}/reset`, token, { method: 'POST' });
      }
      setSelectedRegs((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Actie mislukt');
    } finally {
      setBusy(false);
    }
  };

  const sendMail = async (target: 'selection' | 'paid' | 'declined' | 'in_progress' | 'role_selection') => {
    if (!canWrite) return;
    setMailMsg(null);
    setBusy(true);
    try {
      let body: Record<string, unknown> = {
        subject: mailSubject,
        html: mailBody,
        editionSlug,
      };
      if (target === 'selection') {
        if (selectedRegs.size === 0) {
          setMailMsg('Selecteer minstens één rij in Ingeschreven / In behandeling / Niet deelnemen.');
          return;
        }
        body = { ...body, registrationIds: [...selectedRegs] };
      } else if (target === 'role_selection') {
        if (selectedUsers.size === 0) {
          setMailMsg('Selecteer minstens één model in Try-out rol.');
          return;
        }
        body = { ...body, userIds: [...selectedUsers] };
      } else if (target === 'paid') {
        body = { ...body, phases: ['paid'] };
      } else if (target === 'declined') {
        body = { ...body, phases: ['declined'] };
      } else {
        body = { ...body, phases: ['awaiting_payment', 'awaiting_terms'] };
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

  const sendPush = async (target: 'selection' | 'paid' | 'declined' | 'in_progress' | 'role_selection') => {
    if (!canWrite) return;
    setPushMsg(null);
    setBusy(true);
    try {
      let body: Record<string, unknown> = {
        title: pushTitle,
        body: pushBody,
        editionSlug,
      };
      if (target === 'selection') {
        if (selectedRegs.size === 0) {
          setPushMsg('Selecteer minstens één rij.');
          return;
        }
        body = { ...body, registrationIds: [...selectedRegs] };
      } else if (target === 'role_selection') {
        if (selectedUsers.size === 0) {
          setPushMsg('Selecteer minstens één model in Try-out rol.');
          return;
        }
        body = { ...body, userIds: [...selectedUsers] };
      } else if (target === 'paid') {
        body = { ...body, phases: ['paid'] };
      } else if (target === 'declined') {
        body = { ...body, phases: ['declined'] };
      } else {
        body = { ...body, phases: ['awaiting_payment', 'awaiting_terms'] };
      }
      const res = await adminFetch<{ targeted: number; campaignId: string }>(
        '/admin/tryout-modeshow/push',
        token,
        { method: 'POST', body: JSON.stringify(body) },
      );
      setPushMsg(`Push verstuurd naar ${res.targeted} model(len).`);
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : 'Push mislukt');
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

  const counts = data?.counts;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Try-out modeshow — backsite</p>
            <p className="mt-1 text-[11px] text-zinc-600">
              Editie: <code className="rounded bg-zinc-100 px-1 font-mono text-[11px]">{editionSlug}</code>
              {data?.generatedAt ? <> · Sync: {fmtNlShort(data.generatedAt)}</> : null}
            </p>
            {counts ? (
              <p className="mt-2 text-sm font-semibold text-zinc-900">
                Ingeschreven: {counts.paid} · In behandeling: {counts.inProgress} · Niet deelnemen:{' '}
                {counts.declined} · Omzet: €{counts.revenuePaid}
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
            {sectionRows.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    sectionRows,
                    `tryout-${section}-${editionSlug}-${new Date().toISOString().slice(0, 10)}.csv`,
                  )
                }
                className="rounded border border-zinc-300 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                CSV deze sectie
              </button>
            ) : null}
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-[11px] font-medium text-zinc-600">Zoeken (naam, e-mail, GSM)</span>
          <input
            className="mt-1 w-full max-w-lg rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm"
            placeholder="bv. jan@… / Jan / 047…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </label>

        {err ? <p className="mt-2 text-xs text-red-700">{err}</p> : null}

        <div className="mt-4 flex flex-wrap gap-1 border-b border-zinc-200 pb-px">
          {SECTIONS.map((s) => {
            const badge =
              s.id === 'ingeschreven'
                ? counts?.paid
                : s.id === 'in_behandeling'
                  ? counts?.inProgress
                  : s.id === 'niet_deelnemen'
                    ? counts?.declined
                    : s.id === 'tryout_rol'
                      ? roleModels.length
                      : null;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`rounded-t px-3 py-2 text-xs font-medium transition ${
                  section === s.id
                    ? 'border border-b-white border-zinc-300 bg-white text-zinc-900'
                    : 'border border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                {s.label}
                {badge != null ? (
                  <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] tabular-nums">
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {(section === 'ingeschreven' || section === 'in_behandeling' || section === 'niet_deelnemen') && (
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {section === 'ingeschreven'
                ? 'Ingeschreven (betaald / gratis)'
                : section === 'in_behandeling'
                  ? 'In behandeling (wil deelnemen, nog niet afgerond)'
                  : 'Wil niet deelnemen (+ reden)'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedRegs(new Set(sectionRows.map((r) => r.id)))}
                className="rounded border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
              >
                Selecteer alles ({sectionRows.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRegs(new Set())}
                className="rounded border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
              >
                Selectie wissen
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-zinc-200">
            <table className="min-w-[980px] w-full border-collapse text-left text-[11px]">
              <thead className="bg-zinc-100 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="border-b border-zinc-200 px-2 py-2">Sel</th>
                  <th className="border-b border-zinc-200 px-2 py-2">Status</th>
                  <th className="border-b border-zinc-200 px-2 py-2">Naam</th>
                  <th className="border-b border-zinc-200 px-2 py-2">E-mail</th>
                  <th className="border-b border-zinc-200 px-2 py-2">Telefoon</th>
                  {section === 'niet_deelnemen' ? (
                    <th className="border-b border-zinc-200 px-2 py-2">Reden</th>
                  ) : (
                    <>
                      <th className="border-b border-zinc-200 px-2 py-2">€</th>
                      <th className="border-b border-zinc-200 px-2 py-2">Coupon</th>
                    </>
                  )}
                  <th className="border-b border-zinc-200 px-2 py-2">Acties</th>
                </tr>
              </thead>
              <tbody>
                {sectionRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-zinc-500">
                      Geen records in deze sectie.
                    </td>
                  </tr>
                ) : (
                  sectionRows.map((r) => (
                    <tr key={r.id} className="odd:bg-white even:bg-zinc-50/90">
                      <td className="border-b border-zinc-100 px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRegs.has(r.id)}
                          onChange={() => toggleReg(r.id)}
                        />
                      </td>
                      <td className="border-b border-zinc-100 px-2 py-1.5">{phaseLabelNl(r.pipelinePhase)}</td>
                      <td className="border-b border-zinc-100 px-2 py-1.5 font-medium">{displayName(r.user)}</td>
                      <td className="border-b border-zinc-100 px-2 py-1.5">
                        <a className="underline" href={`mailto:${r.user.email}`}>
                          {r.user.email}
                        </a>
                      </td>
                      <td className="border-b border-zinc-100 px-2 py-1.5">{r.user.phone ?? '—'}</td>
                      {section === 'niet_deelnemen' ? (
                        <td className="border-b border-zinc-100 px-2 py-1.5 max-w-[280px]">
                          {r.declineReason?.trim() || '—'}
                        </td>
                      ) : (
                        <>
                          <td className="border-b border-zinc-100 px-2 py-1.5">
                            {r.amount != null ? `€${r.amount}` : '—'}
                            {r.isFree ? ' (gratis)' : ''}
                          </td>
                          <td className="border-b border-zinc-100 px-2 py-1.5 font-mono text-[10px]">
                            {r.couponCode ?? '—'}
                          </td>
                        </>
                      )}
                      <td className="border-b border-zinc-100 px-2 py-1.5">
                        {canWrite ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="text-[11px] text-amber-800 underline"
                              disabled={busy}
                              onClick={() => void removeRegistration(r.id, 'undo')}
                            >
                              Ongedaan
                            </button>
                            <button
                              type="button"
                              className="text-[11px] text-red-700 underline"
                              disabled={busy}
                              onClick={() => void removeRegistration(r.id, 'delete')}
                            >
                              Verwijderen
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'tryout_rol' && (
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Modellen met rol «tryout»
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">
                Apart overzicht van accounts met de try-out-rol, met hun huidige inschrijvingsstatus. Niet alle
                modellen — alleen deze rol.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedUsers(new Set(roleModels.map((m) => m.user.id)))}
                className="rounded border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
              >
                Selecteer alles ({roleModels.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedUsers(new Set())}
                className="rounded border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-50"
              >
                Selectie wissen
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-zinc-200">
            <table className="min-w-[900px] w-full border-collapse text-left text-[11px]">
              <thead className="bg-zinc-100 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="border-b border-zinc-200 px-2 py-2">Sel</th>
                  <th className="border-b border-zinc-200 px-2 py-2">Naam</th>
                  <th className="border-b border-zinc-200 px-2 py-2">E-mail</th>
                  <th className="border-b border-zinc-200 px-2 py-2">Status</th>
                  <th className="border-b border-zinc-200 px-2 py-2">Reden / bedrag</th>
                  <th className="border-b border-zinc-200 px-2 py-2">Acties</th>
                </tr>
              </thead>
              <tbody>
                {roleModels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-zinc-500">
                      Geen modellen met rol tryout.
                    </td>
                  </tr>
                ) : (
                  roleModels.map((m) => {
                    const regId = m.registration.id;
                    return (
                      <tr key={m.user.id} className="odd:bg-white even:bg-zinc-50/90">
                        <td className="border-b border-zinc-100 px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(m.user.id)}
                            onChange={() => toggleUser(m.user.id)}
                          />
                        </td>
                        <td className="border-b border-zinc-100 px-2 py-1.5 font-medium">
                          {displayName(m.user)}
                        </td>
                        <td className="border-b border-zinc-100 px-2 py-1.5">{m.user.email}</td>
                        <td className="border-b border-zinc-100 px-2 py-1.5">
                          {phaseLabelNl(m.registration.pipelinePhase)}
                        </td>
                        <td className="border-b border-zinc-100 px-2 py-1.5 max-w-[260px]">
                          {m.registration.pipelinePhase === 'declined'
                            ? m.registration.declineReason || '—'
                            : m.registration.amount != null
                              ? `€${m.registration.amount}${m.registration.isFree ? ' (gratis)' : ''}`
                              : '—'}
                        </td>
                        <td className="border-b border-zinc-100 px-2 py-1.5">
                          {canWrite && regId ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="text-[11px] text-amber-800 underline"
                                disabled={busy}
                                onClick={() => void removeRegistration(regId, 'undo')}
                              >
                                Ongedaan
                              </button>
                              <button
                                type="button"
                                className="text-[11px] text-red-700 underline"
                                disabled={busy}
                                onClick={() => void removeRegistration(regId, 'delete')}
                              >
                                Verwijderen
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'mailen' && (
        <div className="rounded-md border border-line bg-white p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mailen</p>
          <p className="text-[11px] text-zinc-600">
            Placeholders: <code>{'{{voornaam}}'}</code>, <code>{'{{naam}}'}</code>, <code>{'{{email}}'}</code>.
            Selecteer eerst rijen in een lijst-sectie, of mail een hele groep.
          </p>
          <label className="block text-[11px] font-medium text-zinc-600">
            Onderwerp
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              value={mailSubject}
              onChange={(e) => setMailSubject(e.target.value)}
              disabled={!canWrite}
            />
          </label>
          <label className="block text-[11px] font-medium text-zinc-600">
            Bericht (HTML)
            <textarea
              className="mt-1 min-h-[120px] w-full rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
              value={mailBody}
              onChange={(e) => setMailBody(e.target.value)}
              disabled={!canWrite}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void sendMail('selection')}
              className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Mail selectie inschrijvingen ({selectedRegs.size})
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void sendMail('role_selection')}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Mail selectie try-out rol ({selectedUsers.size})
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void sendMail('paid')}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Alle ingeschreven
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void sendMail('in_progress')}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Alle in behandeling
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void sendMail('declined')}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Alle niet-deelnemers
            </button>
          </div>
          {mailMsg ? <p className="text-xs text-zinc-700">{mailMsg}</p> : null}
          {!canWrite ? <p className="text-xs text-amber-800">Mailen vereist admin.billing.write.</p> : null}
        </div>
      )}

      {section === 'push' && (
        <div className="rounded-md border border-line bg-white p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pushberichten</p>
          <p className="text-[11px] text-zinc-600">
            Stuur een push naar geselecteerde of hele groepen (ingeschreven / in behandeling / niet deelnemen /
            try-out rol).
          </p>
          <label className="block text-[11px] font-medium text-zinc-600">
            Titel
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              disabled={!canWrite}
            />
          </label>
          <label className="block text-[11px] font-medium text-zinc-600">
            Bericht
            <textarea
              className="mt-1 min-h-[80px] w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              disabled={!canWrite}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void sendPush('selection')}
              className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Push selectie inschrijvingen ({selectedRegs.size})
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void sendPush('role_selection')}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Push selectie try-out rol ({selectedUsers.size})
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void sendPush('paid')}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Alle ingeschreven
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void sendPush('in_progress')}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Alle in behandeling
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void sendPush('declined')}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Alle niet-deelnemers
            </button>
          </div>
          {pushMsg ? <p className="text-xs text-zinc-700">{pushMsg}</p> : null}
          {!canWrite ? <p className="text-xs text-amber-800">Push vereist admin.billing.write.</p> : null}
        </div>
      )}

      {section === 'coupons' && (
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
      )}
    </div>
  );
}
