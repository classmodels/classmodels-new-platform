'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase, parseApiErrorBody } from '@/lib/api';
import { MODEL_BTN_GOLD, MODEL_BTN_SILVER } from './model-portal-buttons';

type ModeshowMeta = {
  filmAvailableFrom: string;
  filmAvailableNow: boolean;
  filmAvailableFromLabel: string;
  photosAvailableNow: boolean;
  folderSlug: string;
  folderSlugs?: string[];
  photosZip: { id: string; originalName: string; sizeBytes: number } | null;
  film: { id: string; originalName: string; sizeBytes: number; mimeType: string } | null;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function downloadWithToken(path: string, token: string, fallbackName: string) {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(parseApiErrorBody(t || res.statusText));
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition');
  let name = fallbackName;
  const m = cd?.match(/filename\*=UTF-8''([^;]+)/);
  if (m?.[1]) name = decodeURIComponent(m[1]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ModelModeshowDownloadsTab() {
  const { token, can } = useAuth();
  const [meta, setMeta] = useState<ModeshowMeta | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'photos' | 'film' | null>(null);

  const load = useCallback(async () => {
    if (!token || !can('portal.model.media.read')) return;
    setErr(null);
    try {
      const m = await apiFetch<ModeshowMeta>('/portal/model/modeshow-downloads', { token });
      setMeta(m);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setMeta(null);
    }
  }, [token, can]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!can('portal.model.media.read')) {
    return (
      <p className="text-sm text-muted">
        Je account heeft geen rechten om mediabestanden te downloaden. Vraag het bureau om{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.media.read</code>.
      </p>
    );
  }

  if (!meta && !err) {
    return <p className="text-sm text-muted">Laden…</p>;
  }

  const filmFromLabel = meta?.filmAvailableFromLabel ?? '21 mei 2026';
  const searchFolders = meta?.folderSlugs?.join(', ') ?? meta?.folderSlug ?? 'uploads';

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted">
        Download hieronder de foto&apos;s (ZIP) en de film van de try-out modeshow.
      </p>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <h3 className="font-serif text-lg font-semibold text-burgundy">Foto&apos;s</h3>
        <button
          type="button"
          disabled={!meta?.photosAvailableNow || !meta.photosZip || busy !== null}
          className={`mt-4 w-full ${MODEL_BTN_SILVER}`}
          onClick={() => {
            if (!token) return;
            setBusy('photos');
            void downloadWithToken(
              '/portal/model/modeshow-downloads/photos.zip',
              token,
              meta?.photosZip?.originalName ?? 'fotomodeshow.zip',
            )
              .catch((e) => alert(e instanceof Error ? e.message : 'Download mislukt'))
              .finally(() => setBusy(null));
          }}
        >
          {busy === 'photos' ? 'Bezig…' : 'Download foto’s try-out modeshow'}
        </button>
        {meta?.photosZip ? (
          <p className="mt-3 rounded-md border border-line bg-panel/60 px-3 py-2 text-xs text-ink">
            <span className="font-medium">ZIP op de server:</span>
            <br />
            {meta.photosZip.originalName}
            <span className="text-muted"> ({formatBytes(meta.photosZip.sizeBytes)})</span>
          </p>
        ) : (
          <p className="mt-3 text-xs text-amber-900">
            Nog geen ZIP gevonden in mediatheek ({searchFolders}). Zet «Modeshow … .zip» in map <strong>Uploads</strong>{' '}
            of upload opnieuw via Mediatheek.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <h3 className="font-serif text-lg font-semibold text-burgundy">Film</h3>
        <p className="mt-2 text-sm text-amber-950">
          Beschikbaar vanaf <strong>{filmFromLabel}</strong>
        </p>
        <button
          type="button"
          disabled={!meta?.filmAvailableNow || !meta.film || busy !== null}
          className={`mt-4 w-full ${MODEL_BTN_GOLD}`}
          onClick={() => {
            if (!token) return;
            setBusy('film');
            void downloadWithToken(
              '/portal/model/modeshow-downloads/film',
              token,
              meta?.film?.originalName ?? 'modeshow-film.mp4',
            )
              .catch((e) => alert(e instanceof Error ? e.message : 'Download mislukt'))
              .finally(() => setBusy(null));
          }}
        >
          {busy === 'film' ? 'Bezig…' : 'Download film try-out modeshow'}
        </button>
        {meta?.film ? (
          <p className="mt-3 rounded-md border border-line bg-panel/60 px-3 py-2 text-xs text-ink">
            <span className="font-medium">Bestand:</span>
            <br />
            {meta.film.originalName}
            <span className="text-muted"> ({formatBytes(meta.film.sizeBytes)})</span>
          </p>
        ) : meta?.filmAvailableNow ? (
          <p className="mt-3 text-xs text-amber-900">Nog geen film in de mediatheek-map.</p>
        ) : null}
      </section>
      </div>
    </div>
  );
}
