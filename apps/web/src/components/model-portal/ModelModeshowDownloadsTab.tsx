'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase } from '@/lib/api';
import {
  downloadProgressSublabel,
  downloadWithProgress,
  type DownloadProgressUpdate,
} from '@/lib/download-with-progress';
import { CmProgressBar } from '@/components/CmProgressBar';
import { MODEL_BTN_GOLD, MODEL_BTN_SILVER } from './model-portal-buttons';
import { ModelPortalCustomDownloads } from './ModelPortalCustomDownloads';

type ModeshowMeta = {
  filmAvailableFrom: string;
  filmAvailableNow: boolean;
  filmAvailableFromLabel: string;
  photosAvailableNow: boolean;
  folderSlug: string;
  folderSlugs?: string[];
  configuredPhotosName?: string | null;
  configuredFilmName?: string | null;
  photosZip: { id: string; originalName: string; sizeBytes: number } | null;
  film: { id: string; originalName: string; sizeBytes: number; mimeType: string } | null;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function progressTitle(kind: 'photos' | 'film', p: DownloadProgressUpdate): string {
  const what = kind === 'film' ? 'Film' : 'Foto’s';
  if (p.phase === 'connecting') {
    return `${what}: verbinding maken — even geduld`;
  }
  if (p.phase === 'saving') {
    return `${what}: opslaan op je apparaat…`;
  }
  if (p.percent != null) {
    return `${what}: downloaden (${p.percent}%)`;
  }
  return `${what}: downloaden — dit kan lang duren`;
}

function DownloadProgressPanel({
  kind,
  progress,
}: {
  kind: 'photos' | 'film';
  progress: DownloadProgressUpdate;
}) {
  return (
    <div className="mt-4">
      <CmProgressBar
        prominent
        label={progressTitle(kind, progress)}
        sublabel={downloadProgressSublabel(progress)}
        percent={progress.indeterminate ? undefined : (progress.percent ?? undefined)}
        indeterminate={progress.indeterminate}
      />
    </div>
  );
}

export function ModelModeshowDownloadsTab() {
  const { token, can } = useAuth();
  const [meta, setMeta] = useState<ModeshowMeta | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'photos' | 'film' | null>(null);
  const [progress, setProgress] = useState<DownloadProgressUpdate | null>(null);

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

  const startDownload = (kind: 'photos' | 'film', path: string, fallbackName: string, sizeBytes: number) => {
    if (!token) return;
    setBusy(kind);
    setProgress({
      phase: 'connecting',
      percent: null,
      loaded: 0,
      total: sizeBytes > 0 ? sizeBytes : null,
      indeterminate: true,
    });
    void downloadWithProgress(`${getApiBase()}${path}`, {
      token,
      fallbackName,
      expectedBytes: sizeBytes > 0 ? sizeBytes : undefined,
      onProgress: setProgress,
    })
      .catch((e) => alert(e instanceof Error ? e.message : 'Download mislukt'))
      .finally(() => {
        setBusy(null);
        setProgress(null);
      });
  };

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
  const photosBtnLabel = meta?.photosZip?.originalName?.trim()
    ? `Download ${meta.photosZip.originalName}`
    : meta?.configuredPhotosName
      ? `Download ${meta.configuredPhotosName}`
      : 'Download foto’s try-out modeshow';
  const filmBtnLabel = meta?.film?.originalName?.trim()
    ? `Download ${meta.film.originalName}`
    : meta?.configuredFilmName
      ? `Download ${meta.configuredFilmName}`
      : 'Download film try-out modeshow';

  const photosBusy = busy === 'photos';
  const filmBusy = busy === 'film';

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted">
        Klik op download — je ziet meteen een <strong>voortgangsbalk</strong> (ook tijdens het wachten op de server).
        Laat dit tabblad open tot de download klaar is.
      </p>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      {busy && progress ? (
        <div className="sticky top-2 z-20">
          <DownloadProgressPanel kind={busy} progress={progress} />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <h3 className="font-serif text-lg font-semibold text-burgundy">Foto&apos;s</h3>
          <button
            type="button"
            disabled={!meta?.photosAvailableNow || !meta.photosZip || busy !== null}
            className={`mt-4 w-full ${MODEL_BTN_SILVER}`}
            onClick={() => {
              if (!meta?.photosZip) return;
              startDownload(
                'photos',
                '/portal/model/modeshow-downloads/photos.zip',
                meta.photosZip.originalName,
                meta.photosZip.sizeBytes,
              );
            }}
          >
            {photosBusy ?
              progress?.percent != null ?
                `Downloaden… ${progress.percent}%`
              : 'Download gestart…'
            : photosBtnLabel}
          </button>
          {photosBusy && progress ? <DownloadProgressPanel kind="photos" progress={progress} /> : null}
          {meta?.photosZip ? (
            <p className="mt-3 rounded-md border border-line bg-panel/60 px-3 py-2 text-xs text-ink">
              <span className="font-medium">Bestand:</span>
              <br />
              {meta.photosZip.originalName}
              <span className="text-muted"> ({formatBytes(meta.photosZip.sizeBytes)})</span>
            </p>
          ) : (
            <p className="mt-3 text-xs text-amber-900">
              {meta?.configuredPhotosName ? (
                <>
                  Bestand <strong>{meta.configuredPhotosName}</strong> niet gevonden in{' '}
                  <code className="rounded bg-zinc-100 px-1">{searchFolders}</code>.
                </>
              ) : (
                <>Nog geen foto-ZIP in de mediatheek.</>
              )}
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
              if (!meta?.film) return;
              startDownload(
                'film',
                '/portal/model/modeshow-downloads/film',
                meta.film.originalName,
                meta.film.sizeBytes,
              );
            }}
          >
            {filmBusy ?
              progress?.percent != null ?
                `Downloaden… ${progress.percent}%`
              : 'Download gestart — even geduld…'
            : filmBtnLabel}
          </button>
          {filmBusy && progress ? <DownloadProgressPanel kind="film" progress={progress} /> : null}
          {meta?.film ? (
            <p className="mt-3 rounded-md border border-line bg-panel/60 px-3 py-2 text-xs text-ink">
              <span className="font-medium">Bestand:</span>
              <br />
              {meta.film.originalName}
              <span className="text-muted"> ({formatBytes(meta.film.sizeBytes)})</span>
            </p>
          ) : meta?.filmAvailableNow ? (
            <p className="mt-3 text-xs text-amber-900">
              {meta?.configuredFilmName ? (
                <>
                  Bestand <strong>{meta.configuredFilmName}</strong> niet gevonden in{' '}
                  <code className="rounded bg-zinc-100 px-1">{searchFolders}</code>.
                </>
              ) : (
                <>Nog geen film in de mediatheek.</>
              )}
            </p>
          ) : null}
        </section>
      </div>

      <ModelPortalCustomDownloads />
    </div>
  );
}
