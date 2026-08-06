'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase } from '@/lib/api';
import { CmProgressOverlay } from '@/components/CmProgressOverlay';
import { downloadWithProgress, downloadProgressSublabel, type DownloadProgressUpdate } from '@/lib/download-with-progress';

type DeliveryRow = {
  bookingId: string;
  modelUserId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  shootDate: string;
  startAt: string;
  status: string;
  fileCount: number;
  available: boolean;
  downloadedAt: string | null;
  downloadedFileCount: number;
};

type ListResponse = { days: string[]; rows: DeliveryRow[] };

type Category = 'hub' | 'inschrijvingen' | 'klaar' | 'gedownload' | 'geen-upload' | 'mail';

const btnCat =
  'rounded-md border border-line bg-white px-4 py-3 text-left text-sm font-semibold text-ink shadow-sm hover:border-burgundy/40 hover:bg-burgundy/[0.04]';
const btnCatActive = 'border-burgundy bg-burgundy/[0.08] text-burgundy';
const btnPrimary =
  'rounded-md bg-burgundy px-3 py-1.5 text-xs font-semibold text-white hover:bg-burgundyDeep disabled:opacity-50';
const btnOutline =
  'rounded-md border border-burgundy/50 bg-white px-3 py-1.5 text-xs font-semibold text-burgundy hover:bg-burgundy/[0.06] disabled:opacity-50';
const btnDanger =
  'rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50';

function fmtDay(ymd: string) {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return ymd;
  return new Intl.DateTimeFormat('nl-BE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

function fmtDt(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('nl-BE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export default function AdminPortfolioLeveringPage() {
  const { token, can } = useAuth();
  const canRead = can('admin.media.read');
  const canWrite = can('admin.media.write');

  const [category, setCategory] = useState<Category>('hub');
  const [day, setDay] = useState<string>('');
  const [data, setData] = useState<ListResponse>({ days: [], rows: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mailSubject, setMailSubject] = useState('Uw portfolio-foto’s — Class-Models');
  const [mailBody, setMailBody] = useState(
    '<p>Beste {{naam}},</p><p>Uw portfolio-foto’s staan klaar in uw modellenfiche. Log in en download ze via de knop «Download portfolio».</p><p>Met vriendelijke groeten,<br/>Class-Models</p>',
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressUpdate | null>(null);

  const load = useCallback(async () => {
    if (!token || !canRead) return;
    setLoading(true);
    setErr('');
    try {
      const q = day ? `?day=${encodeURIComponent(day)}` : '';
      const r = await apiFetch<ListResponse>(`/admin/portfolio-delivery${q}`, { token });
      setData({ days: r.days ?? [], rows: Array.isArray(r.rows) ? r.rows : [] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setData({ days: [], rows: [] });
    } finally {
      setLoading(false);
    }
  }, [token, canRead, day]);

  useEffect(() => {
    void load();
  }, [load]);

  const rowsForCategory = useMemo(() => {
    const rows = data.rows;
    if (category === 'klaar') return rows.filter((r) => r.available);
    if (category === 'gedownload') return rows.filter((r) => !!r.downloadedAt && !r.available);
    if (category === 'geen-upload') return rows.filter((r) => !r.available && !r.downloadedAt);
    return rows;
  }, [data.rows, category]);

  const counts = useMemo(() => {
    const all = data.rows;
    return {
      all: all.length,
      klaar: all.filter((r) => r.available).length,
      gedownload: all.filter((r) => !!r.downloadedAt && !r.available).length,
      geen: all.filter((r) => !r.available && !r.downloadedAt).length,
    };
  }, [data.rows]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const ids = rowsForCategory.map((r) => r.modelUserId).filter(Boolean) as string[];
    setSelected((prev) => {
      const allOn = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const adminDownload = async (modelUserId: string, name: string) => {
    if (!token) return;
    setBusyId(modelUserId);
    setDownloadProgress({ percent: null, loaded: 0, total: null, indeterminate: true, phase: 'connecting' });
    try {
      await downloadWithProgress(`${getApiBase()}/admin/portfolio-delivery/${modelUserId}/zip`, {
        token,
        fallbackName: `${name} class-models.zip`,
        onProgress: setDownloadProgress,
      });
      setMsg('Admin-download klaar (modelknop blijft staan).');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Download mislukt');
    } finally {
      setBusyId(null);
      setDownloadProgress(null);
    }
  };

  const reactivate = async (modelUserId: string) => {
    if (!token || !canWrite) return;
    if (
      !window.confirm(
        'Downloadstatus wissen? Als er geen bestanden meer op de server staan, moet de fotograaf opnieuw uploaden voordat de knop terugkomt.',
      )
    )
      return;
    setBusyId(modelUserId);
    try {
      await apiFetch(`/admin/portfolio-delivery/${modelUserId}/reactivate`, { method: 'POST', token, body: '{}' });
      setMsg('Downloadstatus gewist.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Activeren mislukt');
    } finally {
      setBusyId(null);
    }
  };

  const hardDelete = async (modelUserId: string) => {
    if (!token || !canWrite) return;
    if (
      !window.confirm(
        'ZIP/foto’s definitief van de server verwijderen? Dit maakt geheugen vrij en kan niet ongedaan gemaakt worden.',
      )
    )
      return;
    setBusyId(modelUserId);
    try {
      await apiFetch(`/admin/portfolio-delivery/${modelUserId}`, { method: 'DELETE', token });
      setMsg('Bestanden verwijderd van server.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Verwijderen mislukt');
    } finally {
      setBusyId(null);
    }
  };

  const sendMail = async () => {
    if (!token || !canWrite) return;
    const ids = [...selected];
    if (!ids.length) {
      setErr('Vink minstens één model aan.');
      return;
    }
    setBusyId('mail');
    setErr('');
    try {
      const r = await apiFetch<{ sent: number; failed: string[]; total: number }>(
        '/admin/portfolio-delivery/bulk-mail',
        {
          method: 'POST',
          token,
          body: JSON.stringify({
            modelUserIds: ids,
            subject: mailSubject,
            bodyHtml: mailBody,
          }),
        },
      );
      setMsg(`Mail verzonden: ${r.sent}/${r.total}${r.failed?.length ? ` (mislukt: ${r.failed.join(', ')})` : ''}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Mailen mislukt');
    } finally {
      setBusyId(null);
    }
  };

  if (!canRead) {
    return <p className="text-sm text-muted">Geen toegang tot portfolio-levering.</p>;
  }

  const showTable = category !== 'hub' && category !== 'mail';

  return (
    <div className="space-y-5">
      {downloadProgress ? (
        <CmProgressOverlay
          label="Portfolio downloaden (admin)…"
          sublabel={`Dit kan even duren — ${downloadProgressSublabel(downloadProgress)}`}
          percent={downloadProgress.percent ?? undefined}
          indeterminate={downloadProgress.indeterminate}
        />
      ) : null}

      <div>
        <h1 className="text-lg font-bold text-ink">Portfolio-levering</h1>
        <p className="mt-1 text-sm text-muted">
          Inschrijvingen voor aanmaak portfolio, ZIP-uploads van de fotograaf, downloads door modellen, en bulk-mail per
          portfoliodag.
        </p>
      </div>

      {err ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</div> : null}
      {msg ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{msg}</div> : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['hub', 'Categorieën'],
            ['inschrijvingen', `Inschrijvingen (${counts.all})`],
            ['klaar', `Klaar voor download (${counts.klaar})`],
            ['gedownload', `Gedownload (${counts.gedownload})`],
            ['geen-upload', `Nog geen upload (${counts.geen})`],
            ['mail', 'Bulk-mail'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${btnCat} ${category === id ? btnCatActive : ''}`}
            onClick={() => setCategory(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {category === 'hub' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button type="button" className={btnCat} onClick={() => setCategory('inschrijvingen')}>
            <span className="block text-burgundy">Inschrijvingen</span>
            <span className="mt-1 block text-xs font-normal text-muted">
              Wie heeft een portfolio-dag geboekt, per datum.
            </span>
          </button>
          <button type="button" className={btnCat} onClick={() => setCategory('klaar')}>
            <span className="block text-burgundy">Klaar voor download</span>
            <span className="mt-1 block text-xs font-normal text-muted">
              ZIP/foto’s staan klaar — model ziet de downloadknop.
            </span>
          </button>
          <button type="button" className={btnCat} onClick={() => setCategory('gedownload')}>
            <span className="block text-burgundy">Gedownload</span>
            <span className="mt-1 block text-xs font-normal text-muted">
              Model heeft gedownload; bestanden zijn van de server.
            </span>
          </button>
          <button type="button" className={btnCat} onClick={() => setCategory('geen-upload')}>
            <span className="block text-burgundy">Nog geen upload</span>
            <span className="mt-1 block text-xs font-normal text-muted">
              Ingeschreven, maar fotograaf heeft nog niets geüpload.
            </span>
          </button>
          <button type="button" className={btnCat} onClick={() => setCategory('mail')}>
            <span className="block text-burgundy">Bulk-mail</span>
            <span className="mt-1 block text-xs font-normal text-muted">
              Mail naar aangevinkte modellen, filterbaar per portfoliodag.
            </span>
          </button>
        </div>
      ) : null}

      {(showTable || category === 'mail') && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-line bg-white p-3">
          <label className="text-xs">
            <span className="font-semibold text-ink">Portfoliodag</span>
            <select
              className="mt-1 block min-w-[12rem] rounded border border-line bg-white px-2 py-1.5 text-sm"
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setSelected(new Set());
              }}
            >
              <option value="">Alle dagen</option>
              {data.days.map((d) => (
                <option key={d} value={d}>
                  {fmtDay(d)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {data.days.slice(0, 12).map((d) => (
              <button
                key={d}
                type="button"
                className={`rounded border px-2 py-1 text-[11px] font-medium ${
                  day === d ? 'border-burgundy bg-burgundy text-white' : 'border-line bg-panel text-ink hover:bg-white'
                }`}
                onClick={() => {
                  setDay(d);
                  setSelected(new Set());
                }}
              >
                {fmtDay(d)}
              </button>
            ))}
            {day ? (
              <button
                type="button"
                className="rounded border border-line bg-white px-2 py-1 text-[11px] text-muted hover:bg-panel"
                onClick={() => setDay('')}
              >
                Wis filter
              </button>
            ) : null}
          </div>
          <button type="button" className={btnOutline} onClick={() => void load()} disabled={loading}>
            {loading ? 'Laden…' : 'Vernieuwen'}
          </button>
        </div>
      )}

      {category === 'mail' ? (
        <section className="space-y-3 rounded-md border border-line bg-white p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-burgundy">Bulk-mail</h2>
          <p className="text-xs text-muted">
            Selecteer modellen hieronder (of via een andere categorie + vinkjes), filter op dag hierboven. Placeholders:{' '}
            <code>{'{{naam}}'}</code>, <code>{'{{email}}'}</code>.
          </p>
          <label className="block text-xs">
            <span className="font-medium">Onderwerp</span>
            <input
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
              value={mailSubject}
              onChange={(e) => setMailSubject(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            <span className="font-medium">Bericht (HTML)</span>
            <textarea
              className="mt-1 min-h-[140px] w-full rounded border border-line px-2 py-1.5 font-mono text-[12px]"
              value={mailBody}
              onChange={(e) => setMailBody(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnPrimary} disabled={!canWrite || busyId === 'mail'} onClick={() => void sendMail()}>
              {busyId === 'mail' ? 'Bezig…' : `Verstuur naar ${selected.size} model(len)`}
            </button>
            <button type="button" className={btnOutline} onClick={toggleAllVisible}>
              Alles (zichtbaar) aan/uit
            </button>
          </div>
        </section>
      ) : null}

      {(showTable || category === 'mail') && (
        <div className="overflow-x-auto rounded-md border border-line bg-white">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-line bg-panel text-[10px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Alles"
                    onChange={toggleAllVisible}
                    checked={
                      rowsForCategory.filter((r) => r.modelUserId).length > 0 &&
                      rowsForCategory.every((r) => !r.modelUserId || selected.has(r.modelUserId))
                    }
                  />
                </th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Dag</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Bestanden</th>
                <th className="px-3 py-2">Gedownload</th>
                <th className="px-3 py-2">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-muted">
                    Laden…
                  </td>
                </tr>
              ) : !rowsForCategory.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-muted">
                    Geen rijen in deze categorie{day ? ` voor ${fmtDay(day)}` : ''}.
                  </td>
                </tr>
              ) : (
                rowsForCategory.map((r) => {
                  const id = r.modelUserId;
                  return (
                    <tr key={`${r.bookingId}-${id ?? 'x'}`} className="align-top">
                      <td className="px-3 py-2">
                        {id ? (
                          <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-ink">{r.name}</div>
                        <div className="text-muted">{r.email ?? '—'}</div>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{fmtDay(r.shootDate)}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2 tabular-nums">{r.fileCount}</td>
                      <td className="px-3 py-2">
                        {r.downloadedAt ? (
                          <span>
                            {fmtDt(r.downloadedAt)}
                            {r.downloadedFileCount ? ` (${r.downloadedFileCount})` : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {id && r.available ? (
                            <button
                              type="button"
                              className={btnOutline}
                              disabled={busyId === id}
                              onClick={() => void adminDownload(id, r.name)}
                            >
                              Admin-download
                            </button>
                          ) : null}
                          {id && canWrite && r.downloadedAt ? (
                            <button
                              type="button"
                              className={btnOutline}
                              disabled={busyId === id}
                              onClick={() => void reactivate(id)}
                            >
                              Status wissen
                            </button>
                          ) : null}
                          {id && canWrite && r.available ? (
                            <button
                              type="button"
                              className={btnDanger}
                              disabled={busyId === id}
                              onClick={() => void hardDelete(id)}
                            >
                              ZIP wissen
                            </button>
                          ) : null}
                          {!id ? <span className="text-muted">Geen account</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
