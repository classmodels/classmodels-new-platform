'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, getApiBase, parseApiErrorBody } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { CmProgressOverlay } from '@/components/CmProgressOverlay';
import { uploadWithProgress, formatEtaSeconds } from '@/lib/upload-with-progress';
import { downloadWithProgress, downloadProgressSublabel, type DownloadProgressUpdate } from '@/lib/download-with-progress';

type ModelRow = {
  id: string;
  name: string;
  sortOrder: number;
  archived: boolean;
  downloadUnlocked: boolean;
  unlockedAt: string | null;
  hiddenPhotoCount: number;
  _count: { photos: number; feedbacks: number };
};

type DocRow = {
  id: string;
  modelId: string | null;
  modelName: string;
  modelArchived: boolean;
  modelMissing?: boolean;
  createdAt: string;
  ip: string | null;
  archived: boolean;
  summary: string;
  rows: { label: string; value: string }[];
};

type ListFilter = 'all' | 'active' | 'archived';
type DocFilter = 'active' | 'archived' | 'all';

const btnPrimary = 'rounded-md bg-burgundy px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-burgundyDeep disabled:opacity-50';
const btnOutline = 'rounded-md border-2 border-burgundy bg-white px-3 py-2 text-sm font-semibold text-burgundy hover:bg-burgundy/[0.06] disabled:opacity-50';
const btnNeutral = 'rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-ink hover:bg-zinc-50 disabled:opacity-50';
const btnDangerSolid = 'rounded-md bg-burgundy px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-burgundyDeep disabled:opacity-50';

function formatClientError(e: unknown, fallback: string): string {
  if (!(e instanceof Error)) return fallback;
  const raw = (e.message ?? '').trim();
  if (raw.startsWith('{')) return parseApiErrorBody(raw);
  return raw || fallback;
}

export default function AdminTestshootPage() {
  const { token, can } = useAuth();
  const canRead = can('admin.testshoot.read');
  const canWrite = can('admin.testshoot.write');
  const [models, setModels] = useState<ModelRow[]>([]);
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [allDocs, setAllDocs] = useState<DocRow[]>([]);
  const [docFilter, setDocFilter] = useState<DocFilter>('active');
  const [viewDoc, setViewDoc] = useState<DocRow | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [mailTo, setMailTo] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; sublabel: string } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressUpdate | null>(null);

  const loadModels = useCallback(
    async (preferSelectId?: string | null) => {
      if (!token || !canRead) return;
      setErr(null);
      const rows = await apiFetch<ModelRow[]>('/admin/testshoot/models', { token });
      setModels(rows);
      setSelectedId((cur) => {
        if (preferSelectId && rows.some((r) => r.id === preferSelectId)) return preferSelectId;
        if (cur && rows.some((r) => r.id === cur)) return cur;
        const first = rows.find((r) => !r.archived) ?? rows[0];
        return first?.id ?? null;
      });
    },
    [token, canRead],
  );

  const loadAllDocs = useCallback(async () => {
    if (!token || !canRead) return;
    const rows = await apiFetch<DocRow[]>('/admin/testshoot/feedbacks', { token });
    setAllDocs(rows);
  }, [token, canRead]);

  useEffect(() => {
    void Promise.all([loadModels(), loadAllDocs()]).catch((e: unknown) => setErr(formatClientError(e, 'Laden mislukt')));
  }, [loadModels, loadAllDocs]);

  useEffect(() => {
    if (!selectedId || !canRead) return;
    const m = models.find((x) => x.id === selectedId);
    setNameDraft(m?.name ?? '');
  }, [selectedId, models, canRead]);

  const selected = models.find((m) => m.id === selectedId) ?? null;

  const filteredModels = useMemo(() => {
    if (listFilter === 'active') return models.filter((m) => !m.archived);
    if (listFilter === 'archived') return models.filter((m) => m.archived);
    return models;
  }, [models, listFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredModels.map((m) => m.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleDocSelect = (id: string) => {
    setSelectedDocIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const filteredDocs = useMemo(() => {
    if (docFilter === 'active') return allDocs.filter((d) => !d.archived);
    if (docFilter === 'archived') return allDocs.filter((d) => d.archived);
    return allDocs;
  }, [allDocs, docFilter]);

  const selectAllDocs = () => setSelectedDocIds(new Set(filteredDocs.map((d) => d.id)));
  const clearDocSelection = () => setSelectedDocIds(new Set());

  const doAction = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await loadModels();
      await loadAllDocs();
    } catch (e: unknown) {
      setErr(formatClientError(e, 'Actie mislukt'));
    } finally {
      setBusy(false);
    }
  };

  const addModel = () => {
    if (!token) return;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        const created = await apiFetch<{ id: string }>('/admin/testshoot/models', {
          method: 'POST',
          token,
          body: JSON.stringify({}),
        });
        await loadModels(created.id);
        await loadAllDocs();
      } catch (e: unknown) {
        setErr(formatClientError(e, 'Model toevoegen mislukt'));
      } finally {
        setBusy(false);
      }
    })();
  };

  const bulkPrintDocs = () => {
    const ids = [...selectedDocIds];
    if (!ids.length) {
      alert('Selecteer minstens één document.');
      return;
    }
    if (!token) return;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        const { html } = await apiFetch<{ html: string }>('/admin/testshoot/feedbacks/print-html', {
          method: 'POST',
          token,
          body: JSON.stringify({ ids }),
        });
        const w = window.open('', '_blank', 'width=900,height=1200');
        if (!w) {
          alert('Pop-up geblokkeerd — sta afdrukvenster toe.');
          return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
        setTimeout(() => {
          w.focus();
          w.print();
        }, 350);
      } catch (e: unknown) {
        setErr(formatClientError(e, 'Afdrukken mislukt'));
      } finally {
        setBusy(false);
      }
    })();
  };

  const bulkMailDocs = () => {
    const ids = [...selectedDocIds];
    if (!ids.length) {
      alert('Selecteer minstens één document.');
      return;
    }
    const to = mailTo.trim();
    if (!to) {
      alert('Vul het e-mailadres van de ontvanger in (wordt via de server verstuurd, niet via uw eigen programma).');
      return;
    }
    if (!token) return;
    void doAction(async () => {
      await apiFetch('/admin/testshoot/feedbacks/bulk-mail', {
        method: 'POST',
        token,
        body: JSON.stringify({ ids, to }),
      });
    });
  };

  if (!canRead) {
    return <p className="text-sm text-muted">Geen rechten (admin.testshoot.read).</p>;
  }

  return (
    <div className="space-y-6">
      {uploadProgress ? (
        <CmProgressOverlay
          label="Foto’s uploaden…"
          sublabel={uploadProgress.sublabel}
          percent={uploadProgress.percent}
        />
      ) : null}
      {downloadProgress ? (
        <CmProgressOverlay
          label="Zip downloaden…"
          sublabel={`Dit kan even duren — ${downloadProgressSublabel(downloadProgress)}`}
          percent={downloadProgress.percent ?? undefined}
          indeterminate={downloadProgress.indeterminate}
        />
      ) : null}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Testshoot — backstage</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Upload backstage-foto’s per model-slot. Bezoekers zien ze op{' '}
          <a href="/gasten/testshoot" className="text-zinc-900 underline hover:text-zinc-700">
            /gasten/testshoot
          </a>
          . Eerste download vraagt feedback. Na een geslaagde download door het model gaan de
          foto’s <strong>offline</strong> (weg van de site, niet van de server). Met{' '}
          <strong>Weer online zetten</strong> zet je ze terug op de site. Pas bij{' '}
          <strong>definitief verwijderen</strong> verdwijnen ze echt van de server.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Ingevulde feedback staat onder{' '}
          <strong>Documenten → gratis fotoshoot</strong> (zelfde logische map als in de mediatheek: map{' '}
          <code className="rounded bg-zinc-200 px-1">gratis-fotoshoot-documenten</code>). Mail verloopt via de{' '}
          <strong>server</strong> (SMTP in API-.env), niet via uw desktop-mail.
        </p>
      </div>

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {canWrite && (
          <button type="button" disabled={busy} className={btnPrimary} onClick={addModel}>
            Model toevoegen
          </button>
        )}
        <button type="button" disabled={busy} className={btnNeutral} onClick={() => void loadModels()}>
          Vernieuwen
        </button>
        {canWrite && (
          <>
            <button
              type="button"
              disabled={busy || selectedIds.size === 0}
              className={btnDangerSolid}
              onClick={() => {
                const ids = [...selectedIds];
                if (
                  !confirm(
                    `Definitief ${ids.length} slot(s) verwijderen?\n\nFoto’s/bestanden weg. Feedbackdocumenten blijven bewaard.`,
                  )
                )
                  return;
                void doAction(async () => {
                  await apiFetch('/admin/testshoot/models/bulk-permanent-delete', {
                    method: 'POST',
                    token,
                    body: JSON.stringify({ ids }),
                  });
                  clearSelection();
                  setSelectedId(null);
                });
              }}
            >
              Definitief verwijderen ({selectedIds.size})
            </button>
            <button
              type="button"
              disabled={busy || filteredModels.length === 0}
              className={btnNeutral}
              onClick={selectAllVisible}
            >
              Selecteer zichtbare slots
            </button>
            <button
              type="button"
              disabled={busy || selectedIds.size === 0}
              className={btnNeutral}
              onClick={clearSelection}
            >
              Slot-selectie wissen
            </button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Slots:</span>
        {(['all', 'active', 'archived'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setListFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              listFilter === f ? 'bg-burgundy text-white' : btnNeutral
            }`}
          >
            {f === 'all' ? 'Alles' : f === 'active' ? 'Alleen actief' : 'Alleen gearchiveerd'}
          </button>
        ))}
        <span className="text-xs text-muted">
          ({filteredModels.length} zichtbaar · {models.filter((m) => m.archived).length} gearchiveerd)
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted">Modellen / slots</p>
          <ul className="mt-2 space-y-1">
            {filteredModels.map((m) => (
              <li key={m.id} className="flex items-stretch gap-1 rounded hover:bg-zinc-50/80">
                {canWrite && (
                  <label className="flex shrink-0 cursor-pointer items-center px-1">
                    <input
                      type="checkbox"
                      className="accent-burgundy"
                      checked={selectedIds.has(m.id)}
                      onChange={() => toggleSelect(m.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Selecteer slot ${m.name}`}
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`min-w-0 flex flex-1 flex-col rounded px-2 py-2 text-left text-sm ${
                    m.id === selectedId ? 'bg-burgundy/10 text-ink' : ''
                  }`}
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-muted">
                    {m._count.photos} foto’s · {m._count.feedbacks} feedback
                    {m.archived ? ' · gearchiveerd' : ''}
                  </span>
                  {m.hiddenPhotoCount > 0 ? (
                    <span className="mt-0.5 inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {m.hiddenPhotoCount} foto’s offline
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 space-y-4">
          {!selected && <p className="text-sm text-muted">Geen model geselecteerd.</p>}
          {selected && (
            <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-ink">{selected.archived ? '(Gearchiveerd) ' : ''}{selected.name}</h2>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="block min-w-[200px] flex-1 text-xs font-medium text-muted">
                  Weergavenaam
                  <input
                    className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    disabled={!canWrite || busy || selected.archived}
                  />
                </label>
                {canWrite && !selected.archived && (
                  <button
                    type="button"
                    disabled={busy}
                    className={btnPrimary}
                    onClick={() =>
                      void doAction(async () => {
                        await apiFetch(`/admin/testshoot/models/${selected.id}`, {
                          method: 'PATCH',
                          token,
                          body: JSON.stringify({ name: nameDraft }),
                        });
                      })
                    }
                  >
                    Naam opslaan
                  </button>
                )}
              </div>

              {canWrite && !selected.archived && (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <p className="text-xs font-semibold text-muted">Foto’s uploaden (meerdere ok)</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="mt-2 block w-full text-sm"
                    disabled={busy}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files?.length || !token) return;
                      const count = files.length;
                      void doAction(async () => {
                        const fd = new FormData();
                        for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
                        setUploadProgress({ percent: 0, sublabel: 'Dit kan even duren — laat dit venster open.' });
                        try {
                          await uploadWithProgress(`${getApiBase()}/admin/testshoot/models/${selected.id}/photos`, {
                            headers: { Authorization: `Bearer ${token}` },
                            body: fd,
                            onProgress: (p) => {
                              setUploadProgress({
                                percent: p.percent,
                                sublabel: `Dit kan even duren — ${count} foto${count !== 1 ? '’s' : ''}, nog ${formatEtaSeconds(p.etaSeconds)}.`,
                              });
                            },
                            onUploadBytesComplete: () => {
                              setUploadProgress({
                                percent: 100,
                                sublabel: 'Bestanden ontvangen — de server verwerkt de foto’s nog. Dit kan even duren.',
                              });
                            },
                          });
                        } finally {
                          setUploadProgress(null);
                        }
                        e.target.value = '';
                      });
                    }}
                  />
                </div>
              )}

              {selected.hiddenPhotoCount > 0 && !selected.archived ? (
                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">
                    OFFLINE — {selected.hiddenPhotoCount} foto’s
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Foto’s staan niet op de site, wel op de server. Feedback blijft altijd bewaard.
                  </p>
                  {canWrite ? (
                    <button
                      type="button"
                      disabled={busy}
                      className={`mt-2 ${btnPrimary}`}
                      onClick={() =>
                        void doAction(async () => {
                          await apiFetch(`/admin/testshoot/models/${selected.id}/restore-public`, {
                            method: 'POST',
                            token,
                          });
                        })
                      }
                    >
                      Weer online zetten
                    </button>
                  ) : null}
                </div>
              ) : null}

              {canWrite && !selected.archived && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected._count.photos > 0 ? (
                    <button
                      type="button"
                      disabled={busy}
                      className={btnOutline}
                      onClick={() => {
                        if (!confirm('Foto’s offline zetten (van de site, niet van de server)?')) return;
                        void doAction(async () => {
                          await apiFetch(`/admin/testshoot/models/${selected.id}/set-offline`, {
                            method: 'POST',
                            token,
                          });
                        });
                      }}
                    >
                      Offline zetten
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    className={btnOutline}
                    onClick={() => {
                      if (
                        !confirm(
                          'Alle foto’s van dit slot definitief van de server verwijderen?\n\nFeedbackdocumenten blijven bewaard.',
                        )
                      )
                        return;
                      void doAction(async () => {
                        await apiFetch(`/admin/testshoot/models/${selected.id}/photos`, {
                          method: 'DELETE',
                          token,
                        });
                      });
                    }}
                  >
                    Verwijder alle foto’s
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={btnDangerSolid}
                    onClick={() => {
                      if (
                        !confirm(
                          'Dit slot archiveren?\n\nFoto’s worden gewist. Feedbackdocumenten blijven bewaard.',
                        )
                      )
                        return;
                      void doAction(async () => {
                        await apiFetch(`/admin/testshoot/models/${selected.id}`, {
                          method: 'DELETE',
                          token,
                        });
                        setSelectedId(null);
                      });
                    }}
                  >
                    Slot archiveren
                  </button>
                </div>
              )}

              <p className="mt-3 text-xs text-muted">
                Publiek zichtbaar (online): {selected._count.photos} foto’s
                {selected.hiddenPhotoCount
                  ? ` · offline (op server bewaard): ${selected.hiddenPhotoCount}`
                  : ''}
                <br />
                Download vrij: {selected.downloadUnlocked ? 'ja' : 'nee'}
                {selected.unlockedAt ? ` (${new Date(selected.unlockedAt).toLocaleString('nl-BE')})` : ''}
              </p>
              {canRead && selected._count.photos + selected.hiddenPhotoCount > 0 ? (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={busy}
                    className={btnNeutral}
                    onClick={() => {
                      if (!token) return;
                      void (async () => {
                        setBusy(true);
                        setErr(null);
                        setDownloadProgress({
                          percent: null,
                          loaded: 0,
                          total: null,
                          indeterminate: true,
                          phase: 'connecting',
                        });
                        try {
                          await downloadWithProgress(
                            `${getApiBase()}/admin/testshoot/models/${selected.id}/zip`,
                            {
                              token,
                              fallbackName: `${selected.name.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'testshoot'}-fotos.zip`,
                              onProgress: setDownloadProgress,
                            },
                          );
                        } catch (e: unknown) {
                          setErr(formatClientError(e, 'Zip-download mislukt'));
                        } finally {
                          setBusy(false);
                          setDownloadProgress(null);
                        }
                      })();
                    }}
                  >
                    Zip downloaden (admin — wist niets op de server)
                  </button>
                </div>
              ) : null}

              {canWrite && selected.archived && (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <p className="text-xs text-muted">
                    Dit slot is gearchiveerd. Definitief verwijderen haalt de rij weg; foto’s verdwijnen
                    van de server. Feedbackdocumenten blijven bewaard.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    className={`mt-2 ${btnDangerSolid}`}
                    onClick={() => {
                      if (
                        !confirm(
                          `“${selected.name}” definitief verwijderen?\n\nFoto’s/bestanden weg. Feedbackdocumenten blijven bewaard.`,
                        )
                      )
                        return;
                      void doAction(async () => {
                        await apiFetch(`/admin/testshoot/models/${selected.id}/permanent`, {
                          method: 'DELETE',
                          token,
                        });
                        setSelectedId(null);
                        setSelectedIds((prev) => {
                          const n = new Set(prev);
                          n.delete(selected.id);
                          return n;
                        });
                      });
                    }}
                  >
                    Definitief verwijderen (dit slot)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="font-serif text-lg font-semibold text-ink">Documenten — gratis fotoshoot / testshoot</h2>
        <p className="mt-1 text-xs text-muted">
          Ingevulde formulieren blijven altijd bewaard, ook als foto’s of het slot weg zijn. Afdrukken
          en mailen zetten elk document op een aparte A4, in de volgorde van het formulier.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 text-xs font-medium text-muted">
            Verzend naar (e-mail)
            <input
              type="email"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
              placeholder="kantoor@…"
              value={mailTo}
              onChange={(e) => setMailTo(e.target.value)}
              disabled={!canWrite || busy}
            />
          </label>
          <button type="button" disabled={busy || selectedDocIds.size === 0} className={btnPrimary} onClick={bulkPrintDocs}>
            Afdrukken (selectie, A4)
          </button>
          {canWrite && (
            <button
              type="button"
              disabled={busy || selectedDocIds.size === 0}
              className={btnPrimary}
              onClick={bulkMailDocs}
            >
              Mailen (selectie)
            </button>
          )}
          <button type="button" disabled={busy || filteredDocs.length === 0} className={btnNeutral} onClick={selectAllDocs}>
            Alle documenten selecteren
          </button>
          <button type="button" disabled={busy} className={btnNeutral} onClick={clearDocSelection}>
            Document-selectie wissen
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Documenten:</span>
          {(['active', 'archived', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setDocFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                docFilter === f ? 'bg-burgundy text-white' : btnNeutral
              }`}
            >
              {f === 'active' ? 'Actief' : f === 'archived' ? 'Gearchiveerd' : 'Alles'}
            </button>
          ))}
          <span className="text-xs text-muted">
            ({filteredDocs.length} zichtbaar · {allDocs.filter((d) => d.archived).length} gearchiveerd)
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-muted">
                {canWrite && (
                  <th className="w-10 p-2">
                    <span className="sr-only">Selectie</span>
                  </th>
                )}
                <th className="p-2">Datum</th>
                <th className="p-2">Model</th>
                <th className="p-2">Ingevuld door</th>
                <th className="p-2">IP</th>
                <th className="p-2">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 6 : 5} className="p-4 text-muted">
                    {docFilter === 'archived' ? 'Geen gearchiveerde documenten.' : 'Nog geen ingevulde documenten.'}
                  </td>
                </tr>
              )}
              {filteredDocs.map((d) => (
                <tr
                  key={d.id}
                  className={`border-b border-zinc-100 hover:bg-zinc-50/60 ${d.archived ? 'opacity-70' : ''}`}
                >
                  {canWrite && (
                    <td className="p-2">
                      <input
                        type="checkbox"
                        className="accent-burgundy"
                        checked={selectedDocIds.has(d.id)}
                        onChange={() => toggleDocSelect(d.id)}
                        aria-label={`Selecteer document ${d.summary}`}
                      />
                    </td>
                  )}
                  <td className="whitespace-nowrap p-2 text-xs text-muted">
                    {new Date(d.createdAt).toLocaleString('nl-BE')}
                  </td>
                  <td className="p-2">
                    {d.modelName}
                    {d.modelArchived ? <span className="ml-1 text-xs text-muted">(slot gearchiveerd)</span> : null}
                    {d.modelMissing ? <span className="ml-1 text-xs text-muted">(slot weg)</span> : null}
                  </td>
                  <td className="max-w-md p-2 text-xs">
                    {d.summary}
                    {d.archived ? (
                      <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                        Gearchiveerd
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap p-2 text-xs text-muted">{d.ip ?? '—'}</td>
                  <td className="whitespace-nowrap p-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="text-xs font-semibold text-zinc-700 underline hover:text-zinc-900"
                        onClick={() => setViewDoc(d)}
                      >
                        Bekijken
                      </button>
                      {canWrite && (
                        <>
                          <button
                            type="button"
                            className="text-xs font-semibold text-zinc-700 underline hover:text-zinc-900"
                            disabled={busy}
                            onClick={() =>
                              void doAction(async () => {
                                await apiFetch(`/admin/testshoot/feedbacks/${d.id}/archive`, {
                                  method: 'PATCH',
                                  token,
                                  body: JSON.stringify({ archived: !d.archived }),
                                });
                              })
                            }
                          >
                            {d.archived ? 'Herstellen' : 'Archiveren'}
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-burgundy underline hover:text-burgundyDeep"
                            disabled={busy}
                            onClick={() => {
                              if (!confirm('Dit document definitief verwijderen?')) return;
                              void doAction(async () => {
                                await apiFetch(`/admin/testshoot/feedbacks/${d.id}`, {
                                  method: 'DELETE',
                                  token,
                                });
                                setSelectedDocIds((prev) => {
                                  const n = new Set(prev);
                                  n.delete(d.id);
                                  return n;
                                });
                              });
                            }}
                          >
                            Verwijderen
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewDoc ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Feedbackdocument bekijken"
          onClick={() => setViewDoc(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4">
              <div>
                <h3 className="font-serif text-lg font-semibold text-ink">
                  Feedback — {viewDoc.summary}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  Model: {viewDoc.modelName} · {new Date(viewDoc.createdAt).toLocaleString('nl-BE')}
                  {viewDoc.ip ? ` · IP: ${viewDoc.ip}` : ''}
                  {viewDoc.archived ? ' · gearchiveerd' : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label="Sluiten"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-lg leading-none text-zinc-600 hover:bg-zinc-100"
                onClick={() => setViewDoc(null)}
              >
                ×
              </button>
            </div>
            <div className="px-5 py-4">
              {viewDoc.rows.length > 0 ? (
                <dl className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
                  {viewDoc.rows.map((r) => (
                    <div key={r.label} className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 px-3 py-2 text-sm">
                      <dt className="text-xs font-medium text-muted">{r.label}</dt>
                      <dd className="m-0 break-words text-ink">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted">Geen antwoorden gevonden.</p>
              )}
            </div>
            <div className="flex justify-end border-t border-zinc-200 px-5 py-3">
              <button type="button" className={btnNeutral} onClick={() => setViewDoc(null)}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
