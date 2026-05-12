'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type ListRow = { id: string; name: string; description: string | null; _count: { members: number } };

type CampaignRow = {
  id: string;
  title: string;
  body: string;
  sentAt: string | null;
  createdAt: string;
  audience: unknown;
  sentBy: { email: string } | null;
  recipientList: { id: string; name: string } | null;
};

export default function AdminPushBerichtenPage() {
  const { token, can } = useAuth();
  const [lists, setLists] = useState<ListRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all_models' | 'premium' | 'non_premium' | 'custom_list'>('all_models');
  const [listId, setListId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !can('admin.push.send')) return;
    try {
      const [l, c] = await Promise.all([
        adminFetch<ListRow[]>('/admin/push/recipient-lists-for-broadcast', token),
        adminFetch<CampaignRow[]>('/admin/push/campaigns?take=25', token),
      ]);
      setLists(l);
      setCampaigns(c);
    } catch {
      setLists([]);
      setCampaigns([]);
    }
  }, [token, can]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminFetch<{ sent: number; campaignId: string }>('/admin/push/broadcast', token, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          audienceKind: audience,
          ...(audience === 'custom_list' && listId ? { listId } : {}),
        }),
      });
      setMsg(`Verzonden naar ${res.sent} ontvanger(s).`);
      setTitle('');
      setBody('');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Verzenden mislukt');
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.push.send')) {
    return <p className="text-sm text-muted">Je hebt geen rechten voor pushberichten (admin.push.send).</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Pushberichten naar modellen</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Stuur één bericht naar een doelgroep. Modellen zien het in hun portaal onder Pushberichten en — als ze push op hun toestel hebben ingeschakeld — als systeemmelding.
        </p>
      </div>

      {msg ? <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">{msg}</p> : null}

      <section className="max-w-xl space-y-4 rounded border border-line bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Nieuwe broadcast</h2>
        <div>
          <label className="text-xs font-medium text-zinc-700">Titel (kort, voor melding)</label>
          <input
            className="mt-1 w-full border border-zinc-200 px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-700">Bericht</label>
          <textarea
            className="mt-1 min-h-[120px] w-full border border-zinc-200 px-3 py-2 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-700">Doelgroep</label>
          <select
            className="mt-1 w-full border border-zinc-200 px-3 py-2 text-sm"
            value={audience}
            onChange={(e) => setAudience(e.target.value as typeof audience)}
          >
            <option value="all_models">Alle actieve modellen (model / newface / try-out / inactief)</option>
            <option value="premium">Alleen premium (volgens bureau-regels)</option>
            <option value="non_premium">Alleen zonder geldig premium</option>
            <option value="custom_list">Een push-lijst (hieronder)</option>
          </select>
        </div>
        {audience === 'custom_list' ? (
          <div>
            <label className="text-xs font-medium text-zinc-700">Lijst</label>
            <select
              className="mt-1 w-full border border-zinc-200 px-3 py-2 text-sm"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
            >
              <option value="">— kies lijst —</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l._count.members} leden)
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              Lijsten beheer je onder <strong>Push-lijsten</strong> in het menu.
            </p>
          </div>
        ) : null}
        <button
          type="button"
          disabled={busy || !title.trim() || !body.trim() || (audience === 'custom_list' && !listId)}
          onClick={() => void send()}
          className="rounded bg-burgundy px-4 py-2 text-sm font-medium text-white hover:bg-burgundyDeep disabled:opacity-50"
        >
          {busy ? 'Bezig…' : 'Versturen'}
        </button>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Recent verstuurd</h2>
        <ul className="mt-3 space-y-2 text-xs">
          {campaigns.map((c) => (
            <li key={c.id} className="rounded border border-line bg-white px-3 py-2 shadow-sm">
              <span className="font-medium text-ink">{c.title}</span>
              <span className="text-muted"> — {new Date(c.createdAt).toLocaleString('nl-BE')}</span>
              {c.sentBy ? (
                <span className="text-muted">
                  {' '}
                  door {c.sentBy.email}
                </span>
              ) : null}
              {c.recipientList ? (
                <span className="text-muted">
                  {' '}
                  (lijst: {c.recipientList.name})
                </span>
              ) : null}
              <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap text-[11px] text-zinc-700">{c.body}</pre>
            </li>
          ))}
        </ul>
        {campaigns.length === 0 ? <p className="mt-2 text-sm text-muted">Nog geen campagnes.</p> : null}
      </section>
    </div>
  );
}
