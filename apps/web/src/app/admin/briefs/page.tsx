'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type ClientOpt = { id: string; email: string; roles: { role: { slug: string } }[] };

type BriefAddr = {
  organization?: string;
  street?: string;
  number?: string;
  postcode?: string;
  municipality?: string;
};

type BriefDetailsJson = {
  mainAddress?: BriefAddr;
  onLocationAddress?: BriefAddr;
  makeup?: string;
  hair?: string;
  provisionsText?: string;
  earningsText?: string;
  remarksText?: string;
  visibility?: Record<string, boolean>;
};

type BriefList = {
  id: string;
  clientId?: string;
  title: string;
  body: string;
  extraInfo?: string | null;
  eventDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  wantedMen?: number | null;
  wantedWomen?: number | null;
  wantedChildren?: number | null;
  wantedTeenagers?: number | null;
  ageManFrom?: number | null;
  ageManTo?: number | null;
  ageWomanFrom?: number | null;
  ageWomanTo?: number | null;
  ageChildFrom?: number | null;
  ageChildTo?: number | null;
  ageTeenFrom?: number | null;
  ageTeenTo?: number | null;
  details?: BriefDetailsJson | Record<string, unknown> | null;
  status: string;
  createdAt: string;
  client: { email: string; companyName?: string | null; firstName?: string | null; lastName?: string | null };
  _count: { responses: number };
};

type BriefDetail = BriefList & {
  responses: {
    id: string;
    message: string;
    status: string;
    model: { id: string; email: string; firstName?: string | null; lastName?: string | null };
  }[];
};

type MatchSummary = {
  briefId: string;
  eligibleCount: number;
  ineligibleCount: number;
  eligible: { id: string; email: string; firstName: string | null; lastName: string | null; reason: string }[];
};

type BriefForm = {
  clientId: string;
  title: string;
  body: string;
  extraInfo: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  wantedMen: string;
  wantedWomen: string;
  wantedChildren: string;
  wantedTeenagers: string;
  ageManFrom: string;
  ageManTo: string;
  ageWomanFrom: string;
  ageWomanTo: string;
  ageChildFrom: string;
  ageChildTo: string;
  ageTeenFrom: string;
  ageTeenTo: string;
  addrMainOrg: string;
  addrMainStreet: string;
  addrMainNr: string;
  addrMainPostcode: string;
  addrMainGemeente: string;
  addrOnOrg: string;
  addrOnStreet: string;
  addrOnNr: string;
  addrOnPostcode: string;
  addrOnGemeente: string;
  makeup: string;
  hair: string;
  provisionsText: string;
  earningsText: string;
  remarksText: string;
  status: 'open' | 'closed' | 'archived';
  eligibilityPush: boolean;
  vis_showBody: boolean;
  vis_showExtraInfo: boolean;
  vis_showClient: boolean;
  vis_showEventDate: boolean;
  vis_showTimes: boolean;
  vis_showGezochtCriteria: boolean;
  vis_showMainAddress: boolean;
  vis_showOnLocationAddress: boolean;
  vis_showMakeup: boolean;
  vis_showHair: boolean;
  vis_showProvisionsText: boolean;
  vis_showEarningsText: boolean;
  vis_showRemarksText: boolean;
};

const emptyForm = (): BriefForm => ({
  clientId: '',
  title: '',
  body: '',
  extraInfo: '',
  eventDate: '',
  startTime: '',
  endTime: '',
  wantedMen: '',
  wantedWomen: '',
  wantedChildren: '',
  wantedTeenagers: '',
  ageManFrom: '',
  ageManTo: '',
  ageWomanFrom: '',
  ageWomanTo: '',
  ageChildFrom: '',
  ageChildTo: '',
  ageTeenFrom: '',
  ageTeenTo: '',
  addrMainOrg: '',
  addrMainStreet: '',
  addrMainNr: '',
  addrMainPostcode: '',
  addrMainGemeente: '',
  addrOnOrg: '',
  addrOnStreet: '',
  addrOnNr: '',
  addrOnPostcode: '',
  addrOnGemeente: '',
  makeup: '',
  hair: '',
  provisionsText: '',
  earningsText: '',
  remarksText: '',
  status: 'open',
  eligibilityPush: false,
  vis_showBody: true,
  vis_showExtraInfo: true,
  vis_showClient: true,
  vis_showEventDate: true,
  vis_showTimes: true,
  vis_showGezochtCriteria: true,
  vis_showMainAddress: true,
  vis_showOnLocationAddress: true,
  vis_showMakeup: true,
  vis_showHair: true,
  vis_showProvisionsText: true,
  vis_showEarningsText: true,
  vis_showRemarksText: true,
});

function numOrUndef(s: string): number | undefined {
  const t = s.trim();
  if (t === '') return undefined;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function detailsFromForm(f: BriefForm): BriefDetailsJson {
  return {
    mainAddress: {
      organization: f.addrMainOrg.trim() || undefined,
      street: f.addrMainStreet.trim() || undefined,
      number: f.addrMainNr.trim() || undefined,
      postcode: f.addrMainPostcode.trim() || undefined,
      municipality: f.addrMainGemeente.trim() || undefined,
    },
    onLocationAddress: {
      organization: f.addrOnOrg.trim() || undefined,
      street: f.addrOnStreet.trim() || undefined,
      number: f.addrOnNr.trim() || undefined,
      postcode: f.addrOnPostcode.trim() || undefined,
      municipality: f.addrOnGemeente.trim() || undefined,
    },
    makeup: f.makeup.trim() || undefined,
    hair: f.hair.trim() || undefined,
    provisionsText: f.provisionsText.trim() || undefined,
    earningsText: f.earningsText.trim() || undefined,
    remarksText: f.remarksText.trim() || undefined,
    visibility: {
      showBody: f.vis_showBody,
      showExtraInfo: f.vis_showExtraInfo,
      showClient: f.vis_showClient,
      showEventDate: f.vis_showEventDate,
      showTimes: f.vis_showTimes,
      showGezochtCriteria: f.vis_showGezochtCriteria,
      showMainAddress: f.vis_showMainAddress,
      showOnLocationAddress: f.vis_showOnLocationAddress,
      showMakeup: f.vis_showMakeup,
      showHair: f.vis_showHair,
      showProvisionsText: f.vis_showProvisionsText,
      showEarningsText: f.vis_showEarningsText,
      showRemarksText: f.vis_showRemarksText,
    },
  };
}

function mergeDetailsIntoForm(d: BriefDetailsJson | Record<string, unknown> | null | undefined, base: BriefForm): BriefForm {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return base;
  const x = d as BriefDetailsJson & { visibility?: Record<string, unknown> };
  const m = x.mainAddress ?? {};
  const o = x.onLocationAddress ?? {};
  const vr = x.visibility && typeof x.visibility === 'object' && !Array.isArray(x.visibility) ? x.visibility : {};
  const gb = (k: string, def: boolean) => (vr[k] === false ? false : def);
  return {
    ...base,
    addrMainOrg: str(m.organization),
    addrMainStreet: str(m.street),
    addrMainNr: str(m.number),
    addrMainPostcode: str(m.postcode),
    addrMainGemeente: str(m.municipality),
    addrOnOrg: str(o.organization),
    addrOnStreet: str(o.street),
    addrOnNr: str(o.number),
    addrOnPostcode: str(o.postcode),
    addrOnGemeente: str(o.municipality),
    makeup: str(x.makeup),
    hair: str(x.hair),
    provisionsText: str(x.provisionsText),
    earningsText: str(x.earningsText),
    remarksText: str(x.remarksText),
    vis_showBody: gb('showBody', true),
    vis_showExtraInfo: gb('showExtraInfo', true),
    vis_showClient: gb('showClient', true),
    vis_showEventDate: gb('showEventDate', true),
    vis_showTimes: gb('showTimes', true),
    vis_showGezochtCriteria: gb('showGezochtCriteria', true),
    vis_showMainAddress: gb('showMainAddress', true),
    vis_showOnLocationAddress: gb('showOnLocationAddress', true),
    vis_showMakeup: gb('showMakeup', true),
    vis_showHair: gb('showHair', true),
    vis_showProvisionsText: gb('showProvisionsText', true),
    vis_showEarningsText: gb('showEarningsText', true),
    vis_showRemarksText: gb('showRemarksText', true),
  };
}

export default function AdminBriefsPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<BriefList[]>([]);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [detail, setDetail] = useState<BriefDetail | null>(null);
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);
  const [msg, setMsg] = useState('');
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<BriefForm>(emptyForm);
  const [selElig, setSelElig] = useState<string[]>([]);
  const [selResp, setSelResp] = useState<string[]>([]);
  const [pushCustomTitle, setPushCustomTitle] = useState('');
  const [pushCustomBody, setPushCustomBody] = useState('');

  const load = useCallback(async () => {
    if (!token || !can('admin.briefs.read')) return;
    const data = await adminFetch<BriefList[]>('/admin/briefs', token);
    setRows(data);
  }, [token, can]);

  const loadClients = useCallback(async () => {
    if (!token || !can('admin.users.read')) return;
    const users = await adminFetch<ClientOpt[]>('/admin/users', token);
    setClients(users.filter((u) => u.roles.some((r) => r.role.slug === 'client')));
  }, [token, can]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  useEffect(() => {
    loadClients().catch(() => setClients([]));
  }, [loadClients]);

  const open = async (id: string) => {
    if (!token) return;
    const d = await adminFetch<BriefDetail>(`/admin/briefs/${id}`, token);
    setDetail(d);
    setMatchSummary(null);
    setSelElig([]);
    setSelResp([]);
    setPushCustomTitle('');
    setPushCustomBody('');
  };

  const loadMatching = async (id: string) => {
    if (!token) return;
    const m = await adminFetch<MatchSummary>(`/admin/briefs/${id}/matching-summary`, token);
    setMatchSummary(m);
  };

  const toForm = (b: BriefList): BriefForm => {
    const base: BriefForm = {
      ...emptyForm(),
      clientId: b.clientId ?? '',
      title: b.title,
      body: b.body,
      extraInfo: b.extraInfo ?? '',
      eventDate: b.eventDate ? b.eventDate.slice(0, 10) : '',
      startTime: b.startTime ?? '',
      endTime: b.endTime ?? '',
      wantedMen: b.wantedMen != null ? String(b.wantedMen) : '',
      wantedWomen: b.wantedWomen != null ? String(b.wantedWomen) : '',
      wantedChildren: b.wantedChildren != null ? String(b.wantedChildren) : '',
      wantedTeenagers: b.wantedTeenagers != null ? String(b.wantedTeenagers) : '',
      ageManFrom: '',
      ageManTo: '',
      ageWomanFrom: '',
      ageWomanTo: '',
      ageChildFrom: '',
      ageChildTo: '',
      ageTeenFrom: b.ageTeenFrom != null ? String(b.ageTeenFrom) : '',
      ageTeenTo: b.ageTeenTo != null ? String(b.ageTeenTo) : '',
      status: b.status as BriefForm['status'],
      eligibilityPush: false,
    };
    return mergeDetailsIntoForm((b.details as BriefDetailsJson) ?? null, base);
  };

  const startNew = () => {
    setMode('new');
    setEditId(null);
    setForm({ ...emptyForm(), clientId: clients[0]?.id ?? '' });
    setDetail(null);
    setMsg('');
  };

  const startEdit = async (id: string) => {
    if (!token) return;
    const d = await adminFetch<BriefDetail>(`/admin/briefs/${id}`, token);
    setEditId(id);
    setMode('edit');
    setDetail(null);
    const cid = d.clientId || clients.find((c) => c.email === d.client.email)?.id || '';
    let next = {
      ...toForm(d),
      clientId: cid,
      ageManFrom: d.ageManFrom != null ? String(d.ageManFrom) : '',
      ageManTo: d.ageManTo != null ? String(d.ageManTo) : '',
      ageWomanFrom: d.ageWomanFrom != null ? String(d.ageWomanFrom) : '',
      ageWomanTo: d.ageWomanTo != null ? String(d.ageWomanTo) : '',
      ageChildFrom: d.ageChildFrom != null ? String(d.ageChildFrom) : '',
      ageChildTo: d.ageChildTo != null ? String(d.ageChildTo) : '',
      ageTeenFrom: d.ageTeenFrom != null ? String(d.ageTeenFrom) : '',
      ageTeenTo: d.ageTeenTo != null ? String(d.ageTeenTo) : '',
    };
    next = mergeDetailsIntoForm((d.details as BriefDetailsJson) ?? null, next);
    setForm(next);
    setMsg('');
  };

  const payloadBody = useMemo(() => {
    const p: Record<string, unknown> = {
      title: form.title.trim(),
      body: form.body.trim(),
      extraInfo: form.extraInfo.trim() || null,
      eventDate: form.eventDate.trim() || null,
      startTime: form.startTime.trim() || null,
      endTime: form.endTime.trim() || null,
      wantedMen: numOrUndef(form.wantedMen) ?? null,
      wantedWomen: numOrUndef(form.wantedWomen) ?? null,
      wantedChildren: numOrUndef(form.wantedChildren) ?? null,
      wantedTeenagers: numOrUndef(form.wantedTeenagers) ?? null,
      ageManFrom: numOrUndef(form.ageManFrom) ?? null,
      ageManTo: numOrUndef(form.ageManTo) ?? null,
      ageWomanFrom: numOrUndef(form.ageWomanFrom) ?? null,
      ageWomanTo: numOrUndef(form.ageWomanTo) ?? null,
      ageChildFrom: numOrUndef(form.ageChildFrom) ?? null,
      ageChildTo: numOrUndef(form.ageChildTo) ?? null,
      ageTeenFrom: numOrUndef(form.ageTeenFrom) ?? null,
      ageTeenTo: numOrUndef(form.ageTeenTo) ?? null,
      details: detailsFromForm(form),
      status: form.status,
    };
    return p;
  }, [form]);

  const saveBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !can('admin.briefs.write')) return;
    setMsg('');
    try {
      if (mode === 'new') {
        if (!form.clientId) {
          setMsg('Kies een klant (eigenaar van de opdracht).');
          return;
        }
        await adminFetch('/admin/briefs', token, {
          method: 'POST',
          body: JSON.stringify({ clientId: form.clientId, ...payloadBody }),
        });
        setMsg('Opdracht aangemaakt. Modellen die in aanmerking komen, krijgen een push (indien geconfigureerd).');
      } else if (mode === 'edit' && editId) {
        const body: Record<string, unknown> = { clientId: form.clientId || undefined, ...payloadBody };
        if (form.eligibilityPush) body.eligibilityPush = true;
        await adminFetch(`/admin/briefs/${editId}`, token, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setMsg(
          form.eligibilityPush
            ? 'Opdracht bijgewerkt en eligible modellen opnieuw gepusht.'
            : 'Opdracht bijgewerkt.',
        );
      }
      setMode('list');
      setEditId(null);
      setForm(emptyForm());
      await load();
    } catch (er) {
      setMsg(er instanceof Error ? er.message : 'Opslaan mislukt');
    }
  };

  const patchResponse = async (responseId: string, status: 'accepted' | 'declined') => {
    if (!token || !can('admin.briefs.write')) return;
    await adminFetch(`/admin/briefs/model-responses/${responseId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setMsg('Reactie bijgewerkt; model ontvangt een push.');
    if (detail) await open(detail.id);
    await load();
  };

  const downloadContract = async (responseId: string) => {
    if (!token || !detail) return;
    setMsg('');
    try {
      const data = await adminFetch<{ html: string; notified: boolean }>(
        `/admin/briefs/${detail.id}/responses/${responseId}/contract`,
        token,
        { method: 'POST' },
      );
      const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `overeenkomst-${detail.id.slice(0, 8)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(
        data.notified
          ? 'HTML-contract gedownload. Model kreeg een push (prototype).'
          : 'HTML-contract gedownload.',
      );
    } catch (er) {
      setMsg(er instanceof Error ? er.message : 'Contract mislukt');
    }
  };

  const pushSelectedUsers = async (userIds: string[]) => {
    if (!token || !detail || !can('admin.briefs.write')) return;
    if (!userIds.length) {
      setMsg('Vink eerst modellen aan.');
      return;
    }
    setMsg('');
    try {
      await adminFetch(`/admin/briefs/${detail.id}/push-selected`, token, {
        method: 'POST',
        body: JSON.stringify({
          userIds,
          title: pushCustomTitle.trim() || undefined,
          body: pushCustomBody.trim() || undefined,
        }),
      });
      setMsg(`Push verstuurd naar ${userIds.length} model(len).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Push mislukt');
    }
  };

  const sendContractPdfMails = async () => {
    if (!token || !detail || !can('admin.briefs.write')) return;
    if (!selElig.length) {
      setMsg('Vink modellen in aanmerking aan voor de PDF-mail.');
      return;
    }
    setMsg('');
    try {
      const res = await adminFetch<{ sentCount: number; errors: { userId: string; error: string }[] }>(
        `/admin/briefs/${detail.id}/email-contract-pdf`,
        token,
        { method: 'POST', body: JSON.stringify({ userIds: selElig }) },
      );
      const errTxt =
        res.errors?.length > 0
          ? ` Fouten: ${res.errors.map((x) => `${x.userId.slice(0, 8)}… ${x.error}`).join('; ')}`
          : '';
      setMsg(`PDF per e-mail: ${res.sentCount} verzonden.${errTxt}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'E-mail mislukt');
    }
  };

  const quickStatus = async (id: string, status: string) => {
    if (!token || !can('admin.briefs.write')) return;
    await adminFetch(`/admin/briefs/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setMsg('Status bijgewerkt.');
    await load();
    if (detail?.id === id) await open(id);
  };

  const detailDetails = (detail?.details as BriefDetailsJson | undefined) ?? undefined;

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.briefs.read')) {
    return <p className="text-sm text-muted">Geen toegang tot opdrachten.</p>;
  }

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Opdrachten (casting)</h1>
          <p className="mt-1 text-xs text-muted">
            Criteria (man/vrouw/kinderen/tieners + leeftijd), adres, make-up/kapsel, verdienste. Alleen profielen in
            aanmerking krijgen automatisch een push wanneer een opdracht <strong>open</strong> wordt gezet of opnieuw
            gepusht.
          </p>
        </div>
        {can('admin.briefs.write') ? (
          <div className="flex gap-2">
            {mode !== 'list' ? (
              <button
                type="button"
                className="border border-line bg-white px-3 py-1.5 text-xs font-medium hover:bg-panel"
                onClick={() => {
                  setMode('list');
                  setEditId(null);
                  setForm(emptyForm());
                }}
              >
                Annuleren
              </button>
            ) : null}
            <button
              type="button"
              className="bg-burgundy px-3 py-1.5 text-xs font-semibold text-white hover:bg-burgundyDeep"
              onClick={() => startNew()}
            >
              Nieuwe opdracht
            </button>
          </div>
        ) : null}
      </div>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}

      {mode !== 'list' && can('admin.briefs.write') ? (
        <form onSubmit={saveBrief} className="space-y-4 border border-line bg-white p-4">
          <div className="border-b-2 border-burgundy pb-1 text-xs font-bold uppercase tracking-wide text-burgundy">
            {mode === 'new' ? 'Nieuwe opdracht' : 'Opdracht bewerken'}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-ink">Klant (eigenaar) *</label>
              <select
                className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                required
                value={form.clientId}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              >
                <option value="">— Kies klant —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.email}
                  </option>
                ))}
              </select>
              {!clients.length ? (
                <p className="mt-1 text-[11px] text-amber-800">
                  Geen klanten gevonden. Maak eerst een gebruiker met rol “client” aan onder Gebruikers.
                </p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-ink">Titel *</label>
              <input
                className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-ink">Omschrijving *</label>
              <textarea
                className="mt-0.5 min-h-[100px] w-full border border-line px-2 py-1.5 text-xs"
                required
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-ink">Extra info</label>
              <textarea
                className="mt-0.5 min-h-[72px] w-full border border-line px-2 py-1.5 text-xs"
                value={form.extraInfo}
                onChange={(e) => setForm((f) => ({ ...f, extraInfo: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink">Datum (opdracht)</label>
              <input
                type="date"
                className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                value={form.eventDate}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-ink">Startuur</label>
                <input
                  type="time"
                  className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink">Einduur (optioneel)</label>
                <input
                  type="time"
                  className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="border-b-2 border-burgundy pb-1 text-[11px] font-bold uppercase tracking-wide text-burgundy">
            Gezocht (aantallen + leeftijd)
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[11px] font-semibold text-ink">Mannen</label>
              <input
                className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                inputMode="numeric"
                value={form.wantedMen}
                onChange={(e) => setForm((f) => ({ ...f, wantedMen: e.target.value }))}
              />
              <div className="mt-1 grid grid-cols-2 gap-1">
                <input
                  placeholder="leeftijd van"
                  className="border border-line px-1 py-0.5 text-[10px]"
                  value={form.ageManFrom}
                  onChange={(e) => setForm((f) => ({ ...f, ageManFrom: e.target.value }))}
                />
                <input
                  placeholder="tot"
                  className="border border-line px-1 py-0.5 text-[10px]"
                  value={form.ageManTo}
                  onChange={(e) => setForm((f) => ({ ...f, ageManTo: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink">Vrouwen</label>
              <input
                className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                inputMode="numeric"
                value={form.wantedWomen}
                onChange={(e) => setForm((f) => ({ ...f, wantedWomen: e.target.value }))}
              />
              <div className="mt-1 grid grid-cols-2 gap-1">
                <input
                  placeholder="van"
                  className="border border-line px-1 py-0.5 text-[10px]"
                  value={form.ageWomanFrom}
                  onChange={(e) => setForm((f) => ({ ...f, ageWomanFrom: e.target.value }))}
                />
                <input
                  placeholder="tot"
                  className="border border-line px-1 py-0.5 text-[10px]"
                  value={form.ageWomanTo}
                  onChange={(e) => setForm((f) => ({ ...f, ageWomanTo: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink">Kinderen</label>
              <input
                className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                inputMode="numeric"
                value={form.wantedChildren}
                onChange={(e) => setForm((f) => ({ ...f, wantedChildren: e.target.value }))}
              />
              <div className="mt-1 grid grid-cols-2 gap-1">
                <input
                  placeholder="van"
                  className="border border-line px-1 py-0.5 text-[10px]"
                  value={form.ageChildFrom}
                  onChange={(e) => setForm((f) => ({ ...f, ageChildFrom: e.target.value }))}
                />
                <input
                  placeholder="tot"
                  className="border border-line px-1 py-0.5 text-[10px]"
                  value={form.ageChildTo}
                  onChange={(e) => setForm((f) => ({ ...f, ageChildTo: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink">Tieners</label>
              <input
                className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                inputMode="numeric"
                value={form.wantedTeenagers}
                onChange={(e) => setForm((f) => ({ ...f, wantedTeenagers: e.target.value }))}
              />
              <div className="mt-1 grid grid-cols-2 gap-1">
                <input
                  placeholder="van"
                  className="border border-line px-1 py-0.5 text-[10px]"
                  value={form.ageTeenFrom}
                  onChange={(e) => setForm((f) => ({ ...f, ageTeenFrom: e.target.value }))}
                />
                <input
                  placeholder="tot"
                  className="border border-line px-1 py-0.5 text-[10px]"
                  value={form.ageTeenTo}
                  onChange={(e) => setForm((f) => ({ ...f, ageTeenTo: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="border-b-2 border-burgundy pb-1 text-[11px] font-bold uppercase tracking-wide text-burgundy">
            Adres (hoofdlocatie)
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <input
              placeholder="Zaak / bedrijf"
              className="border border-line px-2 py-1.5 text-xs"
              value={form.addrMainOrg}
              onChange={(e) => setForm((f) => ({ ...f, addrMainOrg: e.target.value }))}
            />
            <input
              placeholder="Straat"
              className="border border-line px-2 py-1.5 text-xs"
              value={form.addrMainStreet}
              onChange={(e) => setForm((f) => ({ ...f, addrMainStreet: e.target.value }))}
            />
            <input
              placeholder="Nr"
              className="border border-line px-2 py-1.5 text-xs"
              value={form.addrMainNr}
              onChange={(e) => setForm((f) => ({ ...f, addrMainNr: e.target.value }))}
            />
            <input
              placeholder="Postcode"
              className="border border-line px-2 py-1.5 text-xs"
              value={form.addrMainPostcode}
              onChange={(e) => setForm((f) => ({ ...f, addrMainPostcode: e.target.value }))}
            />
            <input
              placeholder="Gemeente"
              className="border border-line px-2 py-1.5 text-xs"
              value={form.addrMainGemeente}
              onChange={(e) => setForm((f) => ({ ...f, addrMainGemeente: e.target.value }))}
            />
          </div>

          <div className="border-b-2 border-burgundy pb-1 text-[11px] font-bold uppercase tracking-wide text-burgundy">
            Opdracht gaat door op (optioneel tweede adres)
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <input
              placeholder="Zaak"
              className="border border-line px-2 py-1.5 text-xs"
              value={form.addrOnOrg}
              onChange={(e) => setForm((f) => ({ ...f, addrOnOrg: e.target.value }))}
            />
            <input
              placeholder="Straat"
              className="border border-line px-2 py-1.5 text-xs"
              value={form.addrOnStreet}
              onChange={(e) => setForm((f) => ({ ...f, addrOnStreet: e.target.value }))}
            />
            <input
              placeholder="Nr"
              className="border border-line px-2 py-1.5 text-xs"
              value={form.addrOnNr}
              onChange={(e) => setForm((f) => ({ ...f, addrOnNr: e.target.value }))}
            />
            <input
              placeholder="Postcode"
              className="border border-line px-2 py-1.5 text-xs"
              value={form.addrOnPostcode}
              onChange={(e) => setForm((f) => ({ ...f, addrOnPostcode: e.target.value }))}
            />
            <input
              placeholder="Gemeente"
              className="border border-line px-2 py-1.5 text-xs"
              value={form.addrOnGemeente}
              onChange={(e) => setForm((f) => ({ ...f, addrOnGemeente: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold text-ink">Make-up</label>
              <select
                className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                value={form.makeup}
                onChange={(e) => setForm((f) => ({ ...f, makeup: e.target.value }))}
              >
                <option value="">—</option>
                <option value="self">Zelf te doen</option>
                <option value="provided">Make-up aanwezig ter plaatse</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink">Kapsel</label>
              <select
                className="mt-0.5 w-full border border-line px-2 py-1.5 text-xs"
                value={form.hair}
                onChange={(e) => setForm((f) => ({ ...f, hair: e.target.value }))}
              >
                <option value="">—</option>
                <option value="self">Zelf te doen</option>
                <option value="provided">Kapper aanwezig ter plaatse</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-ink">Wat te voorzien</label>
              <textarea
                className="mt-0.5 min-h-[64px] w-full border border-line px-2 py-1.5 text-xs"
                value={form.provisionsText}
                onChange={(e) => setForm((f) => ({ ...f, provisionsText: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-ink">Verdiensten</label>
              <textarea
                className="mt-0.5 min-h-[56px] w-full border border-line px-2 py-1.5 text-xs"
                value={form.earningsText}
                onChange={(e) => setForm((f) => ({ ...f, earningsText: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-ink">Opmerkingen</label>
              <textarea
                className="mt-0.5 min-h-[56px] w-full border border-line px-2 py-1.5 text-xs"
                value={form.remarksText}
                onChange={(e) => setForm((f) => ({ ...f, remarksText: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-b-2 border-burgundy pb-1 text-[11px] font-bold uppercase tracking-wide text-burgundy">
            Zichtbaar op modellenportaal
          </div>
          <p className="text-[10px] text-muted">
            Uit = verborgen voor modellen (API filtert velden). Titel blijft altijd zichtbaar.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['vis_showBody', 'Omschrijving (body)'],
                ['vis_showExtraInfo', 'Extra info'],
                ['vis_showClient', 'Klantnaam / contactlabel'],
                ['vis_showEventDate', 'Opdrachtdatum'],
                ['vis_showTimes', 'Start- en einduur'],
                ['vis_showGezochtCriteria', 'Gezocht (mannen/vrouwen/… + leeftijd)'],
                ['vis_showMainAddress', 'Adres hoofdlocatie'],
                ['vis_showOnLocationAddress', 'Adres “door op locatie”'],
                ['vis_showMakeup', 'Make-up'],
                ['vis_showHair', 'Kapsel'],
                ['vis_showProvisionsText', 'Wat te voorzien'],
                ['vis_showEarningsText', 'Verdiensten'],
                ['vis_showRemarksText', 'Opmerkingen'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-[11px] text-ink">
                <input
                  type="checkbox"
                  checked={form[key as keyof BriefForm] as boolean}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink">Status</label>
            <select
              className="mt-0.5 border border-line px-2 py-1.5 text-xs"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BriefForm['status'] }))}
            >
              <option value="open">Open (zichtbaar voor modellen)</option>
              <option value="closed">Gesloten</option>
              <option value="archived">Gearchiveerd</option>
            </select>
          </div>

          {mode === 'edit' ? (
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink">
              <input
                type="checkbox"
                checked={form.eligibilityPush}
                onChange={(e) => setForm((f) => ({ ...f, eligibilityPush: e.target.checked }))}
              />
              Na opslaan: push opnieuw naar alle modellen die <strong>in aanmerking</strong> komen (bij open status).
            </label>
          ) : null}

          <button type="submit" className="bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink/90">
            Opslaan
          </button>
        </form>
      ) : null}

      {mode === 'list' ? (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="min-w-full text-left text-[11px]">
            <thead className="border-b border-line bg-zinc-100 text-[10px] font-bold uppercase tracking-wide text-zinc-700">
              <tr>
                <th className="px-2 py-1.5">Titel</th>
                <th className="px-2 py-1.5">Klant</th>
                <th className="px-2 py-1.5">Datum</th>
                <th className="px-2 py-1.5">Status</th>
                <th className="px-2 py-1.5">Reacties</th>
                <th className="px-2 py-1.5">Acties</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-2 py-1.5 font-medium text-ink">{r.title}</td>
                  <td className="px-2 py-1.5 text-muted">{r.client.email}</td>
                  <td className="px-2 py-1.5 text-muted">
                    {r.eventDate ? r.eventDate.slice(0, 10) : '—'}
                    {r.startTime ? ` ${r.startTime}` : ''}
                  </td>
                  <td className="px-2 py-1.5 text-muted">{r.status}</td>
                  <td className="px-2 py-1.5 text-muted">{r._count.responses}</td>
                  <td className="px-2 py-1.5">
                    <button type="button" className="text-burgundy hover:underline" onClick={() => open(r.id)}>
                      Bekijk
                    </button>
                    {can('admin.briefs.write') ? (
                      <>
                        {' · '}
                        <button type="button" className="text-burgundy hover:underline" onClick={() => startEdit(r.id)}>
                          Bewerk
                        </button>
                        {' · '}
                        <button
                          type="button"
                          className="text-burgundy hover:underline"
                          onClick={() => quickStatus(r.id, 'archived')}
                        >
                          Archiveer
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {detail && mode === 'list' ? (
        <div className="border border-line bg-white p-4 text-xs">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-burgundy pb-2">
            <h2 className="font-semibold text-ink">{detail.title}</h2>
            <button
              type="button"
              className="text-muted hover:text-ink"
              onClick={() => {
                setDetail(null);
                setMatchSummary(null);
                setSelElig([]);
                setSelResp([]);
                setPushCustomTitle('');
                setPushCustomBody('');
              }}
            >
              Sluiten
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {detail.client.email}
            {detail.client.companyName ? ` · ${detail.client.companyName}` : ''}
          </p>
          {detail.eventDate ? (
            <p className="mt-1 text-[11px] text-muted">
              Datum: {detail.eventDate.slice(0, 10)}
              {detail.startTime ? ` ${detail.startTime}` : ''}
              {detail.endTime ? ` – ${detail.endTime}` : ''}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="border border-burgundy bg-burgundy/10 px-2 py-1 text-[11px] font-semibold text-burgundy hover:bg-burgundy/20"
              onClick={() => loadMatching(detail.id)}
            >
              Wie komt in aanmerking?
            </button>
          </div>
          {matchSummary ? (
            <div className="mt-3 rounded border border-line bg-zinc-50 p-3 text-[11px]">
              <p className="font-semibold text-ink">
                In aanmerking: {matchSummary.eligibleCount} · Niet in aanmerking: {matchSummary.ineligibleCount}
              </p>
              <ul className="mt-2 max-h-52 space-y-1 overflow-auto">
                {matchSummary.eligible.slice(0, 80).map((u) => (
                  <li key={u.id} className="flex items-start gap-2 text-muted">
                    {can('admin.briefs.write') ? (
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selElig.includes(u.id)}
                        onChange={() =>
                          setSelElig((s) => (s.includes(u.id) ? s.filter((x) => x !== u.id) : [...s, u.id]))
                        }
                      />
                    ) : null}
                    <span>
                      <span className="font-medium text-ink">{u.email}</span> — {u.reason}
                    </span>
                  </li>
                ))}
              </ul>
              {matchSummary.eligible.length > 80 ? <p className="mt-1 text-[10px]">… eerste 80 getoond</p> : null}
              {can('admin.briefs.write') && matchSummary.eligible.length > 0 ? (
                <div className="mt-4 space-y-2 border-t border-line pt-3">
                  <p className="font-semibold text-burgundy">Push / contract (selectie in aanmerking)</p>
                  <input
                    className="w-full border border-line px-2 py-1 text-[11px]"
                    placeholder="Push titel (optioneel)"
                    value={pushCustomTitle}
                    onChange={(e) => setPushCustomTitle(e.target.value)}
                  />
                  <textarea
                    className="min-h-[52px] w-full border border-line px-2 py-1 text-[11px]"
                    placeholder="Push tekst (optioneel)"
                    value={pushCustomBody}
                    onChange={(e) => setPushCustomBody(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded bg-burgundy px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-burgundyDeep"
                      onClick={() => pushSelectedUsers(selElig)}
                    >
                      Push naar geselecteerden
                    </button>
                    <button
                      type="button"
                      className="rounded border border-ink bg-white px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-zinc-100"
                      onClick={() => sendContractPdfMails()}
                    >
                      E-mail PDF-contract (SMTP)
                    </button>
                  </div>
                  <p className="text-[10px] text-muted">
                    PDF-mail gebruikt <code className="rounded bg-zinc-100 px-0.5">SMTP_HOST</code> uit{' '}
                    <code className="rounded bg-zinc-100 px-0.5">apps/api/.env</code> (zelfde als agenda).
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="mt-3 whitespace-pre-wrap leading-relaxed">{detail.body}</p>
          {detail.extraInfo ? (
            <>
              <p className="mt-3 text-[11px] font-bold uppercase text-burgundy">Extra info</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{detail.extraInfo}</p>
            </>
          ) : null}

          {detailDetails?.mainAddress && Object.values(detailDetails.mainAddress).some(Boolean) ? (
            <div className="mt-3 rounded border border-line bg-white p-2">
              <p className="text-[10px] font-bold uppercase text-burgundy">Adres</p>
              <p className="mt-1 text-[11px] text-ink">
                {[detailDetails.mainAddress.organization, detailDetails.mainAddress.street, detailDetails.mainAddress.number]
                  .filter(Boolean)
                  .join(' ')}
                <br />
                {[detailDetails.mainAddress.postcode, detailDetails.mainAddress.municipality].filter(Boolean).join(' ')}
              </p>
            </div>
          ) : null}
          {detailDetails?.onLocationAddress && Object.values(detailDetails.onLocationAddress).some(Boolean) ? (
            <div className="mt-2 rounded border border-line bg-white p-2">
              <p className="text-[10px] font-bold uppercase text-burgundy">Door op locatie</p>
              <p className="mt-1 text-[11px] text-ink">
                {[detailDetails.onLocationAddress.organization, detailDetails.onLocationAddress.street, detailDetails.onLocationAddress.number]
                  .filter(Boolean)
                  .join(' ')}
                <br />
                {[detailDetails.onLocationAddress.postcode, detailDetails.onLocationAddress.municipality]
                  .filter(Boolean)
                  .join(' ')}
              </p>
            </div>
          ) : null}
          {(detailDetails?.makeup || detailDetails?.hair) ? (
            <p className="mt-2 text-[11px] text-muted">
              Make-up: {detailDetails.makeup === 'self' ? 'zelf' : detailDetails.makeup === 'provided' ? 'aanwezig' : '—'} ·
              Kapsel: {detailDetails.hair === 'self' ? 'zelf' : detailDetails.hair === 'provided' ? 'kapper aanwezig' : '—'}
            </p>
          ) : null}
          {detailDetails?.provisionsText ? (
            <p className="mt-2 whitespace-pre-wrap text-[11px] text-ink">{detailDetails.provisionsText}</p>
          ) : null}
          {detailDetails?.earningsText ? (
            <p className="mt-2 text-[11px]">
              <span className="font-bold text-burgundy">Verdiensten:</span> {detailDetails.earningsText}
            </p>
          ) : null}
          {detailDetails?.remarksText ? (
            <p className="mt-2 whitespace-pre-wrap text-[11px] text-muted">{detailDetails.remarksText}</p>
          ) : null}

          <p className="mt-4 text-[11px] font-bold uppercase text-ink">Ingeschreven modellen</p>
          {can('admin.briefs.write') && detail.responses.length > 0 ? (
            <div className="mt-2 space-y-2 rounded border border-line bg-zinc-50/80 p-2">
              <p className="text-[10px] font-semibold text-burgundy">Push naar geselecteerde ingeschrevenen</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-burgundy px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-burgundyDeep"
                  onClick={() => pushSelectedUsers(selResp)}
                >
                  Push (ingeschreven selectie)
                </button>
              </div>
            </div>
          ) : null}
          <ul className="mt-2 space-y-2">
            {detail.responses.map((x) => (
              <li key={x.id} className="border border-line bg-panel/40 p-2">
                <div className="flex items-start gap-2">
                  {can('admin.briefs.write') ? (
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selResp.includes(x.model.id)}
                      onChange={() =>
                        setSelResp((s) => (s.includes(x.model.id) ? s.filter((y) => y !== x.model.id) : [...s, x.model.id]))
                      }
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                <p className="text-muted">
                  {(x.model.firstName || '') + ' ' + (x.model.lastName || '')} ({x.model.email}) —{' '}
                  <span className="font-semibold text-ink">{x.status}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap">{x.message}</p>
                {can('admin.briefs.write') && x.status === 'submitted' ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800"
                      onClick={() => patchResponse(x.id, 'accepted')}
                    >
                      Gekozen
                    </button>
                    <button
                      type="button"
                      className="rounded bg-red-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-800"
                      onClick={() => patchResponse(x.id, 'declined')}
                    >
                      Niet gekozen
                    </button>
                  </div>
                ) : null}
                {can('admin.briefs.write') && x.status === 'accepted' ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="border border-ink bg-white px-2 py-1 text-[11px] font-semibold text-ink hover:bg-zinc-100"
                      onClick={() => downloadContract(x.id)}
                    >
                      Contract genereren (HTML)
                    </button>
                  </div>
                ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
