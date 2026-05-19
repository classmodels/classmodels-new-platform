'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase, parseApiErrorBody } from '@/lib/api';
import { MODEL_BTN_GOLD, MODEL_BTN_SILVER } from './model-portal-buttons';

type ModeshowMeta = {
  availableFrom: string;
  availableNow: boolean;
  folderSlug: string;
  photosZip: { id: string; originalName: string; sizeBytes: number } | null;
  film: { id: string; originalName: string; sizeBytes: number; mimeType: string } | null;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatNlDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
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

  const fromLabel = meta ? formatNlDate(meta.availableFrom) : '';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <h2 className="font-serif text-xl font-semibold text-burgundy">Modeshow 28 maart</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Download de foto&apos;s (ZIP) en de film van de modeshow. Je krijgt het volledige bestand zoals geüpload door
          het bureau.
        </p>
        {meta && !meta.availableNow ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Beschikbaar vanaf <strong>{fromLabel}</strong>.
          </p>
        ) : null}
        {err ? <p className="mt-3 text-sm text-red-700">{err}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-panel/40 p-5">
          <h3 className="font-semibold text-ink">Foto&apos;s</h3>
          {meta?.photosZip ? (
            <p className="mt-2 text-xs text-ink">
              {meta.photosZip.originalName} ({formatBytes(meta.photosZip.sizeBytes)})
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-900">Nog geen ZIP in «{meta?.folderSlug}».</p>
          )}
          <button
            type="button"
            disabled={!meta?.availableNow || !meta.photosZip || busy !== null}
            className={`mt-4 w-full ${MODEL_BTN_SILVER}`}
            onClick={() => {
              if (!token) return;
              setBusy('photos');
              void downloadWithToken(
                '/portal/model/modeshow-downloads/photos.zip',
                token,
                meta?.photosZip?.originalName ?? 'fotomodeshow-28-maart.zip',
              )
                .catch((e) => alert(e instanceof Error ? e.message : 'Download mislukt'))
                .finally(() => setBusy(null));
            }}
          >
            {busy === 'photos' ? 'Bezig…' : 'Download de foto’s van de modeshow 28 maart'}
          </button>
        </section>

        <section className="rounded-xl border border-line bg-panel/40 p-5">
          <h3 className="font-semibold text-ink">Film</h3>
          {meta?.film ? (
            <p className="mt-2 text-xs text-ink">
              {meta.film.originalName} ({formatBytes(meta.film.sizeBytes)})
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-900">Nog geen video in de map.</p>
          )}
          <button
            type="button"
            disabled={!meta?.availableNow || !meta.film || busy !== null}
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
            {busy === 'film' ? 'Bezig…' : 'Download hier de film van de modeshow'}
          </button>
        </section>
      </div>
    </div>
  );
}