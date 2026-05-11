'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-api';
import { getApiBase } from '@/lib/api';

type MediaFolder = {
  id: string;
  slug: string;
  label: string;
  assets: {
    id: string;
    originalName: string;
    storageKey: string;
    mimeType: string;
    webpKey?: string | null;
    thumbKey?: string | null;
  }[];
};

type MediaAsset = MediaFolder['assets'][number];

function publicUrl(key: string) {
  return `${getApiBase()}/media/public/${encodeURIComponent(key)}`;
}

function isVideoAsset(a: MediaAsset) {
  const m = (a.mimeType || '').toLowerCase();
  if (m.startsWith('video/')) return true;
  const n = a.originalName.toLowerCase();
  return /\.(mp4|webm|ogg|mov|m4v)$/.test(n);
}

function isImageAsset(a: MediaAsset) {
  const m = (a.mimeType || '').toLowerCase();
  if (m.startsWith('image/')) return true;
  const n = a.originalName.toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/.test(n);
}

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (url: string) => void;
  token: string | null;
  canRead: boolean;
  canWrite: boolean;
  /** Alleen afbeeldingen tonen, of ook video’s (voor video-blok). */
  mode: 'image' | 'video';
};

export function ContainerMediaPicker({ open, onClose, onPick, token, canRead, canWrite, mode }: Props) {
  const [lib, setLib] = useState<MediaFolder[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!token || !canRead) return;
    setErr('');
    try {
      const data = await adminFetch<MediaFolder[]>('/media/library', token);
      setLib(data);
    } catch {
      setLib([]);
      setErr('Media library laden mislukt.');
    }
  }, [token, canRead]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const ensureDefaults = async () => {
    if (!token || !canWrite) return;
    setBusy(true);
    try {
      await adminFetch('/media/folders/ensure-defaults', token, { method: 'POST' });
      await load();
    } catch {
      setErr('Mappen aanmaken mislukt.');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File | null) => {
    if (!file || !token || !canWrite) return;
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${getApiBase()}/media/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        setErr(await res.text());
        return;
      }
      const created = (await res.json()) as { storageKey?: string; webpKey?: string | null };
      const key = created.webpKey || created.storageKey;
      if (key) onPick(publicUrl(key));
      await load();
      onClose();
    } catch {
      setErr('Upload mislukt.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const filterAsset = (a: MediaAsset) => {
    if (mode === 'video') return isVideoAsset(a) || isImageAsset(a);
    return isImageAsset(a);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col border border-line bg-white text-sm shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <p className="font-medium text-ink">{mode === 'video' ? 'Video of afbeelding kiezen' : 'Afbeelding kiezen'}</p>
          <button type="button" className="text-muted hover:text-ink" onClick={onClose} aria-label="Sluiten">
            ✕
          </button>
        </div>

        {!canRead ? (
          <p className="p-4 text-xs text-muted">Je hebt geen rechten om de media library te bekijken (admin.media.read).</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 border-b border-line px-3 py-2">
              {canWrite ? (
                <>
                  <label className="cursor-pointer rounded border border-line bg-panel px-2 py-1 text-xs hover:bg-panel/80">
                    {busy ? 'Bezig…' : 'Upload bestand'}
                    <input
                      type="file"
                      className="hidden"
                      accept={mode === 'video' ? 'image/*,video/*' : 'image/*'}
                      disabled={busy}
                      onChange={(e) => void upload(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded border border-line px-2 py-1 text-xs hover:bg-panel"
                    onClick={() => void ensureDefaults()}
                    disabled={busy}
                  >
                    Standaardmappen
                  </button>
                </>
              ) : null}
            </div>
            {err ? <p className="px-3 py-2 text-xs text-red-700">{err}</p> : null}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {lib.map((folder) => {
                const assets = folder.assets.filter(filterAsset);
                if (!assets.length) return null;
                return (
                  <div key={folder.id} className="mb-4">
                    <p className="text-xs font-medium text-muted">
                      {folder.label} <span className="font-normal">({folder.slug})</span>
                    </p>
                    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {assets.map((a) => {
                        const previewKey = a.thumbKey || a.webpKey || a.storageKey;
                        const pickKey = a.webpKey || a.storageKey;
                        const url = publicUrl(pickKey);
                        const vid = isVideoAsset(a) && !isImageAsset(a);
                        return (
                          <li key={a.id}>
                            <button
                              type="button"
                              className="w-full border border-line bg-panel text-left text-[11px] hover:border-burgundy"
                              onClick={() => {
                                onPick(url);
                                onClose();
                              }}
                            >
                              {vid ? (
                                <div className="flex h-24 w-full items-center justify-center bg-ink/90 text-[10px] text-white">
                                  Video
                                </div>
                              ) : (
                                <img
                                  src={publicUrl(previewKey)}
                                  alt=""
                                  className="h-24 w-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <span className="line-clamp-2 block p-1 text-muted">{a.originalName}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              {lib.every((f) => !f.assets.some(filterAsset)) ? (
                <p className="text-xs text-muted">Geen geschikte bestanden. Upload hierboven of ga naar Media Library.</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
