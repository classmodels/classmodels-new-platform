'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type ClientOpt = { id: string; email: string; roles: { role: { slug: string } }[] };

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
  status: string;
  createdAt: string;
  client: { email: string; companyName?: string | null; firstName?: string | null; lastName?: string | null };
  _count: { responses: number };
};

type BriefDetail = BriefList & {
  ageManFrom?: number | null;
  ageManTo?: number | null;
  ageWomanFrom?: number | null;
  ageWomanTo?: number | null;
  ageChildFrom?: number | null;
  ageChildTo?: number | null;
  responses: {
    id: string;
    message: string;
    status: string;
    model: { email: string; firstName?: string | null; lastName?: string | null };
  }[];
};

const emptyForm = () => ({
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
  ageManFrom: '',
  ageManTo: '',
  ageWomanFrom: '',
  ageWomanTo: '',
  ageChildFrom: '',
  ageChildTo: '',
  status: 'open' as 'open' | 'closed' | 'archived',
});

function numOrUndef(s: string): number | undefined {
  const t = s.trim();
  if (t === '') return undefined;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

export default function AdminBriefsPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<BriefList[]>([]);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [detail, setDetail] = useState<BriefDetail | null>(null);
  const [msg, setMsg] = useState('');
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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
  };

  const toForm = (b: BriefList) => ({
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
    ageManFrom: '',
    ageManTo: '',
    ageWomanFrom: '',
    ageWomanTo: '',
    ageChildFrom: '',
    ageChildTo: '',
    status: b.status as 'open' | 'closed' | 'archived',
  });

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
    const cid =
      d.clientId ||
      clients.find((c) => c.email === d.client.email)?.id ||
      '';
    setForm({
      ...toForm(d),
      clientId: cid,
      ageManFrom: d.ageManFrom != null ? String(d.ageManFrom) : '',
      ageManTo: d.ageManTo != null ? String(d.ageManTo) : '',
      ageWomanFrom: d.ageWomanFrom != null ? String(d.ageWomanFrom) : '',
      ageWomanTo: d.ageWomanTo != null ? String(d.ageWomanTo) : '',
      ageChildFrom: d.ageChildFrom != null ? String(d.ageChildFrom) : '',
      ageChildTo: d.ageChildTo != null ? String(d.ageChildTo) : '',
    });
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
      ageManFrom: numOrUndef(form.ageManFrom) ?? null,
      ageManTo: numOrUndef(form.ageManTo) ?? null,
      ageWomanFrom: numOrUndef(form.ageWomanFrom) ?? null,
      ageWomanTo: numOrUndef(form.ageWomanTo) ?? null,
      ageChildFrom: numOrUndef(form.ageChildFrom) ?? null,
      ageChildTo: numOrUndef(form.ageChildTo) ?? null,
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
        setMsg('Opdracht aangemaakt.');
      } else if (mode === 'edit' && editId) {
        await adminFetch(`/admin/briefs/${editId}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ clientId: form.clientId || undefined, ...payloadBody }),
        });
        setMsg('Opdracht bijgewerkt.');
      }
      setMode('list');
      setEditId(null);
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
    setMsg('Reactie bijgewerkt.');
    if (detail) await open(detail.id);
    await load();
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
            Aanmaken en beheren zoals in het oude WordPress-plugin scherm: omschrijving, extra info, datum/tijd, gezochte
            profielen en leeftijden.
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
                <p className="mt-1 text-[11px] text-amber-800">Geen klanten gevonden. Maak eerst een gebruiker met rol “client” aan onder Gebruikers.</p>
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
                <label className="block text-[11px] font-semibold text-ink">Einduur</label>
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
            Gezocht (aantallen)
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
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
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink">Status</label>
            <select
              className="mt-0.5 border border-line px-2 py-1.5 text-xs"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof f.status }))}
            >
              <option value="open">Open (zichtbaar voor modellen)</option>
              <option value="closed">Gesloten</option>
              <option value="archived">Gearchiveerd</option>
            </select>
          </div>

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
                        <button type="button" className="text-burgundy hover:underline" onClick={() => quickStatus(r.id, 'archived')}>
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
          <div className="flex items-start justify-between gap-2 border-b border-burgundy pb-2">
            <h2 className="font-semibold text-ink">{detail.title}</h2>
            <button type="button" className="text-muted hover:text-ink" onClick={() => setDetail(null)}>
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
          <p className="mt-3 whitespace-pre-wrap leading-relaxed">{detail.body}</p>
          {detail.extraInfo ? (
            <>
              <p className="mt-3 text-[11px] font-bold uppercase text-burgundy">Extra info</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{detail.extraInfo}</p>
            </>
          ) : null}
          <p className="mt-4 text-[11px] font-bold uppercase text-ink">Reacties</p>
          <ul className="mt-2 space-y-2">
            {detail.responses.map((x) => (
              <li key={x.id} className="border border-line bg-panel/40 p-2">
                <p className="text-muted">
                  {(x.model.firstName || '') + ' ' + (x.model.lastName || '')} ({x.model.email}) — {x.status}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{x.message}</p>
                {can('admin.briefs.write') && x.status === 'submitted' ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="text-burgundy hover:underline"
                      onClick={() => patchResponse(x.id, 'accepted')}
                    >
                      Geaccepteerd
                    </button>
                    <button
                      type="button"
                      className="text-burgundy hover:underline"
                      onClick={() => patchResponse(x.id, 'declined')}
                    >
                      Afwijzen
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
