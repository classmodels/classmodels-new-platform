'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, getApiBase } from '@/lib/api';
import type { AuthUser, ModelPushSummary } from '@/context/auth-context';
import { portalTitlebarPillClass } from '@/components/model-portal/portal-titlebar-pill';

type InboxRow = {
  id: string;
  title: string;
  body: string;
  source: string;
  readAt: string | null;
  createdAt: string;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function ModelPortalPushTab({
  token,
  refreshMe,
  canRead,
  canSubscribe,
  pushSummary,
  onHeaderExtras,
}: {
  token: string | null;
  refreshMe: (tokenOverride?: string | null) => Promise<AuthUser | null>;
  canRead: boolean;
  canSubscribe: boolean;
  pushSummary: ModelPushSummary | null | undefined;
  onHeaderExtras?: (node: ReactNode | null) => void;
}) {
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const syncAppBadge = useCallback((n: number) => {
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    void (n > 0 ? nav.setAppBadge?.(n) : nav.clearAppBadge?.()).catch(() => undefined);
  }, []);

  const loadInbox = useCallback(async () => {
    if (!token || !canRead) return;
    setLoadErr(null);
    try {
      const rows = await apiFetch<InboxRow[]>('/portal/model/push/inbox?take=80', { token });
      setInbox(rows);
      setSelected({});
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Laden mislukt');
      setInbox([]);
      setSelected({});
    }
  }, [token, canRead]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    const n = pushSummary?.unreadCount ?? 0;
    syncAppBadge(n);
  }, [pushSummary?.unreadCount, syncAppBadge]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  const markRead = useCallback(
    async (id: string) => {
      if (!token || !canRead) return;
      try {
        await apiFetch(`/portal/model/push/inbox/${id}/read`, { method: 'PATCH', token });
        await loadInbox();
        await refreshMe();
      } catch (_) {
        /* ignore */
      }
    },
    [token, canRead, loadInbox, refreshMe],
  );

  const markReadMany = useCallback(
    async (ids: string[]) => {
      if (!token || !canRead || !ids.length) return;
      setBusy(true);
      try {
        await apiFetch('/portal/model/push/inbox/read-many', {
          method: 'POST',
          token,
          body: JSON.stringify({ ids }),
        });
        await loadInbox();
        await refreshMe();
      } finally {
        setBusy(false);
      }
    },
    [token, canRead, loadInbox, refreshMe],
  );

  const markAllRead = useCallback(async () => {
    if (!token || !canRead) return;
    setBusy(true);
    try {
      await apiFetch('/portal/model/push/inbox/read-all', { method: 'POST', token });
      await loadInbox();
      await refreshMe();
    } finally {
      setBusy(false);
    }
  }, [token, canRead, loadInbox, refreshMe]);

  const deleteOne = useCallback(
    async (id: string) => {
      if (!token || !canRead) return;
      if (!confirm('Dit bericht verwijderen?')) return;
      try {
        await apiFetch(`/portal/model/push/inbox/${id}`, { method: 'DELETE', token });
        await loadInbox();
        await refreshMe();
      } catch (_) {
        /* ignore */
      }
    },
    [token, canRead, loadInbox, refreshMe],
  );

  const deleteMany = useCallback(
    async (ids: string[]) => {
      if (!token || !canRead || !ids.length) return;
      if (!confirm(`${ids.length} bericht(en) verwijderen?`)) return;
      setBusy(true);
      try {
        await apiFetch('/portal/model/push/inbox/delete-many', {
          method: 'POST',
          token,
          body: JSON.stringify({ ids }),
        });
        await loadInbox();
        await refreshMe();
      } finally {
        setBusy(false);
      }
    },
    [token, canRead, loadInbox, refreshMe],
  );

  const enablePushOnDevice = async () => {
    if (!token || !canSubscribe) return;
    setPushMsg(null);
    setBusy(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushMsg('Deze browser ondersteunt geen pushmeldingen.');
        return;
      }
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
      await navigator.serviceWorker.register(`${basePath}/sw.js`);
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await fetch(`${getApiBase()}/push/vapid-public-key`).then(
        (r) => r.json() as Promise<{ publicKey: string | null }>,
      );
      if (!publicKey) {
        setPushMsg('De server heeft nog geen VAPID-sleutels geconfigureerd. Vraag dit na bij de beheerder.');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setPushMsg('Abonnement ophalen mislukt.');
        return;
      }
      await apiFetch('/portal/model/push/subscribe', {
        method: 'POST',
        token,
        body: JSON.stringify({
          subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        }),
      });
      await refreshMe();
      setPushMsg('Push op dit apparaat is ingeschakeld. Voeg de site toe aan je beginscherm voor het beste resultaat op iPhone.');
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : 'Inschakelen mislukt');
    } finally {
      setBusy(false);
    }
  };

  const disablePushOnDevice = async () => {
    if (!token || !canSubscribe) return;
    setBusy(true);
    setPushMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiFetch('/portal/model/push/unsubscribe', {
          method: 'POST',
          token,
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      await refreshMe();
      setPushMsg('Push op dit apparaat uitgeschakeld.');
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : 'Uitschakelen mislukt');
    } finally {
      setBusy(false);
    }
  };

  const inboxIds = useMemo(() => inbox.map((r) => r.id), [inbox]);
  const allSelected = inboxIds.length > 0 && inboxIds.every((id) => selected[id]);

  useEffect(() => {
    if (!onHeaderExtras || !canRead) {
      onHeaderExtras?.(null);
      return;
    }

    const selectAll = () => {
      const next: Record<string, boolean> = {};
      for (const id of inboxIds) next[id] = true;
      setSelected(next);
    };
    const clearSel = () => setSelected({});

    onHeaderExtras(
      <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={busy || !inboxIds.length}
          onClick={allSelected ? clearSel : selectAll}
          className={portalTitlebarPillClass(false)}
        >
          {allSelected ? 'Geen' : 'Alles aanwijzen'}
        </button>
        <button
          type="button"
          disabled={busy || !selectedIds.length}
          onClick={() => void markReadMany(selectedIds)}
          className={portalTitlebarPillClass(false)}
        >
          Gelezen ({selectedIds.length})
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void markAllRead()}
          className={portalTitlebarPillClass(false)}
        >
          Alles gelezen
        </button>
        <button
          type="button"
          disabled={busy || !selectedIds.length}
          onClick={() => void deleteMany(selectedIds)}
          className={portalTitlebarPillClass(false)}
        >
          Verwijderen ({selectedIds.length})
        </button>
      </div>,
    );
    return () => onHeaderExtras(null);
  }, [
    onHeaderExtras,
    canRead,
    busy,
    inboxIds,
    allSelected,
    selectedIds,
    markAllRead,
    markReadMany,
    deleteMany,
  ]);

  if (!canRead) {
    return (
      <p className="text-sm text-muted">
        Je account heeft geen rechten voor pushberichten. Vraag een beheerder om de permissies{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.push.read</code> en eventueel{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.push.subscribe</code> op je modelrol te zetten.
      </p>
    );
  }

  const unread = pushSummary?.unreadCount ?? 0;
  const vapidOk = pushSummary?.webPushConfigured && !!pushSummary?.vapidPublicKey;

  return (
    <div className="space-y-6 text-sm">
      <p className="rounded border border-zinc-200 bg-zinc-50/90 px-3 py-2 text-xs leading-relaxed text-zinc-800">
        <strong>Meldingen</strong> voor historiek en voor berichten van het bureau staan <strong>standaard aan</strong>. Je
        hoeft niets in te schakelen behalve — hieronder — push op <em>dit toestel</em> als je systeemmeldingen wilt.
      </p>

      {pushMsg ? <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800">{pushMsg}</p> : null}

      {canSubscribe ? (
        <section className="rounded-cm border border-zinc-200 bg-white p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-700">Dit toestel (browser / PWA)</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Voor meldingen op je vergrendelscherm en (indien ondersteund) een getal op het app-icoon: schakel push in op{' '}
            <strong>dit</strong> apparaat. Op iPhone werkt dit het best als je de site toevoegt aan het beginscherm (Safari
            → Deel → Zet op beginscherm) en meldingen toestaat.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !vapidOk}
              onClick={() => void enablePushOnDevice()}
              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Push op dit toestel inschakelen
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void disablePushOnDevice()}
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Uitschakelen op dit toestel
            </button>
          </div>
          {!vapidOk ? (
            <p className="mt-2 text-xs text-amber-800">
              Server mist VAPID-sleutels: zet <code className="rounded bg-amber-100 px-1">VAPID_PUBLIC_KEY</code> en{' '}
              <code className="rounded bg-amber-100 px-1">VAPID_PRIVATE_KEY</code> in de API-.env (zie documentatie).
            </p>
          ) : null}
        </section>
      ) : null}

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-700">
          Inbox {unread > 0 ? <span className="text-burgundy">({unread} ongelezen)</span> : null}
        </h3>
        {loadErr ? <p className="mt-2 text-xs text-red-700">{loadErr}</p> : null}
        <ul className="mt-3 space-y-2">
          {inbox.map((row) => (
            <li
              key={row.id}
              className={`rounded border px-3 py-2 shadow-sm ${
                row.readAt ? 'border-zinc-100 bg-zinc-50/50' : 'border-burgundy/25 bg-burgundy/[0.04]'
              }`}
            >
              <div className="flex flex-wrap items-start gap-2">
                <label className="flex shrink-0 cursor-pointer items-center pt-0.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!!selected[row.id]}
                    onChange={(e) =>
                      setSelected((s) => ({
                        ...s,
                        [row.id]: e.target.checked,
                      }))
                    }
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink">{row.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-700">{row.body}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {new Date(row.createdAt).toLocaleString('nl-BE')} — {row.source === 'agency' ? 'Bureau' : 'Historiek'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
                  {!row.readAt ? (
                    <button
                      type="button"
                      onClick={() => void markRead(row.id)}
                      className="text-[10px] font-semibold uppercase text-burgundy hover:underline"
                    >
                      Gelezen
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void deleteOne(row.id)}
                    className="text-[10px] font-semibold uppercase text-red-700 hover:underline"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {inbox.length === 0 && !loadErr ? (
          <p className="mt-3 text-sm text-muted">Nog geen pushberichten in je inbox.</p>
        ) : null}
      </section>
    </div>
  );
}
