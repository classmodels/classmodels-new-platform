'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiFetch, getApiBase } from '@/lib/api';
import type { AuthUser, ModelPushSummary } from '@/context/auth-context';
import { PushFilterPill } from '@/components/model-portal/push-count-badge';

const pushContentBtn =
  'inline-flex items-center gap-1.5 border border-burgundy/40 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-burgundy shadow-sm hover:bg-burgundy/[0.06] disabled:opacity-50 sm:text-[11px]';

function pushActionCount(n: number) {
  if (n <= 0) return null;
  const label = n > 99 ? '99+' : String(n);
  return (
    <span className="min-w-[1rem] text-right text-[10px] font-bold tabular-nums text-burgundy" aria-hidden>
      {label}
    </span>
  );
}

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

  const refreshedPushSummary = useRef(false);
  const autoPushAttempted = useRef(false);
  useEffect(() => {
    if (!token || !canRead || refreshedPushSummary.current) return;
    refreshedPushSummary.current = true;
    void refreshMe();
  }, [token, canRead, refreshMe]);

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
      let reg: ServiceWorkerRegistration | undefined;
      try {
        reg = await navigator.serviceWorker.ready;
      } catch {
        reg = (await navigator.serviceWorker.getRegistration()) ?? undefined;
      }
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        try {
          await apiFetch('/portal/model/push/unsubscribe', {
            method: 'POST',
            token,
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        } catch {
          /* server mag ontbreken; lokaal uitschakelen blijft belangrijk */
        }
        try {
          await sub.unsubscribe();
        } catch {
          /* sommige browsers: al weg of permissie */
        }
      }
      await refreshMe();
      try {
        const reg2 = await navigator.serviceWorker.ready;
        const sub2 = await reg2.pushManager.getSubscription();
        setDevicePushActive(!!sub2);
      } catch {
        setDevicePushActive(false);
      }
      setPushMsg(null);
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : 'Uitschakelen mislukt');
    } finally {
      setBusy(false);
    }
  }, [token, canSubscribe, refreshMe]);

  useEffect(() => {
    if (!canSubscribe || autoPushAttempted.current || devicePushActive || busy) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    autoPushAttempted.current = true;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register(
          `${process.env.NEXT_PUBLIC_BASE_PATH?.trim() || ''}/sw.js`,
        );
        await reg.update().catch(() => undefined);
        const sub = await reg.pushManager.getSubscription();
        if (!sub) await enablePushOnDevice();
      } catch {
        /* gebruiker kan handmatig aanzetten */
      }
    })();
  }, [canSubscribe, devicePushActive, busy, enablePushOnDevice]);

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

  useEffect(() => {
    if (!onTitleBar || !canRead) {
      onTitleBar?.(null);
      return;
    }

    const pushBarClick = () => {
      if (devicePushActive) {
        void disablePushOnDevice();
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
            role="switch"
            aria-checked={devicePushActive}
            disabled={busy}
            onClick={pushBarClick}
            className="shrink-0 border-2 border-white/90 bg-zinc-950 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-black disabled:opacity-50 sm:text-xs"
          >
            {devicePushActive ? 'Push uitzetten' : 'Push aanzetten'}
          </button>
        ) : null}
        <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1">
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
        </div>
      </div>,
    );
    return () => onTitleBar(null);
  }, [
    onTitleBar,
    canRead,
    canSubscribe,
    busy,
    disablePushOnDevice,
    enablePushOnDevice,
    pushFilter,
    countAll,
    countRead,
    unreadFromApi,
    devicePushActive,
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

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    for (const id of inboxIds) next[id] = true;
    setSelected(next);
  };
  const clearSel = () => setSelected({});

  return (
    <div className="text-sm">
      {pushMsg ? <p className="mb-3 text-xs font-medium text-red-700">{pushMsg}</p> : null}

      <div className="mb-3 flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={busy || !inboxIds.length}
          onClick={allSelected ? clearSel : selectAll}
          className={pushContentBtn}
        >
          <span>{allSelected ? 'Geen' : 'Alles aanwijzen'}</span>
        </button>
        <button
          type="button"
          disabled={busy || !selectedIds.length}
          onClick={() => void markReadMany(selectedIds)}
          className={pushContentBtn}
        >
          <span>Selectie gelezen</span>
          {pushActionCount(selectedIds.length)}
        </button>
        <button type="button" disabled={busy} onClick={() => void markAllRead()} className={pushContentBtn}>
          <span>Alles gelezen</span>
        </button>
        <button
          type="button"
          disabled={busy || !selectedIds.length}
          onClick={() => void deleteMany(selectedIds)}
          className={pushContentBtn}
        >
          <span>Verwijderen</span>
          {pushActionCount(selectedIds.length)}
        </button>
      </div>

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
                : 'Geen berichten in deze weergave — kies een andere tab in de titelbalk (of zet Push uit om de lijst hier te tonen).'}
            </p>
          ) : null}
      </div>
    </div>
  );
}
