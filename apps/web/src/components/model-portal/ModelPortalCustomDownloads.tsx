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
import { MODEL_BTN_GOLD } from './model-portal-buttons';

type PortalDownloadRow = {
  id: string;
  label: string;
  availableFrom: string | null;
  asset: { id: string; originalName: string; sizeBytes: number; mimeType: string };
};

function formatBytes(n: number): string {
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ModelPortalCustomDownloads() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<PortalDownloadRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadProgressUpdate | null>(null);

  const load = useCallback(async () => {
    if (!token || !can('portal.model.media.read')) return;
    setErr(null);
    try {
      const list = await apiFetch<PortalDownloadRow[]>('/portal/downloads', { token });
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setRows([]);
    }
  }, [token, can]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!can('portal.model.media.read')) return null;
  if (!rows.length && !err) return null;

  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-5 shadow-sm">
      <h3 className="font-serif text-lg font-semibold text-burgundy">Extra downloads</h3>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              disabled={busyId !== null}
              className={`w-full ${MODEL_BTN_GOLD}`}
              onClick={() => {
                if (!token) return;
                setBusyId(row.id);
                setProgress({
                  phase: 'connecting',
                  percent: null,
                  loaded: 0,
                  total: row.asset.sizeBytes,
                  indeterminate: true,
                });
                void downloadWithProgress(
                  `${getApiBase()}/portal/downloads/${row.id}/file`,
                  {
                    token,
                    fallbackName: row.asset.originalName,
                    expectedBytes: row.asset.sizeBytes,
                    onProgress: setProgress,
                  },
                )
                  .catch((e) => alert(e instanceof Error ? e.message : 'Download mislukt'))
                  .finally(() => {
                    setBusyId(null);
                    setProgress(null);
                  });
              }}
            >
              {busyId === row.id ?
                progress?.percent != null ?
                  `Downloaden… ${progress.percent}%`
                : 'Download gestart…'
              : row.label}
            </button>
            <p className="mt-1 text-xs text-muted">
              {row.asset.originalName} ({formatBytes(row.asset.sizeBytes)})
            </p>
          </li>
        ))}
      </ul>
      {progress && busyId ? (
        <CmProgressBar
          prominent
          label={
            progress.phase === 'connecting' ?
              'Verbinding met server — even geduld'
            : progress.percent != null ?
              `Downloaden (${progress.percent}%)`
            : 'Download bezig — laat dit tabblad open'
          }
          sublabel={downloadProgressSublabel(progress)}
          percent={progress.indeterminate ? undefined : (progress.percent ?? undefined)}
          indeterminate={progress.indeterminate}
        />
      ) : null}
    </div>
  );
}
