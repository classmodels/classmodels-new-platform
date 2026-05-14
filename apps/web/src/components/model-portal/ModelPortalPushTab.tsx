'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, getApiBase } from '@/lib/api';
import type { AuthUser, ModelPushSummary } from '@/context/auth-context';
import { portalTitlebarPillClass } from '@/components/model-portal/portal-titlebar-pill';
import { PushFilterPill, PushCountBadge } from '@/components/model-portal/push-count-badge';

type InboxRow = {
  id: string;
  title: string;
  body: string;
  source: string;
  readAt: string | null;
  createdAt: string;
};

/** Zelfde verwachting als web-push: URL-safe base64 → 65 bytes uncompressed P-256 (0x04 + X + Y). */
function decodeVapidPublicKeyToUint8Array(publicKey: string): Uint8Array {
  let k = publicKey.trim().replace(/^["']|["']$/g, '');
  k = k.replace(/\s+/g, '');
  k = k.replace(/=+$/, '');
  const padding = '='.repeat((4 - (k.length % 4)) % 4);
  const base64 = (k + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  if (out.length === 65 && out[0] === 0x04) return out;
  if (out.length === 64) {
    const with04 = new Uint8Array(65);
    with04[0] = 0x04;
    with04.set(out, 1);
    return with04;
  }
  throw new Error(
    'Ongeldige VAPID public key. Gebruik sleutels van `npx web-push generate-vapid-keys` (65 bytes uncompressed) in VAPID_PUBLIC_KEY.',
  );
}

export function ModelPortalPushTab({
  token,
  refreshMe,
  canRead,
  canSubscribe,
  pushSummary,
  onTitleBar,
}: {
  token: string | null;
  refreshMe: (tokenOverride?: string | null) => Promise<AuthUser | null>;
  canRead: boolean;
  canSubscribe: boolean;
  pushSummary: ModelPushSummary | null | undefined;
  onTitleBar?: (node: ReactNode | null) => void;
}) {
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [devicePushActive, setDevicePushActive] = useState(false);
  const [pushFilter, setPushFilter] = useState<'all' | 'read' | 'unread'>('all');

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
    if (!canSubscribe || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setDevicePushActive(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setDevicePushActive(!!sub);
      } catch {
        if (!cancelled) setDevicePushActive(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canSubscribe, token, pushSummary?.unreadCount]);

  useEffect(() => {
    setSelected({});
  }, [pushFilter]);

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

  const enablePushOnDevice = useCallback(async () => {
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
      const res = await fetch(`${getApiBase()}/push/vapid-public-key`, { cache: 'no-store' });
      const { publicKey, publicKeyBytes } = (await res.json()) as {
        publicKey: string | null;
        publicKeyBytes?: number[] | null;
      };
      if (!publicKey && (!publicKeyBytes || publicKeyBytes.length !== 65)) {
        setPushMsg('De server heeft nog geen geldige VAPID-sleutels. Vraag dit na bij de beheerder.');
        return;
      }
      let keyBytes: Uint8Array;
      if (publicKeyBytes && publicKeyBytes.length === 65) {
        keyBytes = new Uint8Array(publicKeyBytes);
      } else if (publicKey) {
        keyBytes = decodeVapidPublicKeyToUint8Array(publicKey);
      } else {
        setPushMsg('De server heeft nog geen geldige VAPID-sleutels. Vraag dit na bij de beheerder.');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes as BufferSource,
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
      setDevicePushActive(true);
      setPushMsg(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Inschakelen mislukt';
      setPushMsg(
        msg.includes('ECDSA') || msg.includes('VAPID')
          ? 'VAPID-sleutel ongeldig. Laat de beheerder nieuwe sleutels zetten met: npx web-push generate-vapid-keys'
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }, [token, canSubscribe, refreshMe]);

  const disablePushOnDevice = useCallback(async () => {
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
      setDevicePushActive(false);
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : 'Uitschakelen mislukt');
    } finally {
      setBusy(false);
    }
  }, [token, canSubscribe, refreshMe]);

  const filteredInbox = useMemo(() => {
    if (pushFilter === 'read') return inbox.filter((r) => r.readAt);
    if (pushFilter === 'unread') return inbox.filter((r) => !r.readAt);
    return inbox;
  }, [inbox, pushFilter]);

  const countRead = useMemo(() => inbox.filter((r) => r.readAt).length, [inbox]);
  const countAll = inbox.length;
  const unreadFromApi = pushSummary?.unreadCount ?? 0;

  const inboxIds = useMemo(() => filteredInbox.map((r) => r.id), [filteredInbox]);
  const allSelected = inboxIds.length > 0 && inboxIds.every((id) => selected[id]);

  const vapidOk = pushSummary?.webPushConfigured && !!pushSummary?.vapidPublicKey;

  useEffect(() => {
    if (!onTitleBar || !canRead) {
      onTitleBar?.(null);
      return;
    }

    const selectAll = () => {
      const next: Record<string, boolean> = {};
      for (const id of inboxIds) next[id] = true;
      setSelected(next);
    };
    const clearSel = () => setSelected({});

    const pill = portalTitlebarPillClass(false);
    const pillCompact = `${pill} shrink-0 !px-2 !py-0.5 text-[10px] sm:!px-2.5 sm:!py-1 sm:!text-[11px]`;
    const countPillBase = `relative overflow-visible ${pillCompact}`;
    const countPill =
      selectedIds.length > 0 ? `${countPillBase} min-w-[4.75rem] pr-3` : countPillBase;

    const pushBarClick = () => {
      if (devicePushActive) {
        if (confirm('Pushmeldingen op dit toestel uitschakelen?')) void disablePushOnDevice();
        return;
      }
      void enablePushOnDevice();
    };

    onTitleBar(
      <div className="flex w-full min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-visible py-0.5 [scrollbar-width:thin]">
        <h2 className="cm-red-titlebar-title mr-1 shrink-0 text-sm font-semibold text-white">Pushberichten</h2>
        {canSubscribe ? (
          <button
            type="button"
            disabled={busy || (!devicePushActive && !vapidOk)}
            onClick={pushBarClick}
            className="shrink-0 border border-zinc-900 bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-black disabled:opacity-50 sm:px-3 sm:text-[11px]"
          >
            {devicePushActive ? 'Push uit' : 'Push inschakelen'}
          </button>
        ) : null}
        <span className="min-w-1 shrink-0" aria-hidden />
        <PushFilterPill
          label="Alle"
          count={countAll}
          active={pushFilter === 'all'}
          disabled={busy}
          compact
          onClick={() => setPushFilter('all')}
        />
        <PushFilterPill
          label="Gelezen"
          count={countRead}
          active={pushFilter === 'read'}
          disabled={busy}
          compact
          onClick={() => setPushFilter('read')}
        />
        <PushFilterPill
          label="Nieuw"
          count={unreadFromApi}
          active={pushFilter === 'unread'}
          disabled={busy}
          compact
          onClick={() => setPushFilter('unread')}
        />
        <span className="mx-0.5 hidden h-5 w-px shrink-0 self-center bg-white/30 sm:block" aria-hidden />
        <button
          type="button"
          disabled={busy || !inboxIds.length}
          onClick={allSelected ? clearSel : selectAll}
          className={pillCompact}
        >
          {allSelected ? 'Geen' : 'Alles aanwijzen'}
        </button>
        <button
          type="button"
          disabled={busy || !selectedIds.length}
          onClick={() => void markReadMany(selectedIds)}
          className={`shrink-0 ${countPill}`}
        >
          <span className="inline-block whitespace-nowrap pr-0.5">Selectie gelezen</span>
          {selectedIds.length > 0 ? (
            <PushCountBadge count={selectedIds.length} variant="titlebar" aria-hidden />
          ) : null}
        </button>
        <button type="button" disabled={busy} onClick={() => void markAllRead()} className={pillCompact}>
          Alles gelezen
        </button>
        <button
          type="button"
          disabled={busy || !selectedIds.length}
          onClick={() => void deleteMany(selectedIds)}
          className={`shrink-0 ${countPill}`}
        >
          <span className="inline-block whitespace-nowrap pr-0.5">Verwijderen</span>
          {selectedIds.length > 0 ? (
            <PushCountBadge count={selectedIds.length} variant="titlebar" aria-hidden />
          ) : null}
        </button>
      </div>,
    );
    return () => onTitleBar(null);
  }, [
    onTitleBar,
    canRead,
    canSubscribe,
    busy,
    inboxIds,
    allSelected,
    selectedIds,
    markAllRead,
    markReadMany,
    deleteMany,
    disablePushOnDevice,
    enablePushOnDevice,
    pushFilter,
    countAll,
    countRead,
    unreadFromApi,
    devicePushActive,
    vapidOk,
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

  const showPushIntro = canSubscribe && !devicePushActive;

  return (
    <div className="text-sm">
      {showPushIntro ? (
        <div className="mb-5 space-y-2 text-xs leading-relaxed text-zinc-700">
          <p>
            <strong>Meldingen</strong> voor historiek en voor berichten van het bureau staan <strong>standaard aan</strong>.
            Voor <strong>systeemmeldingen op dit toestel</strong> gebruik je de zwarte knop <strong className="text-ink">Push inschakelen</strong>{' '}
            in de rode titelbalk. Deze uitleg verdwijnt zodra push hier actief is; zet je push weer uit met{' '}
            <strong className="text-ink">Push uit</strong> in dezelfde balk — dan verschijnt deze tekst opnieuw.
          </p>
          <p className="text-muted">
            Op iPhone: voeg de site toe aan het beginscherm via Safari → Deel → Zet op beginscherm, en sta meldingen toe.
          </p>
          {pushMsg ? <p className="font-medium text-red-700">{pushMsg}</p> : null}
          {!vapidOk ? (
            <p className="text-amber-800">
              Server mist geldige VAPID-sleutels. Genereer met{' '}
              <code className="bg-amber-100 px-1">npx web-push generate-vapid-keys</code> en zet{' '}
              <code className="bg-amber-100 px-1">VAPID_PUBLIC_KEY</code> /{' '}
              <code className="bg-amber-100 px-1">VAPID_PRIVATE_KEY</code> in de API-.env.
            </p>
          ) : null}
        </div>
      ) : null}

      {!showPushIntro && pushMsg ? <p className="mb-3 text-xs font-medium text-red-700">{pushMsg}</p> : null}

      <div className="space-y-3">
        {loadErr ? <p className="text-xs text-red-700">{loadErr}</p> : null}
        <ul className="space-y-2">
          {filteredInbox.map((row) => (
            <li
              key={row.id}
              className={`border px-3 py-2 shadow-sm ${
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
        {filteredInbox.length === 0 && !loadErr ? (
          <p className="text-sm text-muted">
            {inbox.length === 0
              ? 'Nog geen pushberichten in je inbox.'
              : 'Geen berichten in deze weergave — kies een andere tab in de titelbalk.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
