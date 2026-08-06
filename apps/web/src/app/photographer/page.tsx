'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getLargeUploadApiBase } from '@/lib/api';
import { CmProgressOverlay } from '@/components/CmProgressOverlay';
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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{
    percent: number;
    sublabel: string;
    label: string;
  } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  // Standaard meest recente portfoliodag selecteren
  useEffect(() => {
    if (!dayFilter && days.length) setDayFilter(days[0]!);
  }, [days, dayFilter]);

  const visible = useMemo(() => {
    if (!dayFilter) return bookings;
    return bookings.filter((b) => (b.shootDate || b.startAt.slice(0, 10)) === dayFilter);
  }, [bookings, dayFilter]);

  const uploadForModel = async (row: BookingRow, file: File) => {
    if (!token || !row.modelUserId) return;
    if (!/\.zip$/i.test(file.name)) {
      setMsg('Kies een .zip-bestand.');
      return;
    }

    setBusy(true);
    setMsg('');
    setUploadProgress({
      percent: 0,
      label: `ZIP voor ${row.displayName}`,
      sublabel: 'Upload starten — laat dit venster open.',
    });

    try {
      const fd = new FormData();
      fd.append('file', file);
      const params = new URLSearchParams();
      params.set('folderSlug', 'portfolio-fotograaf');
      params.set('modelUserId', row.modelUserId);

      const text = await uploadWithProgress(
        `${getLargeUploadApiBase()}/photographer/upload-zip?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
          onProgress: (p) => {
            setUploadProgress({
              percent: Math.max(1, p.percent),
              label: `ZIP voor ${row.displayName}`,
              sublabel: `Bezig — ${p.percent}% · nog ${formatEtaSeconds(p.etaSeconds)}.`,
            });
          },
          onUploadBytesComplete: () => {
            setUploadProgress({
              percent: 100,
              label: `ZIP voor ${row.displayName}`,
              sublabel: 'Bestand ontvangen — server verwerkt nog…',
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

      setMsg(`Klaar: portfolio voor ${row.displayName} is geüpload.`);
      await load();
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Upload mislukt';
      setMsg(
        /netwerk|network|failed to fetch/i.test(raw)
          ? `${raw} Tip: kleinere ZIP of stabieler netwerk.`
          : raw,
      );
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  };

  /** Meerdere rijen achter elkaar: gebruiker kiest per model een ZIP via de knop. */
  const openZipPicker = (bookingId: string) => {
    fileInputRefs.current[bookingId]?.click();
  };

  return (
    <div className="space-y-6">
      {uploadProgress ? (
        <CmProgressOverlay
          label={uploadProgress.label}
          sublabel={uploadProgress.sublabel}
          percent={uploadProgress.percent}
        />
      ) : null}

      <div>
        <h1 className="text-lg font-bold text-ink">Portfolio uploaden</h1>
        <p className="mt-1 text-sm text-muted">
          Kies een <strong className="text-ink">portfoliodag</strong>, en upload per model een ZIP met de knop naast
          de naam. Je kunt zo alle modellen van die dag na elkaar doen.
        </p>
      </div>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-burgundy">Portfoliodag (agenda)</h2>
        <p className="mt-1 text-[11px] text-muted">Alleen modellen van de gekozen dag staan in de lijst.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy}
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
              disabled={busy}
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
            className="text-[11px] font-medium text-burgundy hover:underline disabled:opacity-50"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            Vernieuwen
          </button>
        </div>

        {loading ? <p className="mt-3 text-sm text-muted">Laden…</p> : null}
        {err ? <p className="mt-3 text-sm text-red-700">{err}</p> : null}
        {msg ? (
          <p className="mt-3 rounded border border-line bg-panel px-3 py-2 text-xs leading-relaxed text-ink">{msg}</p>
        ) : null}

        {!loading && !visible.length ? (
          <p className="mt-3 text-sm text-muted">
            Geen portfolio-afspraken{dayFilter ? ` op ${fmtDay(dayFilter)}` : ''}.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {visible.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{b.displayName}</p>
                  <p className="text-[11px] tabular-nums text-muted">
                    {new Date(b.startAt).toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' })}
                    {typeof b.fileCount === 'number'
                      ? ` · ${b.fileCount} bestand(en) klaar`
                      : ''}
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
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = '';
                        if (f) void uploadForModel(b, f);
                      }}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      className="shrink-0 rounded bg-burgundy px-3 py-1.5 text-xs font-semibold text-white hover:bg-burgundyDeep disabled:opacity-50"
                      onClick={() => openZipPicker(b.id)}
                    >
                      ZIP uploaden
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-muted">Geen account</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
