'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getApiBase } from '@/lib/api';
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

type FeedbackRow = {
  id: string;
  modelId: string;
  payload: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
};

export default function AdminTestshootPage() {
  const { token, can } = useAuth();
  const canRead = can('admin.testshoot.read');
  const canWrite = can('admin.testshoot.write');
  const [models, setModels] = useState<ModelRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadModels = useCallback(async () => {
    if (!token || !canRead) return;
    setErr(null);
    const rows = await apiFetch<ModelRow[]>('/admin/testshoot/models', { token });
    setModels(rows);
    setSelectedId((cur) => {
      if (cur && rows.some((r) => r.id === cur)) return cur;
      const first = rows.find((r) => !r.archived) ?? rows[0];
      return first?.id ?? null;
    });
  }, [token, canRead]);

  const loadFeedbacks = useCallback(
    async (modelId: string) => {
      if (!token || !canRead) return;
      const rows = await apiFetch<FeedbackRow[]>(`/admin/testshoot/models/${modelId}/feedbacks`, {
        token,
      });
      setFeedbacks(rows);
    },
    [token, canRead],
  );

  useEffect(() => {
    void loadModels().catch((e: Error) => setErr(e.message));
  }, [loadModels]);

  useEffect(() => {
    if (!selectedId || !canRead) {
      setFeedbacks([]);
      return;
    }
    const m = models.find((x) => x.id === selectedId);
    setNameDraft(m?.name ?? '');
    void loadFeedbacks(selectedId).catch(() => setFeedbacks([]));
  }, [selectedId, models, loadFeedbacks, canRead]);

  const selected = models.find((m) => m.id === selectedId) ?? null;

  const doAction = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await loadModels();
      if (selectedId) await loadFeedbacks(selectedId);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Actie mislukt');
    } finally {
      setBusy(false);
    }
  };

  if (!canRead) {
    return <p className="text-sm text-muted">Geen rechten (admin.testshoot.read).</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Testshoot</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Upload backstage-foto’s per model-slot. Bezoekers zien ze op{' '}
          <code className="rounded bg-zinc-200 px-1">/portal/guest?p=testshoot</code>. Eerste download vraagt
          feedback; daarna is direct download mogelijk (zoals op de oude site).
        </p>
      </div>

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {canWrite && (
          <button
            type="button"
            disabled={busy}
            className="rounded-md bg-burgundy px-3 py-2 text-sm font-medium text-white hover:bg-burgundyDeep disabled:opacity-50"
            onClick={() =>
              void doAction(async () => {
                await apiFetch('/admin/testshoot/models', { method: 'POST', token, body: JSON.stringify({}) });
              })
            }
          >
            Model toevoegen
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          onClick={() => void loadModels()}
        >
          Vernieuwen
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted">Modellen / slots</p>
          <ul className="mt-2 space-y-1">
            {models.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`flex w-full flex-col rounded px-2 py-2 text-left text-sm ${
                    m.id === selectedId ? 'bg-burgundy/10 text-ink' : 'hover:bg-zinc-50'
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
            <>
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
                      className="rounded bg-burgundy px-3 py-2 text-sm text-white hover:bg-burgundyDeep disabled:opacity-50"
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
                          if (!res.ok) throw new Error(await res.text());
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
                      className="rounded border border-red-300 bg-white px-3 py-2 text-sm text-red-800 hover:bg-red-50 disabled:opacity-50"
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
                      className="rounded border border-red-400 bg-red-700 px-3 py-2 text-sm text-white hover:bg-red-800 disabled:opacity-50"
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
              </div>

              <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-ink">Ingevulde feedback</h3>
                {feedbacks.length === 0 && <p className="mt-2 text-sm text-muted">Nog geen feedback.</p>}
                <ul className="mt-3 space-y-3">
                  {feedbacks.map((f) => (
                    <li key={f.id} className="rounded border border-zinc-100 bg-zinc-50/80 p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
                        <span>{new Date(f.createdAt).toLocaleString('nl-BE')}</span>
                        <span>{f.ip || '—'}</span>
                      </div>
                      <dl className="mt-2 grid gap-1 text-xs">
                        {Object.entries(f.payload).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <dt className="w-32 shrink-0 font-medium text-zinc-600">{k}</dt>
                            <dd className="min-w-0 break-words text-ink">{String(v)}</dd>
                          </div>
                        ))}
                      </dl>
                      {canWrite && (
                        <button
                          type="button"
                          className="mt-2 text-xs font-medium text-red-700 underline"
                          disabled={busy}
                          onClick={() => {
                            if (!confirm('Feedback verwijderen?')) return;
                            void doAction(async () => {
                              await apiFetch(`/admin/testshoot/feedbacks/${f.id}`, { method: 'DELETE', token });
                            });
                          }}
                        >
                          Verwijderen
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
