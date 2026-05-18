'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, getApiBase, parseApiErrorBody } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

type ModelRow = {
  id: string;
  name: string;
  sortOrder: number;
  archived: boolean;
  downloadUnlocked: boolean;
  unlockedAt: string | null;
  _count: { photos: number; feedbacks: number };
};

type DocRow = {
  id: string;
  modelId: string;
  modelName: string;
  modelArchived: boolean;
  createdAt: string;
  ip: string | null;
  summary: string;
};

type ListFilter = 'all' | 'active' | 'archived';

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
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [mailTo, setMailTo] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const selectAllDocs = () => setSelectedDocIds(new Set(allDocs.map((d) => d.id)));
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
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Testshoot — backstage</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Upload backstage-foto’s per model-slot. Bezoekers zien ze op{' '}
          <code className="rounded bg-zinc-200 px-1">/portal/guest?p=testshoot</code>. Eerste download vraagt
          feedback; daarna mag de bezoeker opnieuw een zip-link aanvragen zolang er nog foto’s zijn. Na een
          geslaagde bezoeker-download worden de bestanden van de site gehaald — gebruik{' '}
          <strong>Zip downloaden (admin)</strong> vóór de bezoeker als je een kopie op kantoor wilt.
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
                    `Definitief ${ids.length} slot(s) verwijderen?\n\nAlle gekoppelde bestanden gaan uit de mediatheek.`,
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
                      void doAction(async () => {
                        const fd = new FormData();
                        for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
                        const res = await fetch(`${getApiBase()}/admin/testshoot/models/${selected.id}/photos`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                          body: fd,
                        });
                        const text = await res.text();
                        if (!res.ok) throw new Error(parseApiErrorBody(text));
                        e.target.value = '';
                      });
                    }}
                  />
                </div>
              )}

              {canWrite && !selected.archived && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className={btnOutline}
                    onClick={() => {
                      if (!confirm('Alle foto’s van dit slot verwijderen?')) return;
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
                      if (!confirm('Dit slot archiveren (foto’s + feedback wissen)?')) return;
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
                Download vrij: {selected.downloadUnlocked ? 'ja' : 'nee'}
                {selected.unlockedAt ? ` (${new Date(selected.unlockedAt).toLocaleString('nl-BE')})` : ''}
              </p>
              {canRead && selected._count.photos > 0 ? (
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
                        try {
                          const res = await fetch(`${getApiBase()}/admin/testshoot/models/${selected.id}/zip`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (!res.ok) {
                            const text = await res.text();
                            throw new Error(parseApiErrorBody(text));
                          }
                          const blob = await res.blob();
                          const a = document.createElement('a');
                          a.href = URL.createObjectURL(blob);
                          a.download = `${selected.name.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'testshoot'}-fotos.zip`;
                          a.click();
                          URL.revokeObjectURL(a.href);
                        } catch (e: unknown) {
                          setErr(formatClientError(e, 'Zip-download mislukt'));
                        } finally {
                          setBusy(false);
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
                    Dit slot is gearchiveerd. Definitief verwijderen haalt de rij weg (mediatheek al leeg na archiveren).
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    className={`mt-2 ${btnDangerSolid}`}
                    onClick={() => {
                      if (
                        !confirm(
                          `“${selected.name}” definitief verwijderen?\n\nDe rij verdwijnt uit deze lijst; resterende mediakoppelingen worden verwijderd.`,
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
          Map in mediatheek: <strong>Gratis fotoshoot → Documenten (testshoot-feedback)</strong>. Hieronder alle
          ingevulde formulieren; selecteer rijen voor A4-print of mail via de server (SMTP zoals agenda).
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
          <button type="button" disabled={busy || allDocs.length === 0} className={btnNeutral} onClick={selectAllDocs}>
            Alle documenten selecteren
          </button>
          <button type="button" disabled={busy} className={btnNeutral} onClick={clearDocSelection}>
            Document-selectie wissen
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-muted">
                {canWrite && (
                  <th className="w-10 p-2">
                    <span className="sr-only">Selectie</span>
                  </th>
                )}
                <th className="p-2">Datum</th>
                <th className="p-2">Model</th>
                <th className="p-2">Samenvatting</th>
                <th className="p-2">IP</th>
                {canWrite && <th className="p-2">Actie</th>}
              </tr>
            </thead>
            <tbody>
              {allDocs.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 6 : 4} className="p-4 text-muted">
                    Nog geen ingevulde documenten.
                  </td>
                </tr>
              )}
              {allDocs.map((d) => (
                <tr key={d.id} className="border-b border-zinc-100 hover:bg-zinc-50/60">
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
                    {d.modelArchived ? <span className="ml-1 text-xs text-muted">(gearchiveerd)</span> : null}
                  </td>
                  <td className="max-w-md p-2 text-xs">{d.summary}</td>
                  <td className="whitespace-nowrap p-2 text-xs text-muted">{d.ip ?? '—'}</td>
                  {canWrite && (
                    <td className="p-2">
                      <button
                        type="button"
                        className="text-xs font-semibold text-burgundy underline hover:text-burgundyDeep"
                        disabled={busy}
                        onClick={() => {
                          if (!confirm('Dit document verwijderen?')) return;
                          void doAction(async () => {
                            await apiFetch(`/admin/testshoot/feedbacks/${d.id}`, { method: 'DELETE', token });
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
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
