'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api';
import { historySubtitle, historyTitle } from '@/lib/model-history-labels';

export type HistoryRow = {
  id: string;
  action: string;
  meta: unknown;
  createdAt: string;
};

export function ModelPortalHistoriekTab({
  token,
  lastLoginAt,
  onHeaderExtras,
  blurDetails = false,
}: {
  token: string | null;
  lastLoginAt?: string | null;
  onHeaderExtras?: (node: ReactNode | null) => void;
  /** Zonder premium: titel/omschrijving rechts vervagen. */
  blurDetails?: boolean;
}) {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const data = await apiFetch<HistoryRow[]>('/portal/model/history?take=200', { token });
      setRows(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setRows([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const lastLoginLabel = useMemo(() => {
    if (!lastLoginAt) return 'Laatste login: onbekend';
    try {
      const d = new Date(lastLoginAt);
      return `Laatste login: ${new Intl.DateTimeFormat('nl-BE', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(d)}`;
    } catch {
      return 'Laatste login: onbekend';
    }
  }, [lastLoginAt]);

  const headerNode = useMemo(
    () => (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!token) return;
            if (!confirm('Volledige historiek wissen? Dit kan niet ongedaan worden.')) return;
            void (async () => {
              setBusy(true);
              try {
                await apiFetch('/portal/model/history', { method: 'DELETE', token });
                await load();
              } catch (e: unknown) {
                alert(e instanceof Error ? e.message : 'Reset mislukt');
              } finally {
                setBusy(false);
              }
            })();
          }}
          className="nieuw-btn nieuw-btn-ghost"
          style={{ padding: '6px 12px', fontSize: 10 }}
        >
          Historiek resetten
        </button>
        <span className="text-xs" style={{ color: 'var(--n-mut)' }}>
          {lastLoginLabel}
        </span>
      </div>
    ),
    [busy, lastLoginLabel, load, token],
  );

  useEffect(() => {
    if (!onHeaderExtras) return;
    onHeaderExtras(headerNode);
    return () => {
      onHeaderExtras(null);
    };
  }, [headerNode, onHeaderExtras]);

  if (!token) {
    return <p className="text-sm text-muted">Log opnieuw in om je historiek te zien.</p>;
  }

  return (
    <div className="space-y-4">
      {blurDetails ? (
        <p className="rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
          <strong>Premium:</strong> met een premium account kunt u de volledige historiek raadplegen (profiel,
          opdrachten, betalingen, …).{' '}
          <Link href="/modellen?tab=premium" className="font-semibold text-burgundy underline hover:text-burgundyDeep">
            Bekijk Premium
          </Link>
        </p>
      ) : null}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      <div className="nieuw-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {!blurDetails ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid var(--n-hair)' }}
          >
            <h3
              className="historiek-panel-title"
              style={{ margin: 0 }}
            >
              Historiek
            </h3>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!token) return;
                if (!confirm('Volledige historiek wissen?')) return;
                void (async () => {
                  setBusy(true);
                  try {
                    await apiFetch('/portal/model/history', { method: 'DELETE', token });
                    await load();
                  } catch (e: unknown) {
                    alert(e instanceof Error ? e.message : 'Reset mislukt');
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
              className="nieuw-btn nieuw-btn-ghost"
              style={{ padding: '6px 12px', fontSize: 10 }}
            >
              Historiek resetten
            </button>
          </div>
        ) : null}

        <div className="p-4">
          {rows === null ? (
            <p className="text-sm" style={{ color: 'var(--n-mut)', margin: 0 }}>
              Laden…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--n-mut)', margin: 0 }}>
              Nog geen gebeurtenissen geregistreerd.
            </p>
          ) : (
            <ul className="relative space-y-0 pl-0" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              <div
                className="absolute bottom-2 top-2 w-px"
                style={{ left: '5.25rem', background: 'var(--n-gold-hair)' }}
                aria-hidden
              />
              {rows.map((row) => {
                const d = new Date(row.createdAt);
                const dateStr = new Intl.DateTimeFormat('nl-BE', { dateStyle: 'short' }).format(d);
                const timeStr = new Intl.DateTimeFormat('nl-BE', { timeStyle: 'medium' }).format(d);
                const title = historyTitle(row.action, row.meta);
                const sub = historySubtitle(row.action, row.meta);
                return (
                  <li key={row.id} className="relative flex gap-3 py-3 pr-2">
                    <div
                      className="flex w-[4.5rem] shrink-0 flex-col text-right text-xs leading-tight"
                      style={{ color: 'var(--n-mut)' }}
                    >
                      <span>{dateStr}</span>
                      <span style={{ fontSize: 11 }}>{timeStr}</span>
                    </div>
                    <div className="relative z-[1] flex shrink-0 flex-col items-center pt-1">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                          background: 'var(--n-gold)',
                          boxShadow: '0 0 0 2px var(--n-bg-2)',
                        }}
                      />
                    </div>
                    <div className="relative min-w-0 flex-1 pb-1">
                      <div className={blurDetails ? 'select-none blur-[5px]' : undefined} aria-hidden={blurDetails}>
                        <p className="text-sm font-semibold" style={{ margin: 0, color: 'var(--n-gold)' }}>
                          {title}
                        </p>
                        {sub ? (
                          <p className="mt-0.5 text-xs" style={{ margin: '2px 0 0', color: 'var(--n-mut)' }}>
                            {sub}
                          </p>
                        ) : null}
                      </div>
                      {blurDetails ? (
                        <p
                          className="pointer-events-none absolute inset-0 flex items-center text-[10px] font-medium"
                          style={{ color: 'var(--n-mut)' }}
                        >
                          Premium vereist
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
