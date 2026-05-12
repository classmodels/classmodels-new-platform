'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { getApiBase } from '@/lib/api';

type MediaAssetRow = {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  webpKey?: string | null;
  thumbKey?: string | null;
  publicKey: string;
  detailKey: string;
};

type Folder = {
  id: string;
  slug: string;
  label: string;
  settings?: unknown;
  assets: MediaAssetRow[];
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function isVideo(m: string): boolean {
  return m.startsWith('video/');
}

function isImage(m: string): boolean {
  return m.startsWith('image/');
}

export default function AdminMediaPage() {
  const { token } = useAuth();
  const [lib, setLib] = useState<Folder[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [fileLabel, setFileLabel] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [detail, setDetail] = useState<{ folder: Folder; asset: MediaAssetRow } | null>(null);
  const [copied, setCopied] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteDaysAfterDl, setDeleteDaysAfterDl] = useState('');
  const [folderWebpOnly, setFolderWebpOnly] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLib(await adminFetch<Folder[]>('/media/library', token));
  }, [token]);

  useEffect(() => {
    load().catch(() => setLib([]));
  }, [load]);

  useEffect(() => {
    if (!selectedFolderId && lib.length > 0) {
      const models = lib.find((f) => f.slug === 'models');
      setSelectedFolderId(models?.id ?? lib[0].id);
    }
  }, [lib, selectedFolderId]);

  const filteredFolders = useMemo(() => {
    const q = folderSearch.trim().toLowerCase();
    const base = !q ? lib : lib.filter((f) => f.label.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q));
    const rest = base.filter((f) => f.slug !== 'verwijderde');
    const tr = base.find((f) => f.slug === 'verwijderde');
    return tr ? [...rest, tr] : rest;
  }, [lib, folderSearch]);

  const activeFolder = useMemo(
    () => lib.find((f) => f.id === selectedFolderId) ?? lib[0] ?? null,
    [lib, selectedFolderId],
  );

  const isTrashFolder = activeFolder?.slug === 'verwijderde';

  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedFolderId]);

  useEffect(() => {
    if (!activeFolder || activeFolder.slug === 'verwijderde') {
      setDeleteDaysAfterDl('');
      setFolderWebpOnly(false);
      setSettingsMsg('');
      return;
    }
    const s = (activeFolder.settings || {}) as {
      deleteDaysAfterModelDownload?: number;
      storeUploadsAsWebpOnly?: boolean;
    };
    setDeleteDaysAfterDl(
      typeof s.deleteDaysAfterModelDownload === 'number' && s.deleteDaysAfterModelDownload > 0
        ? String(s.deleteDaysAfterModelDownload)
        : '',
    );
    setFolderWebpOnly(Boolean(s.storeUploadsAsWebpOnly));
    setSettingsMsg('');
  }, [activeFolder?.id, activeFolder?.slug, activeFolder?.settings]);

  const filteredAssets = useMemo(() => {
    if (!activeFolder) return [];
    const q = assetSearch.trim().toLowerCase();
    if (!q) return activeFolder.assets;
    return activeFolder.assets.filter((a) => a.originalName.toLowerCase().includes(q));
  }, [activeFolder, assetSearch]);

  const ensure = async () => {
    if (!token) return;
    try {
      await adminFetch('/media/folders/ensure-defaults', token, { method: 'POST' });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Standaardmappen aanmaken mislukt. Controleer of je als admin bent ingelogd en de API draait.');
    }
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !file || !selectedFolderId) return;
    const fd = new FormData();
    fd.append('file', file);
    const params = new URLSearchParams();
    params.set('folderId', selectedFolderId);
    if (fileLabel.trim()) params.set('fileLabel', fileLabel.trim());
    const q = `?${params.toString()}`;
    const res = await fetch(`${getApiBase()}/media/upload${q}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) alert(await res.text());
    setFile(null);
    if (imgInputRef.current) imgInputRef.current.value = '';
    if (vidInputRef.current) vidInputRef.current.value = '';
    await load();
  };

  const pub = useCallback((key: string) => `${getApiBase()}/media/public/${encodeURIComponent(key)}`, []);

  const toggleAssetSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const hardRemoveAsset = async (id: string) => {
    if (!token) return;
    if (!confirm('Dit bestand permanent verwijderen?')) return;
    await adminFetch(`/media/assets/${id}?hard=1`, token, { method: 'DELETE' });
    setDetail(null);
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    await load();
  };

  const moveSelectionToTrash = async () => {
    if (!token) return;
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!confirm(`${ids.length} bestand(en) naar Verwijderde verplaatsen?`)) return;
    await adminFetch('/media/assets/move-trash', token, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    setSelectedIds(new Set());
    setBulkMode(false);
    setDetail(null);
    await load();
  };

  const hardRemoveSelection = async () => {
    if (!token) return;
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!confirm(`${ids.length} bestand(en) permanent wissen?`)) return;
    for (const id of ids) {
      try {
        await adminFetch(`/media/assets/${id}?hard=1`, token, { method: 'DELETE' });
      } catch {
        /* volgende */
      }
    }
    setSelectedIds(new Set());
    setBulkMode(false);
    setDetail(null);
    await load();
  };

  const emptyTrashFolder = async () => {
    if (!token) return;
    if (!confirm('Alle items in Verwijderde permanent wissen?')) return;
    await adminFetch('/media/trash/empty', token, { method: 'POST' });
    setSelectedIds(new Set());
    setDetail(null);
    await load();
  };

  const saveFolderSettings = async () => {
    if (!token || !activeFolder || activeFolder.slug === 'verwijderde') return;
    setSettingsMsg('');
    const raw = deleteDaysAfterDl.trim();
    const parsed = parseInt(raw, 10);
    const deleteDaysAfterModelDownload = raw === '' || !Number.isFinite(parsed) || parsed <= 0 ? 0 : Math.min(parsed, 365);
    await adminFetch(`/media/folders/${activeFolder.id}/settings`, token, {
      method: 'PATCH',
      body: JSON.stringify({
        deleteDaysAfterModelDownload,
        storeUploadsAsWebpOnly: folderWebpOnly,
      }),
    });
    await load();
    setSettingsMsg('Mapinstellingen opgeslagen.');
  };

  const reoptimizeFolder = async () => {
    if (!token || !activeFolder || activeFolder.slug === 'verwijderde') return;
    const res = await adminFetch<{ processed: number; scanned: number }>(
      `/media/folders/${activeFolder.id}/reoptimize-images?limit=50`,
      token,
      { method: 'POST' },
    );
    await load();
    setSettingsMsg(`WebP opnieuw gegenereerd: ${res.processed} / ${res.scanned}.`);
  };

  const convertPrimaryToJpegFolder = async () => {
    if (!token || !activeFolder || activeFolder.slug === 'verwijderde') return;
    if (
      !confirm(
        'Primair bestand per afbeelding omzetten naar compact JPEG (max. 50 in deze batch)? WebP + thumb worden opnieuw gemaakt. Oude zware formaten op schijf gaan weg waar van toepassing.',
      )
    )
      return;
    const res = await adminFetch<{ processed: number; scanned: number }>(
      `/media/folders/${activeFolder.id}/convert-primary-to-jpeg?limit=50`,
      token,
      { method: 'POST' },
    );
    await load();
    setSettingsMsg(`Primair → JPEG: ${res.processed} / ${res.scanned}.`);
  };

  const copyDetailUrl = async (key: string) => {
    const url = pub(key);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Kopieer deze URL:', url);
    }
  };

  const folderHint = useMemo(() => {
    const f = lib.find((x) => x.id === selectedFolderId);
    if (!f) return '';
    if (f.slug === 'models') return 'Weergavenaam: class-models-[naam]-bestand.ext';
    if (f.slug === 'testshoot')
      return 'Testshoot: map “alleen WebP” wordt hier genegeerd — zip gebruikt het primaire bestand. Bezoeker-zip wist daarna de foto’s; gebruik “Primair → JPEG” om schijf te verkleinen.';
    return `Prefix afgeleid van map “${f.slug}”.`;
  }, [lib, selectedFolderId]);

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-ink">Mediatheek</h1>
        <button
          type="button"
          onClick={ensure}
          className="rounded border border-line bg-white px-2.5 py-1 text-xs hover:bg-panel"
        >
          Standaardmappen
        </button>
      </div>

      <div className="flex min-h-[min(70vh,640px)] flex-1 gap-0 overflow-hidden rounded-md border border-line bg-white shadow-sm">
        {/* Linkerkolom: mappen */}
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-line bg-panel">
          <div className="border-b border-line px-2 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Mappen</p>
            <input
              type="search"
              placeholder="Zoek map…"
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              className="mt-1.5 w-full rounded border border-line bg-white px-2 py-1 text-xs text-ink placeholder:text-muted"
            />
          </div>
          <nav className="flex-1 overflow-y-auto p-1.5" aria-label="Mediamappen">
            <ul className="space-y-0.5">
              {filteredFolders.map((f) => {
                const selected = f.id === selectedFolderId;
                const count = f.assets.length;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFolderId(f.id);
                        setAssetSearch('');
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition ${
                        selected
                          ? 'bg-burgundy text-white shadow-sm'
                          : 'text-ink hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <span className="min-w-0 truncate font-medium">{f.label}</span>
                      <span
                        className={`shrink-0 tabular-nums ${
                          selected ? 'text-white/80' : 'text-muted'
                        } text-[10px]`}
                      >
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Rechterkolom: toolbar + compacte grid */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-line bg-white px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{activeFolder?.label ?? '—'}</p>
                <p className="text-[10px] text-muted">{activeFolder?.slug}</p>
              </div>
              <form onSubmit={upload} className="flex flex-wrap items-end gap-2">
                <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <input
                  ref={vidInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/mpeg,.mp4,.webm,.mov,.m4v"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => imgInputRef.current?.click()}
                  className="rounded border border-line bg-white px-2 py-1 text-[11px] text-ink hover:bg-panel"
                >
                  Foto kiezen
                </button>
                <button
                  type="button"
                  onClick={() => vidInputRef.current?.click()}
                  className="rounded border border-line bg-white px-2 py-1 text-[11px] text-ink hover:bg-panel"
                >
                  Video kiezen
                </button>
                <label className="hidden sm:flex flex-col gap-0">
                  <span className="text-[9px] text-muted">Naam (optioneel)</span>
                  <input
                    className="w-32 rounded border border-line px-1.5 py-1 font-mono text-[10px]"
                    placeholder="jan-peeters"
                    value={fileLabel}
                    onChange={(e) => setFileLabel(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={!file || !selectedFolderId || isTrashFolder}
                  className="rounded bg-burgundy px-2.5 py-1 text-[11px] font-medium text-white hover:bg-burgundyDeep disabled:opacity-40"
                >
                  Uploaden
                </button>
              </form>
            </div>
            {file ? (
              <p className="mt-1 truncate text-[10px] text-muted" title={file.name}>
                Geselecteerd: {file.name} ({formatBytes(file.size)})
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-muted">{folderHint}</p>
            )}
            {settingsMsg ? <p className="mt-1 text-[10px] text-burgundy">{settingsMsg}</p> : null}
            {!isTrashFolder && activeFolder ? (
              <div className="mt-2 rounded border border-dashed border-line bg-panel/60 px-2 py-2 text-[10px] text-ink">
                <p className="font-semibold text-ink">Mapinstellingen</p>
                <div className="mt-1.5 flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-0.5 text-muted">
                    Dagen na model-download (auto-wis)
                    <input
                      type="number"
                      min={0}
                      max={365}
                      placeholder="uit"
                      className="w-20 rounded border border-line bg-white px-1.5 py-1 text-ink"
                      value={deleteDaysAfterDl}
                      onChange={(e) => setDeleteDaysAfterDl(e.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-ink">
                    <input
                      type="checkbox"
                      checked={folderWebpOnly}
                      onChange={(e) => setFolderWebpOnly(e.target.checked)}
                    />
                    Nieuwe uploads alleen als WebP opslaan
                  </label>
                  <button
                    type="button"
                    onClick={() => void saveFolderSettings()}
                    className="rounded border border-burgundy bg-white px-2 py-1 text-[10px] font-medium text-burgundy hover:bg-panel"
                  >
                    Instellingen opslaan
                  </button>
                  <button
                    type="button"
                    onClick={() => void reoptimizeFolder()}
                    className="rounded border border-line bg-white px-2 py-1 text-[10px] text-ink hover:bg-panel"
                  >
                    Afbeeldingen opnieuw WebP
                  </button>
                  <button
                    type="button"
                    onClick={() => void convertPrimaryToJpegFolder()}
                    className="rounded border border-line bg-white px-2 py-1 text-[10px] text-ink hover:bg-panel"
                  >
                    Primair → JPEG (compact)
                  </button>
                </div>
                <p className="mt-1 text-[9px] text-muted">
                  Zet dagen bv. op 2: na bevestigde download in het modelportaal worden portfoliofoto&apos;s daarna
                  automatisch verwijderd (server ruimt bij volgende mediatheek-load op).{' '}
                  <strong>Primair → JPEG</strong> maakt het bronbestand kleiner op schijf (WebP op de site blijft
                  afgeleid).
                </p>
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="search"
                placeholder="Zoek in deze map…"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="max-w-xs flex-1 rounded border border-line bg-panel px-2 py-1 text-xs text-ink placeholder:text-muted"
              />
              <span className="text-[10px] text-muted">
                {filteredAssets.length} / {activeFolder?.assets.length ?? 0} getoond
              </span>
              <button
                type="button"
                onClick={() =>
                  setBulkMode((m) => {
                    if (m) setSelectedIds(new Set());
                    return !m;
                  })
                }
                className={`rounded border px-2 py-1 text-[10px] font-medium ${
                  bulkMode ? 'border-burgundy bg-burgundy text-white' : 'border-line bg-white text-ink hover:bg-panel'
                }`}
              >
                Bulk selecteren
              </button>
              {bulkMode && selectedIds.size > 0 ? (
                isTrashFolder ? (
                  <button
                    type="button"
                    onClick={() => void hardRemoveSelection()}
                    className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-800 hover:bg-red-100"
                  >
                    Selectie permanent wissen ({selectedIds.size})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void moveSelectionToTrash()}
                    className="rounded border border-burgundy bg-burgundy/10 px-2 py-1 text-[10px] font-medium text-burgundy hover:bg-burgundy/20"
                  >
                    Selectie naar Verwijderde ({selectedIds.size})
                  </button>
                )
              ) : null}
              {isTrashFolder ? (
                <button
                  type="button"
                  onClick={() => void emptyTrashFolder()}
                  className="rounded border border-red-400 px-2 py-1 text-[10px] text-red-800 hover:bg-red-50"
                >
                  Prullenbak legen
                </button>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-panel/50 p-2">
            {!activeFolder ? (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="max-w-md text-sm text-muted">
                  Er zijn nog geen mediamappen in de database. Dat is normaal op een nieuwe installatie of na een lege
                  database. Klik hieronder om alle standaardmappen aan te maken (Modellen, Verwijderde, Testshoot, …).
                </p>
                <button
                  type="button"
                  onClick={() => void ensure()}
                  className="rounded bg-burgundy px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-burgundyDeep"
                >
                  Standaardmappen aanmaken
                </button>
                <p className="text-[11px] text-muted">
                  Dezelfde actie staat ook rechtsboven bij de titel <strong className="text-ink">Mediatheek</strong>.
                </p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <p className="p-4 text-sm text-muted">Geen bestanden in deze map.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
                {filteredAssets.map((a) => {
                  const isImg = isImage(a.mimeType);
                  const isVid = isVideo(a.mimeType);
                  const thumbUrl = pub(a.publicKey);
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (bulkMode) toggleAssetSelect(a.id);
                          else setDetail({ folder: activeFolder, asset: a });
                        }}
                        className={`group relative flex w-full flex-col overflow-hidden rounded border bg-white text-left shadow-sm transition hover:border-burgundy hover:shadow ${
                          selectedIds.has(a.id) ? 'border-burgundy ring-1 ring-burgundy' : 'border-line'
                        }`}
                      >
                        {bulkMode ? (
                          <div
                            className={`pointer-events-none absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow ${
                              selectedIds.has(a.id)
                                ? 'border-burgundy bg-burgundy text-white opacity-100'
                                : 'border-line bg-white/95 text-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100'
                            }`}
                            aria-hidden
                          >
                            ✓
                          </div>
                        ) : null}
                        <div className="relative aspect-square w-full bg-zinc-100">
                          {isImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : isVid ? (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-zinc-900/90 p-1 text-white">
                              <span className="text-lg leading-none" aria-hidden>
                                ▶
                              </span>
                              <span className="max-w-full truncate px-0.5 text-center text-[8px] font-medium uppercase tracking-wide text-white/90">
                                Video
                              </span>
                            </div>
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 p-1 text-center text-[8px] text-muted">
                              <span className="text-[10px] font-semibold uppercase text-ink/70">Bestand</span>
                              <span className="line-clamp-2 break-all">{a.mimeType.split('/')[1] ?? 'bin'}</span>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-line px-1 py-0.5">
                          <span className="line-clamp-2 text-[9px] leading-tight text-muted group-hover:text-ink" title={a.originalName}>
                            {a.originalName}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-detail-title"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-line bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="md:w-1/2">
                {isImage(detail.asset.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pub(detail.asset.detailKey)}
                    alt={detail.asset.originalName}
                    className="max-h-[55vh] w-full rounded border border-line object-contain"
                  />
                ) : isVideo(detail.asset.mimeType) ? (
                  <video
                    src={pub(detail.asset.detailKey)}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-[55vh] w-full rounded border border-line bg-black"
                  />
                ) : (
                  <p className="text-sm text-muted">Voorbeeld niet beschikbaar. Open de URL in een nieuw tabblad.</p>
                )}
              </div>
              <div className="flex-1 space-y-3 text-sm">
                <h3 id="media-detail-title" className="text-lg font-semibold text-ink">
                  {detail.asset.originalName}
                </h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted">Map</dt>
                  <dd>{detail.folder.label}</dd>
                  <dt className="text-muted">Type</dt>
                  <dd>{detail.asset.mimeType}</dd>
                  <dt className="text-muted">Grootte</dt>
                  <dd>{formatBytes(detail.asset.sizeBytes)}</dd>
                  {detail.asset.width && detail.asset.height ? (
                    <>
                      <dt className="text-muted">Afmetingen</dt>
                      <dd>
                        {detail.asset.width} × {detail.asset.height} px
                      </dd>
                    </>
                  ) : null}
                  <dt className="text-muted">Id</dt>
                  <dd className="font-mono text-[11px]">{detail.asset.id}</dd>
                </dl>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-ink">Publieke URL</p>
                  <code className="block break-all rounded border border-line bg-panel p-2 text-[11px] text-muted">
                    {pub(detail.asset.detailKey)}
                  </code>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded bg-burgundy px-3 py-1.5 text-xs text-white hover:bg-burgundyDeep"
                      onClick={() => copyDetailUrl(detail.asset.detailKey)}
                    >
                      {copied ? 'Gekopieerd' : 'URL kopiëren'}
                    </button>
                    <a
                      href={pub(detail.asset.detailKey)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-burgundy px-3 py-1.5 text-xs text-burgundy hover:bg-panel"
                    >
                      Openen in nieuw tabblad
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  {detail.folder.slug !== 'verwijderde' ? (
                    <button
                      type="button"
                      className="text-xs text-burgundy hover:underline"
                      onClick={async () => {
                        if (!token) return;
                        await adminFetch('/media/assets/move-trash', token, {
                          method: 'POST',
                          body: JSON.stringify({ ids: [detail.asset.id] }),
                        });
                        setDetail(null);
                        await load();
                      }}
                    >
                      Naar Verwijderde
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs text-red-700 hover:underline"
                    onClick={() => void hardRemoveAsset(detail.asset.id)}
                  >
                    Permanent verwijderen
                  </button>
                  <button type="button" className="ml-auto text-xs text-muted hover:text-ink" onClick={() => setDetail(null)}>
                    Sluiten
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
