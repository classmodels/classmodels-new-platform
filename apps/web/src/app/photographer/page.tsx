'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getLargeUploadApiBase } from '@/lib/api';
import { uploadWithProgress, formatEtaSeconds } from '@/lib/upload-with-progress';

type BookingRow = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  modelUserId: string | null;
  shootDate?: string;
  fileCount?: number;
  displayName: string;
};

type RowUpload = {
  displayName: string;
  percent: number;
  phase: 'uploading' | 'processing' | 'done' | 'error';
  detail: string;
};

function fmtDay(ymd: string) {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return ymd;
  return new Intl.DateTimeFormat('nl-BE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

export default function PhotographerPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [uploads, setUploads] = useState<Record<string, RowUpload>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const tokenRef = useRef(token);
  const inflightRef = useRef<Set<string>>(new Set());
  tokenRef.current = token;

  const load = useCallback(async () => {
    if (!token) return;
    setErr('');
    try {
      const r = await apiFetch<BookingRow[]>('/photographer/portfolio-bookings', { token });
      setBookings(Array.isArray(r) ? r : []);
    } catch {
      setBookings([]);
      setErr('Afspraken laden mislukt.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const days = useMemo(() => {
    const s = new Set<string>();
    for (const b of bookings) {
      s.add(b.shootDate || b.startAt.slice(0, 10));
    }
    return [...s].sort().reverse();
  }, [bookings]);

  useEffect(() => {
    if (!dayFilter && days.length) setDayFilter(days[0]!);
  }, [days, dayFilter]);

  const visible = useMemo(() => {
    if (!dayFilter) return bookings;
    return bookings.filter((b) => (b.shootDate || b.startAt.slice(0, 10)) === dayFilter);
  }, [bookings, dayFilter]);

  const activeUploads = useMemo(
    () => Object.entries(uploads).filter(([, u]) => u.phase === 'uploading' || u.phase === 'processing'),
    [uploads],
  );

  const patchUpload = (bookingId: string, patch: Partial<RowUpload>) => {
    setUploads((prev) => {
      const cur = prev[bookingId];
      if (!cur) return prev;
      return { ...prev, [bookingId]: { ...cur, ...patch } };
    });
  };

  const uploadForModel = async (row: BookingRow, file: File) => {
    const tok = tokenRef.current;
    if (!tok || !row.modelUserId) return;
    if (!/\.zip$/i.test(file.name)) {
      setMsg('Kies een .zip-bestand.');
      return;
    }
    // Al bezig voor dit model? Nieuwe upload niet starten.
    if (inflightRef.current.has(row.id)) {
      setMsg(`${row.displayName}: upload loopt al — kies een ander model of wacht tot die klaar is.`);
      return;
    }
    inflightRef.current.add(row.id);

    setMsg('');
    setUploads((prev) => ({
      ...prev,
      [row.id]: {
        displayName: row.displayName,
        percent: 0,
        phase: 'uploading',
        detail: 'Starten…',
      },
    }));

    try {
      const fd = new FormData();
      fd.append('file', file);
      const params = new URLSearchParams();
      params.set('folderSlug', 'portfolio-fotograaf');
      params.set('modelUserId', row.modelUserId);

      const text = await uploadWithProgress(
        `${getLargeUploadApiBase()}/photographer/upload-zip?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${tok}` },
          body: fd,
          onProgress: (p) => {
            patchUpload(row.id, {
              percent: Math.max(1, p.percent),
              phase: 'uploading',
              detail: `${p.percent}% · nog ${formatEtaSeconds(p.etaSeconds)}`,
            });
          },
          onUploadBytesComplete: () => {
            patchUpload(row.id, {
              percent: 100,
              phase: 'processing',
              detail: 'Server verwerkt nog…',
            });
          },
        },
      );

      const body = JSON.parse(text) as {
        error?: string;
        id?: string;
        assetId?: string;
        message?: string;
        ok?: boolean;
      };
      if (body?.error) throw new Error(body.error);
      if (body?.message && !body.id && !body.assetId && body.ok !== true) {
        throw new Error(body.message);
      }

      patchUpload(row.id, { percent: 100, phase: 'done', detail: 'Klaar' });
      setMsg((m) => {
        const line = `✓ ${row.displayName}`;
        return m ? `${m} · ${line}` : line;
      });
      void load();
      window.setTimeout(() => {
        setUploads((prev) => {
          const next = { ...prev };
          if (next[row.id]?.phase === 'done') delete next[row.id];
          return next;
        });
      }, 2500);
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Upload mislukt';
      const detail = /netwerk|network|failed to fetch/i.test(raw)
        ? `${raw} (kleinere ZIP / stabieler netwerk)`
        : raw;
      patchUpload(row.id, { phase: 'error', detail, percent: 0 });
    } finally {
      inflightRef.current.delete(row.id);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      <div>
        <h1 className="text-lg font-bold text-ink">Portfolio uploaden</h1>
        <p className="mt-1 text-sm text-muted">
          Kies een <strong className="text-ink">portfoliodag</strong>. Bij elk model: <strong className="text-ink">ZIP
          uploaden</strong>. Je mag <strong className="text-ink">meerdere tegelijk</strong> starten — de lijst blijft
          klikbaar; voortgang zie je per rij en onderaan.
        </p>
      </div>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-burgundy">Portfoliodag (agenda)</h2>
        <p className="mt-1 text-[11px] text-muted">Alleen modellen van de gekozen dag staan in de lijst.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            className={`rounded border px-2.5 py-1.5 text-[11px] font-medium ${
              !dayFilter ? 'border-burgundy bg-burgundy text-white' : 'border-line bg-panel text-ink hover:bg-white'
            }`}
            onClick={() => setDayFilter('')}
          >
            Alle dagen
          </button>
          {days.map((d) => (
            <button
              key={d}
              type="button"
              className={`rounded border px-2.5 py-1.5 text-[11px] font-medium ${
                dayFilter === d
                  ? 'border-burgundy bg-burgundy text-white'
                  : 'border-line bg-panel text-ink hover:bg-white'
              }`}
              onClick={() => setDayFilter(d)}
            >
              {fmtDay(d)}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-burgundy">
            Modellen{dayFilter ? ` — ${fmtDay(dayFilter)}` : ''}
          </h2>
          <button
            type="button"
            className="text-[11px] font-medium text-burgundy hover:underline"
            disabled={loading}
            onClick={() => void load()}
          >
            Vernieuwen
          </button>
        </div>

        {loading ? <p className="mt-3 text-sm text-muted">Laden…</p> : null}
        {err ? <p className="mt-3 text-sm text-red-700">{err}</p> : null}
        {msg ? (
          <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-950">
            {msg}
          </p>
        ) : null}

        {!loading && !visible.length ? (
          <p className="mt-3 text-sm text-muted">
            Geen portfolio-afspraken{dayFilter ? ` op ${fmtDay(dayFilter)}` : ''}.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {visible.map((b) => {
              const u = uploads[b.id];
              const rowBusy = u?.phase === 'uploading' || u?.phase === 'processing';
              return (
                <li key={b.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{b.displayName}</p>
                      <p className="text-[11px] tabular-nums text-muted">
                        {new Date(b.startAt).toLocaleString('nl-BE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                        {typeof b.fileCount === 'number' ? ` · ${b.fileCount} bestand(en) klaar` : ''}
                      </p>
                    </div>

                    {b.modelUserId ? (
                      <>
                        <input
                          ref={(el) => {
                            fileInputRefs.current[b.id] = el;
                          }}
                          type="file"
                          accept=".zip,application/zip,application/x-zip-compressed"
                          className="hidden"
                          disabled={rowBusy}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            e.target.value = '';
                            if (f) void uploadForModel(b, f);
                          }}
                        />
                        <button
                          type="button"
                          disabled={rowBusy}
                          className="shrink-0 rounded bg-burgundy px-3 py-1.5 text-xs font-semibold text-white hover:bg-burgundyDeep disabled:opacity-50"
                          onClick={() => fileInputRefs.current[b.id]?.click()}
                        >
                          {rowBusy ? 'Bezig…' : 'ZIP uploaden'}
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-muted">Geen account</span>
                    )}
                  </div>

                  {u ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span
                          className={
                            u.phase === 'error'
                              ? 'text-red-700'
                              : u.phase === 'done'
                                ? 'text-emerald-800'
                                : 'text-muted'
                          }
                        >
                          {u.phase === 'error'
                            ? `Fout: ${u.detail}`
                            : u.phase === 'done'
                              ? 'Geüpload'
                              : u.detail}
                        </span>
                        {u.phase === 'uploading' || u.phase === 'processing' ? (
                          <span className="tabular-nums text-muted">{u.percent}%</span>
                        ) : null}
                      </div>
                      {(u.phase === 'uploading' || u.phase === 'processing') && (
                        <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-200">
                          <div
                            className="h-full rounded bg-burgundy transition-[width] duration-200"
                            style={{ width: `${Math.min(100, Math.max(2, u.percent))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {activeUploads.length > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-white/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:left-[260px]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-burgundy">
            Actieve uploads ({activeUploads.length}) — je mag andere ZIP’s blijven starten
          </p>
          <ul className="mt-2 max-h-32 space-y-2 overflow-y-auto">
            {activeUploads.map(([id, u]) => (
              <li key={id} className="text-xs">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-ink">{u.displayName}</span>
                  <span className="tabular-nums text-muted">{u.percent}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-200">
                  <div
                    className="h-full rounded bg-burgundy transition-[width] duration-200"
                    style={{ width: `${Math.min(100, Math.max(2, u.percent))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
