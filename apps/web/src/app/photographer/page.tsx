'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase } from '@/lib/api';
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

export default function PhotographerPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [folderSlug, setFolderSlug] = useState<'portfolio-fotograaf' | 'portfolio-divers'>('portfolio-fotograaf');
  const [modelUserId, setModelUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; sublabel: string } | null>(null);
  const [dayFilter, setDayFilter] = useState('');

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
      const d = b.shootDate || b.startAt.slice(0, 10);
      s.add(d);
    }
    return [...s].sort().reverse();
  }, [bookings]);

  const visible = useMemo(() => {
    if (!dayFilter) return bookings;
    return bookings.filter((b) => (b.shootDate || b.startAt.slice(0, 10)) === dayFilter);
  }, [bookings, dayFilter]);

  const selectedName = useMemo(() => {
    const b = bookings.find((x) => x.modelUserId === modelUserId);
    return b?.displayName ?? '';
  }, [bookings, modelUserId]);

  const upload = async (file: File | null) => {
    if (!file || !token) return;
    if (folderSlug === 'portfolio-fotograaf' && !modelUserId.trim()) {
      setMsg('Kies eerst een model.');
      return;
    }
    setBusy(true);
    setMsg('');
    setUploadProgress({ percent: 0, sublabel: 'Dit kan even duren — laat dit venster open (tot 4 GB).' });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const params = new URLSearchParams();
      params.set('folderSlug', folderSlug);
      if (folderSlug === 'portfolio-fotograaf' && modelUserId.trim()) {
        params.set('modelUserId', modelUserId.trim());
      }
      const text = await uploadWithProgress(`${getApiBase()}/photographer/upload?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
        onProgress: (p) => {
          setUploadProgress({
            percent: p.percent,
            sublabel: `Dit kan even duren — nog ${formatEtaSeconds(p.etaSeconds)}.`,
          });
        },
        onUploadBytesComplete: () => {
          setUploadProgress({
            percent: 100,
            sublabel: 'Bestand ontvangen — de server verwerkt nog. Dit kan even duren.',
          });
        },
      });
      const body = JSON.parse(text) as { error?: string; id?: string };
      if (body?.error) throw new Error(body.error);
      const label = selectedName ? `${selectedName} class-models` : file.name;
      setMsg(`Geüpload: ${label}`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Upload mislukt');
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {uploadProgress ? (
        <CmProgressOverlay
          label="Portfolio uploaden…"
          sublabel={uploadProgress.sublabel}
          percent={uploadProgress.percent}
        />
      ) : null}
      <p className="text-sm leading-relaxed text-muted">
        Kies een model uit de lijst (aanmaak portfolio) en upload per model een <strong className="text-ink">ZIP</strong>{' '}
        met foto&apos;s in hoge kwaliteit (of losse foto&apos;s). Bestanden worden hernoemd naar{' '}
        <strong className="text-ink">«naam class-models»</strong> en verschijnen als download in de modellenfiche.
      </p>
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
        Max. <strong>4 GB</strong> per bestand. Houd dit venster open tijdens de upload. Map{' '}
        <strong>Divers</strong> is zonder model — alleen zichtbaar in de admin-mediatheek.
      </p>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-burgundy">Modellen met portfolio-afspraak</h2>
          <label className="text-[11px]">
            <span className="font-medium text-ink">Filter dag</span>
            <select
              className="ml-2 rounded border border-line bg-white px-2 py-1 text-xs"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
            >
              <option value="">Alle dagen</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {new Date(d + 'T12:00:00').toLocaleDateString('nl-BE')}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? <p className="mt-2 text-sm text-muted">Laden…</p> : null}
        {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}
        {!loading && !visible.length ? (
          <p className="mt-2 text-sm text-muted">Geen portfolio-afspraken in deze periode.</p>
        ) : (
          <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto text-xs">
            {visible.map((b) => {
              const active = b.modelUserId && b.modelUserId === modelUserId;
              return (
                <li key={b.id} className={`flex flex-wrap items-center justify-between gap-2 py-2 ${active ? 'bg-burgundy/[0.04]' : ''}`}>
                  <span className="font-medium text-ink">{b.displayName}</span>
                  <span className="tabular-nums text-muted">
                    {new Date(b.startAt).toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span className="text-[10px] text-muted">
                    {typeof b.fileCount === 'number' ? `${b.fileCount} bestand(en)` : ''}
                  </span>
                  {b.modelUserId ? (
                    <button
                      type="button"
                      className={`rounded border px-2 py-0.5 text-[10px] ${
                        active
                          ? 'border-burgundy bg-burgundy text-white'
                          : 'border-line bg-panel text-ink hover:bg-white'
                      }`}
                      onClick={() => {
                        setFolderSlug('portfolio-fotograaf');
                        setModelUserId(b.modelUserId!);
                      }}
                    >
                      {active ? 'Geselecteerd' : 'Selecteer'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted">Geen account gekoppeld</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-burgundy">Upload per model</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="font-medium text-ink">Map</span>
            <select
              className="mt-1 w-full rounded border border-line bg-white px-2 py-1.5 text-sm"
              value={folderSlug}
              onChange={(e) => setFolderSlug(e.target.value as 'portfolio-fotograaf' | 'portfolio-divers')}
            >
              <option value="portfolio-fotograaf">Portfolio (→ model)</option>
              <option value="portfolio-divers">Divers (geen model)</option>
            </select>
          </label>
          {folderSlug === 'portfolio-fotograaf' ? (
            <div className="text-xs">
              <span className="font-medium text-ink">Geselecteerd model</span>
              <p className="mt-1 rounded border border-line bg-panel px-2 py-1.5 text-sm text-ink">
                {selectedName || (modelUserId ? modelUserId : 'Nog geen model gekozen')}
              </p>
            </div>
          ) : null}
        </div>
        <label className="mt-4 inline-block cursor-pointer rounded bg-burgundy px-4 py-2 text-sm font-medium text-white hover:bg-burgundyDeep disabled:opacity-50">
          {busy ? 'Bezig…' : 'ZIP of foto’s kiezen…'}
          <input
            type="file"
            accept="image/*,.zip,application/zip,application/x-zip-compressed"
            className="hidden"
            disabled={busy || (folderSlug === 'portfolio-fotograaf' && !modelUserId.trim())}
            onChange={(e) => void upload(e.target.files?.[0] ?? null)}
          />
        </label>
        {msg ? <p className="mt-2 text-xs text-ink">{msg}</p> : null}
      </section>
    </div>
  );
}
