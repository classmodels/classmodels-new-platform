'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase } from '@/lib/api';

type BookingRow = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  modelUserId: string | null;
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

  const upload = async (file: File | null) => {
    if (!file || !token) return;
    setBusy(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const params = new URLSearchParams();
      params.set('folderSlug', folderSlug);
      if (folderSlug === 'portfolio-fotograaf' && modelUserId.trim()) {
        params.set('modelUserId', modelUserId.trim());
      }
      const res = await fetch(`${getApiBase()}/photographer/upload?${params.toString()}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = (await res.json()) as { error?: string; id?: string };
      if (!res.ok || body?.error) throw new Error(body?.error || (await res.text()));
      setMsg(`Geüpload: ${file.name}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Upload mislukt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted">
        Upload alleen portfoliofoto&apos;s. Kies de map <strong className="text-ink">Portfolio (→ model)</strong> en het
        model-account (UUID) om bestanden aan dat model te koppelen voor download in het modellenportaal. Map{' '}
        <strong className="text-ink">Divers</strong> is voor bestanden zonder model — enkel zichtbaar in de mediatheek
        voor admins.
      </p>
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
        Maximale bestandsgrootte: standaard 500 MB per bestand (omgeving <code className="text-[10px]">PHOTOGRAPHER_UPLOAD_MAX_BYTES</code>).
        Zeer grote leveringen: splits over meerdere bestanden of verhoog de limiet en reverse-proxy timeouts.
      </p>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-burgundy">Portfolio-afspraken (recent)</h2>
        {loading ? <p className="mt-2 text-sm text-muted">Laden…</p> : null}
        {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}
        {!loading && !bookings.length ? (
          <p className="mt-2 text-sm text-muted">Geen portfolio-afspraken in de komende/periode.</p>
        ) : (
          <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto text-xs">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-medium text-ink">{b.displayName}</span>
                <span className="tabular-nums text-muted">
                  {new Date(b.startAt).toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                {b.modelUserId ? (
                  <button
                    type="button"
                    className="rounded border border-line bg-panel px-2 py-0.5 text-[10px] text-ink hover:bg-white"
                    onClick={() => {
                      setFolderSlug('portfolio-fotograaf');
                      setModelUserId(b.modelUserId!);
                    }}
                  >
                    UUID invullen
                  </button>
                ) : (
                  <span className="text-[10px] text-muted">Geen account gekoppeld</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-burgundy">Upload</h2>
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
            <label className="block text-xs">
              <span className="font-medium text-ink">Model user-id (UUID)</span>
              <input
                className="mt-1 w-full rounded border border-line bg-white px-2 py-1.5 font-mono text-[11px]"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={modelUserId}
                onChange={(e) => setModelUserId(e.target.value)}
              />
            </label>
          ) : null}
        </div>
        <label className="mt-4 inline-block cursor-pointer rounded bg-burgundy px-4 py-2 text-sm font-medium text-white hover:bg-burgundyDeep disabled:opacity-50">
          {busy ? 'Bezig…' : 'Afbeelding kiezen…'}
          <input
            type="file"
            accept="image/*"
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
