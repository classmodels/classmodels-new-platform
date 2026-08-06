'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

/** Voor matching ZIP-naam ↔ modelnaam. */
function normalizePersonKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.zip$/i, '')
    .replace(/class[\s._-]*models/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchBookingForZip(fileName: string, bookings: BookingRow[]): BookingRow | null {
  const key = normalizePersonKey(fileName);
  if (!key) return null;
  const withAccount = bookings.filter((b) => b.modelUserId);
  const exact = withAccount.filter((b) => normalizePersonKey(b.displayName) === key);
  if (exact.length === 1) return exact[0];
  const partial = withAccount.filter((b) => {
    const n = normalizePersonKey(b.displayName);
    return n.length >= 2 && (key.includes(n) || n.includes(key));
  });
  if (partial.length === 1) return partial[0];
  return null;
}

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

  const uploadOne = async (
    file: File,
    kind: 'zip' | 'image',
    targetModelId: string | undefined,
    progressLabel: string,
  ) => {
    if (!token) throw new Error('Niet ingelogd.');
    const fd = new FormData();
    fd.append('file', file);
    const params = new URLSearchParams();
    params.set('folderSlug', folderSlug);
    if (folderSlug === 'portfolio-fotograaf' && targetModelId) {
      params.set('modelUserId', targetModelId);
    }
    const path = kind === 'zip' ? '/photographer/upload-zip' : '/photographer/upload';
    const text = await uploadWithProgress(`${getLargeUploadApiBase()}${path}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
      onProgress: (p) => {
        setUploadProgress({
          percent: p.percent,
          sublabel: `${progressLabel} — nog ${formatEtaSeconds(p.etaSeconds)}.`,
        });
      },
      onUploadBytesComplete: () => {
        setUploadProgress({
          percent: 100,
          sublabel: `${progressLabel} — server verwerkt nog…`,
        });
      },
    });
    const body = JSON.parse(text) as {
      error?: string;
      id?: string;
      assetId?: string;
      message?: string;
      ok?: boolean;
    };
    if (body?.error) throw new Error(body.error);
    if (body?.message && !body.id && !body.assetId && body.ok !== true) throw new Error(body.message);
  };

  const upload = async (file: File | null, kind: 'zip' | 'image') => {
    if (!file || !token) return;
    if (folderSlug === 'portfolio-fotograaf' && !modelUserId.trim()) {
      setMsg('Kies eerst een model (of gebruik «Meerdere ZIP’s» met bestandsnamen).');
      return;
    }
    if (kind === 'zip' && !/\.zip$/i.test(file.name)) {
      setMsg('Kies een .zip-bestand.');
      return;
    }
    setBusy(true);
    setMsg('');
    setUploadProgress({
      percent: 0,
      sublabel: kind === 'zip' ? 'ZIP uploaden…' : 'Foto uploaden…',
    });
    try {
      await uploadOne(file, kind, modelUserId.trim() || undefined, selectedName || file.name);
      setMsg(`Geüpload: ${selectedName ? `${selectedName} class-models` : file.name}`);
      await load();
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Upload mislukt';
      setMsg(
        /netwerk|network|failed to fetch|abortr/i.test(raw)
          ? `${raw} Tip: kleinere ZIP of stabieler netwerk.`
          : raw,
      );
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  };

  /** Meerdere ZIP’s: bestandsnaam moet overeenkomen met modelnaam (bv. «Jan Peeters.zip»). */
  const uploadManyZips = async (files: FileList | File[] | null) => {
    if (!token || !files?.length) return;
    const list = Array.from(files).filter((f) => /\.zip$/i.test(f.name));
    if (!list.length) {
      setMsg('Geen .zip-bestanden geselecteerd.');
      return;
    }
    if (folderSlug !== 'portfolio-fotograaf') {
      setMsg('Meerdere ZIP’s alleen voor map «Portfolio (→ model)».');
      return;
    }

    setBusy(true);
    setMsg('');
    const ok: string[] = [];
    const fail: string[] = [];

    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i]!;
        const match = matchBookingForZip(file.name, bookings);
        if (!match?.modelUserId) {
          fail.push(`${file.name} → geen uniek model gevonden`);
          continue;
        }
        const label = `${i + 1}/${list.length}: ${match.displayName}`;
        setUploadProgress({ percent: 0, sublabel: `${label} — starten…` });
        try {
          await uploadOne(file, 'zip', match.modelUserId, label);
          ok.push(`${match.displayName} (${file.name})`);
        } catch (e) {
          fail.push(`${file.name} → ${e instanceof Error ? e.message : 'mislukt'}`);
        }
      }
      const parts: string[] = [];
      if (ok.length) parts.push(`OK (${ok.length}): ${ok.join('; ')}`);
      if (fail.length) parts.push(`Mislukt (${fail.length}): ${fail.join('; ')}`);
      setMsg(parts.join(' — ') || 'Geen bestanden verwerkt.');
      await load();
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  };

  const canUploadSingle = !busy && (folderSlug !== 'portfolio-fotograaf' || !!modelUserId.trim());
  const canUploadBatch = !busy && folderSlug === 'portfolio-fotograaf' && bookings.some((b) => b.modelUserId);

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
        Upload per model een <strong className="text-ink">ZIP</strong> (tot 4 GB), of meerdere ZIP’s tegelijk. Bestanden
        heten dan bv. <strong className="text-ink">«Voornaam Achternaam.zip»</strong> of{' '}
        <strong className="text-ink">«Voornaam Achternaam class-models.zip»</strong> — zo koppelt het systeem automatisch
        aan het juiste model.
      </p>
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
        Tip: <strong>Meerdere ZIP’s</strong> = geen model vooraf selecteren; de bestandsnaam moet overeenkomen met de
        naam in de lijst hieronder.
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
                <li
                  key={b.id}
                  className={`flex flex-wrap items-center justify-between gap-2 py-2 ${active ? 'bg-burgundy/[0.04]' : ''}`}
                >
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
            <div className="text-xs">
              <span className="font-medium text-ink">Geselecteerd model (voor 1 bestand)</span>
              <p className="mt-1 rounded border border-line bg-panel px-2 py-1.5 text-sm text-ink">
                {selectedName || (modelUserId ? modelUserId : 'Nog geen model — of gebruik meerdere ZIP’s')}
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <label
            className={`inline-block cursor-pointer rounded bg-burgundy px-4 py-2 text-sm font-medium text-white hover:bg-burgundyDeep ${
              !canUploadBatch ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {busy ? 'Bezig…' : 'Meerdere ZIP’s…'}
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              multiple
              className="hidden"
              disabled={!canUploadBatch}
              onChange={(e) => {
                const files = e.target.files;
                e.target.value = '';
                void uploadManyZips(files);
              }}
            />
          </label>
          <label
            className={`inline-block cursor-pointer rounded border border-burgundy bg-white px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/[0.06] ${
              !canUploadSingle ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {busy ? 'Bezig…' : '1 ZIP (geselecteerd model)…'}
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden"
              disabled={!canUploadSingle}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = '';
                void upload(f, 'zip');
              }}
            />
          </label>
          <label
            className={`inline-block cursor-pointer rounded border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-panel ${
              !canUploadSingle ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {busy ? 'Bezig…' : 'Losse foto’s…'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic"
              className="hidden"
              disabled={!canUploadSingle}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = '';
                void upload(f, 'image');
              }}
            />
          </label>
        </div>
        {msg ? <p className="mt-2 text-xs leading-relaxed text-ink">{msg}</p> : null}
      </section>
    </div>
  );
}
