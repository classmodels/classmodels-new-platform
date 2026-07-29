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

function metaLines(meta: unknown): string[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const o = meta as Record<string, unknown>;
  return Object.entries(o).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
}

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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
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
          className="rounded border border-white/80 bg-white px-2.5 py-1 text-xs font-semibold text-burgundy shadow-sm hover:bg-white/95 disabled:opacity-50"
        >
          Historiek resetten
        </button>
        <span className="text-xs text-white/90">{lastLoginLabel}</span>
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
          <Link href="/nieuw/modellen?tab=premium" className="font-semibold text-burgundy underline hover:text-burgundyDeep">
            Bekijk Premium
          </Link>
        </p>
      ) : null}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        {!blurDetails ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wide text-ink">Historiek</h3>
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
              className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:bg-zinc-50 disabled:opacity-50"
            >
              Historiek resetten
            </button>
          </div>
        ) : null}

        <div className="p-4">
          {rows === null ? (
            <p className="text-sm text-muted">Laden…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted">Nog geen gebeurtenissen geregistreerd.</p>
          ) : (
            <ul className="relative space-y-0 pl-0">
              <div className="absolute bottom-2 left-[5.25rem] top-2 w-px bg-zinc-200" aria-hidden />
              {rows.map((row) => {
                const d = new Date(row.createdAt);
                const dateStr = new Intl.DateTimeFormat('nl-BE', { dateStyle: 'short' }).format(d);
                const timeStr = new Intl.DateTimeFormat('nl-BE', { timeStyle: 'medium' }).format(d);
                const title = historyTitle(row.action, row.meta);
                const sub = historySubtitle(row.action, row.meta);
                const open = expanded.has(row.id);
                const lines = metaLines(row.meta);
                return (
                  <li key={row.id} className="relative flex gap-3 py-3 pr-2">
                    <div className="flex w-[4.5rem] shrink-0 flex-col text-right text-xs leading-tight text-muted">
                      <span>{dateStr}</span>
                      <span className="text-[11px]">{timeStr}</span>
                    </div>
                    <div className="relative z-[1] flex shrink-0 flex-col items-center pt-1">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-teal-600 shadow-sm ring-2 ring-white" />
                    </div>
                    <div className="relative min-w-0 flex-1 pb-1">
                      <div className={blurDetails ? 'select-none blur-[5px]' : undefined} aria-hidden={blurDetails}>
                        <p className="text-sm font-semibold text-ink">{title}</p>
                        {sub ? <p className="mt-0.5 text-xs text-zinc-600">{sub}</p> : null}
                        {lines.length > 0 && !blurDetails ? (
                          <button
                            type="button"
                            className="mt-1 text-xs font-medium text-sky-700 underline hover:text-sky-900"
                            onClick={() =>
                              setExpanded((prev) => {
                                const n = new Set(prev);
                                if (n.has(row.id)) n.delete(row.id);
                                else n.add(row.id);
                                return n;
                              })
                            }
                          >
                            {open ? 'info verbergen' : 'info'}
                          </button>
                        ) : null}
                        {open && lines.length > 0 && !blurDetails ? (
                          <pre className="mt-2 max-h-40 overflow-auto rounded border border-zinc-100 bg-zinc-50 p-2 text-[11px] leading-snug text-zinc-800">
                            {lines.join('\n')}
                          </pre>
                        ) : null}
                      </div>
                      {blurDetails ? (
                        <p className="pointer-events-none absolute inset-0 flex items-center text-[10px] font-medium text-zinc-500">
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
