'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type DeliveryRow = {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  openCount: number;
  lastOpenedAt: string | null;
  errorMessage: string | null;
  user: { firstName: string | null; lastName: string | null; email: string } | null;
};

type CampaignDetail = {
  id: string;
  channel: string;
  subject: string | null;
  bodyHtml: string | null;
  bodySms: string | null;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  status?: string;
  createdAt: string;
  list: { name: string } | null;
  stats: { sent: number; opened: number; total: number; planned?: number; done?: boolean };
  deliveries: DeliveryRow[];
  deliveriesPage: number;
  deliveriesTotal: number;
};

type Progress = {
  processed: number;
  planned: number;
  sentCount: number;
  failedCount: number;
  done: boolean;
  retryFailedRemaining?: number;
};

export default function CommunicatieGeschiedenisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, can } = useAuth();
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [retryProgress, setRetryProgress] = useState<Progress | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setErr(null);
    try {
      setData(
        await adminFetch<CampaignDetail>(
          `/admin/comms/campaigns/${id}?page=${page}&take=80`,
          token,
        ),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setData(null);
    }
  }, [token, id, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const failedTotal = data?.failedCount ?? 0;
  const planned = data?.stats.planned ?? data?.stats.total ?? 0;

  const retryFailed = async () => {
    if (!token || !id || !can('admin.push.send')) return;
    if (!window.confirm(`Opnieuw proberen voor ${failedTotal} mislukte ontvanger(s)?`)) return;
    setRetryBusy(true);
    setErr(null);
    setRetryProgress({ processed: 0, planned: failedTotal, sentCount: 0, failedCount: failedTotal, done: false });
    try {
      let safety = 0;
      while (safety < 500) {
        safety += 1;
        const p = await adminFetch<Progress>(`/admin/comms/campaigns/${id}/process-batch`, token, {
          method: 'POST',
          body: JSON.stringify({ retryFailed: true }),
        });
        setRetryProgress(p);
        if (p.done || (p.retryFailedRemaining ?? 0) === 0) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Opnieuw proberen mislukt');
    } finally {
      setRetryBusy(false);
    }
  };

  if (err && !data) return <p className="text-sm text-red-700">{err}</p>;
  if (!data) return <p className="text-sm text-muted">Laden…</p>;

  const totalPages = Math.max(1, Math.ceil(data.deliveriesTotal / 80));

  return (
    <div className="space-y-4">
      <Link href="/admin/communicatie/geschiedenis" className="text-xs text-burgundy underline">
        ← Terug
      </Link>
      {err ? <p className="text-sm text-amber-800">{err}</p> : null}
      <div className="rounded border border-line bg-white p-4 text-sm space-y-1">
        <p>
          <strong>{data.channel.toUpperCase()}</strong> · {new Date(data.createdAt).toLocaleString('nl-BE')}
        </p>
        {data.subject ? <p>Onderwerp: {data.subject}</p> : null}
        {data.list ? <p>Lijst: {data.list.name}</p> : null}
        <p>
          Verzonden: {data.sentCount} · Mislukt: {data.failedCount} · Geopend: {data.stats.opened} · Verwerkt:{' '}
          {data.stats.total}
          {planned ? ` · Gepland: ${planned}` : ''}
        </p>
        {data.channel === 'email' && failedTotal > 0 && can('admin.push.send') ? (
          <button
            type="button"
            disabled={retryBusy}
            onClick={() => void retryFailed()}
            className="mt-2 rounded bg-burgundy px-3 py-1.5 text-xs font-semibold text-white hover:bg-burgundyDeep disabled:opacity-50"
          >
            {retryBusy ? 'Bezig…' : `Mislukte opnieuw proberen (${failedTotal})`}
          </button>
        ) : null}
        {retryProgress && retryBusy ? (
          <div className="mt-3 space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-burgundy transition-all"
                style={{
                  width: `${retryProgress.planned ? Math.min(100, Math.round(((retryProgress.planned - (retryProgress.retryFailedRemaining ?? 0)) / retryProgress.planned) * 100)) : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted">
              Nog {retryProgress.retryFailedRemaining ?? 0} mislukt · {retryProgress.sentCount} verzonden
            </p>
          </div>
        ) : null}
        {data.channel === 'email' && data.bodyHtml ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-burgundy underline">Toon verzonden e-mailinhoud</summary>
            <div
              className="mt-2 max-h-64 overflow-y-auto rounded border border-line bg-zinc-50 p-3 text-xs prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: data.bodyHtml }}
            />
          </details>
        ) : null}
      </div>
      <div className="rounded border border-line bg-white overflow-x-auto">
        <p className="border-b border-line px-3 py-2 text-xs text-muted">
          Ontvangers (pagina {data.deliveriesPage} van {totalPages}, totaal {data.deliveriesTotal})
        </p>
        <table className="w-full text-xs min-w-[640px]">
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-2 text-left">Ontvanger</th>
              <th className="p-2 text-left">Contact</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Verzonden</th>
              <th className="p-2 text-left">Geopend</th>
              <th className="p-2 text-left">Fout</th>
            </tr>
          </thead>
          <tbody>
            {data.deliveries.map((d) => {
              const name =
                d.displayName ||
                [d.user?.firstName, d.user?.lastName].filter(Boolean).join(' ') ||
                '—';
              const contact = data.channel === 'email' ? d.email : d.phone;
              return (
                <tr key={d.id} className="border-t border-line">
                  <td className="p-2">{name}</td>
                  <td className="p-2 text-muted">{contact || '—'}</td>
                  <td className="p-2">{d.status}</td>
                  <td className="p-2 whitespace-nowrap">
                    {d.sentAt ? new Date(d.sentAt).toLocaleString('nl-BE') : '—'}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {d.openedAt ? new Date(d.openedAt).toLocaleString('nl-BE') : '—'}
                  </td>
                  <td className="p-2 max-w-[200px] truncate text-red-700" title={d.errorMessage || ''}>
                    {d.status === 'failed' ? d.errorMessage || '—' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalPages > 1 ? (
          <div className="flex gap-2 border-t border-line p-2">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded border border-line px-2 py-1 text-xs disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Vorige
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rounded border border-line px-2 py-1 text-xs disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Volgende
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
