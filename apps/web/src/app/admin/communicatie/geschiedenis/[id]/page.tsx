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
  targetCount?: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  list: { name: string } | null;
  stats: { sent: number; opened: number; total: number; planned?: number };
  deliveries: DeliveryRow[];
};

export default function CommunicatieGeschiedenisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, can } = useAuth();
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setData(await adminFetch<CampaignDetail>(`/admin/comms/campaigns/${id}`, token));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const failedCount = data?.deliveries.filter((d) => d.status === 'failed').length ?? 0;

  const retryFailed = async () => {
    if (!token || !id || !can('admin.push.send')) return;
    if (!window.confirm(`Opnieuw proberen voor ${failedCount} mislukte ontvanger(s)?`)) return;
    setRetryBusy(true);
    setRetryMsg(null);
    setErr(null);
    try {
      const r = await adminFetch<{ message?: string }>(`/admin/comms/campaigns/${id}/retry-failed`, token, {
        method: 'POST',
        body: '{}',
      });
      setRetryMsg(r.message ?? 'Opnieuw geprobeerd.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Opnieuw proberen mislukt');
    } finally {
      setRetryBusy(false);
    }
  };

  if (err) return <p className="text-sm text-red-700">{err}</p>;
  if (!data) return <p className="text-sm text-muted">Laden…</p>;

  return (
    <div className="space-y-4">
      <Link href="/admin/communicatie/geschiedenis" className="text-xs text-burgundy underline">
        ← Terug
      </Link>
      <div className="rounded border border-line bg-white p-4 text-sm space-y-1">
        <p>
          <strong>{data.channel.toUpperCase()}</strong> · {new Date(data.createdAt).toLocaleString('nl-BE')}
        </p>
        {data.subject ? <p>Onderwerp: {data.subject}</p> : null}
        {data.list ? <p>Lijst: {data.list.name}</p> : null}
        <p>
          Verzonden: {data.stats.sent} · Geopend: {data.stats.opened} · Verwerkt: {data.stats.total}
          {data.stats.planned ? ` · Gepland: ${data.stats.planned}` : ''}
        </p>
        {data.channel === 'email' && failedCount > 0 && can('admin.push.send') ? (
          <button
            type="button"
            disabled={retryBusy}
            onClick={() => void retryFailed()}
            className="mt-2 rounded bg-burgundy px-3 py-1.5 text-xs font-semibold text-white hover:bg-burgundyDeep disabled:opacity-50"
          >
            {retryBusy ? 'Bezig…' : `Mislukte opnieuw proberen (${failedCount})`}
          </button>
        ) : null}
        {retryMsg ? <p className="mt-2 text-xs text-emerald-800">{retryMsg}</p> : null}
        {data.channel === 'email' && data.bodyHtml ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-burgundy underline">Toon verzonden e-mailinhoud</summary>
            <div
              className="mt-2 max-h-64 overflow-y-auto rounded border border-line bg-zinc-50 p-3 text-xs prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: data.bodyHtml }}
            />
          </details>
        ) : null}
        {data.channel === 'sms' && data.bodySms ? (
          <p className="mt-2 whitespace-pre-wrap rounded border border-line bg-zinc-50 p-3 text-xs">{data.bodySms}</p>
        ) : null}
      </div>
      <div className="rounded border border-line bg-white overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-2 text-left">Ontvanger</th>
              <th className="p-2 text-left">Contact</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Verzonden</th>
              <th className="p-2 text-left">Geopend</th>
              <th className="p-2 text-left">Opens</th>
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
                    {d.lastOpenedAt && d.openCount > 1
                      ? ` (laatst: ${new Date(d.lastOpenedAt).toLocaleString('nl-BE')})`
                      : ''}
                  </td>
                  <td className="p-2">{data.channel === 'email' ? d.openCount : '—'}</td>
                  <td className="p-2 max-w-[180px] truncate text-red-700" title={d.errorMessage || ''}>
                    {d.status === 'failed' ? d.errorMessage || '—' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
