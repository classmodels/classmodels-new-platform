'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type DownloadRow = {
  id: string;
  label: string;
  sortOrder: number;
  active: boolean;
  availableFrom: string | null;
  mediaAsset: {
    id: string;
    originalName: string;
    storageKey: string;
    sizeBytes: number;
    folder: { slug: string; label: string } | null;
  };
};

function formatBytes(n: number): string {
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function AdminPortalDownloadsPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<DownloadRow[]>([]);
  const [label, setLabel] = useState('');
  const [assetId, setAssetId] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const list = await adminFetch<DownloadRow[]>('/admin/portal-downloads', token);
    setRows(list);
  }, [token]);

  useEffect(() => {
    void load().catch(() => setRows([]));
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !can('admin.media.write')) return;
    setMsg('');
    try {
      await adminFetch('/admin/portal-downloads', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), mediaAssetId: assetId.trim() }),
      });
      setLabel('');
      setAssetId('');
      setMsg('Downloadknop aangemaakt.');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Opslaan mislukt');
    }
  };

  const remove = async (id: string) => {
    if (!token || !confirm('Downloadknop verwijderen?')) return;
    await adminFetch(`/admin/portal-downloads/${id}`, token, { method: 'DELETE' });
    await load();
  };

  if (!can('admin.media.read')) {
    return <p className="text-sm text-muted">Geen rechten voor mediatheek/downloads.</p>;
  }

  return (
    <div className="max-w-3xl space-y-6 p-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-burgundy">Portaal-downloadknoppen</h1>
        <p className="mt-2 text-sm text-muted">
          Koppel een knop aan één mediabestand (staat in R2). Modellen zien deze onder &quot;Extra downloads&quot; in het
          try-out/modeshow-gedeelte. Kopieer het <strong>asset-id</strong> uit de mediatheek (detail van een bestand).
        </p>
      </div>

      {can('admin.media.write') ? (
        <form onSubmit={(e) => void create(e)} className="space-y-3 rounded border border-line bg-white p-4">
          <label className="block text-sm">
            Knoptekst
            <input
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Download modeshow-film"
              required
            />
          </label>
          <label className="block text-sm">
            Media asset-id (UUID uit mediatheek)
            <input
              className="mt-1 w-full rounded border border-line px-2 py-1.5 font-mono text-xs"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="bada0560-…"
              required
            />
          </label>
          <button type="submit" className="rounded bg-burgundy px-3 py-1.5 text-sm font-medium text-white">
            Knop toevoegen
          </button>
          {msg ? <p className="text-sm text-ink">{msg}</p> : null}
        </form>
      ) : null}

      <ul className="divide-y divide-line rounded border border-line bg-white">
        {rows.length === 0 ? (
          <li className="p-4 text-sm text-muted">Nog geen downloadknoppen.</li>
        ) : (
          rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 p-4 text-sm">
              <div>
                <p className="font-semibold text-ink">{r.label}</p>
                <p className="text-muted">
                  {r.mediaAsset.originalName} ({formatBytes(r.mediaAsset.sizeBytes)}) — map{' '}
                  {r.mediaAsset.folder?.label ?? '?'}
                </p>
                <p className="font-mono text-[10px] text-muted">R2: {r.mediaAsset.storageKey}</p>
                <p className="font-mono text-[10px] text-muted">asset: {r.mediaAsset.id}</p>
              </div>
              {can('admin.media.write') ? (
                <button
                  type="button"
                  onClick={() => void remove(r.id)}
                  className="text-xs text-red-800 underline"
                >
                  Verwijderen
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
