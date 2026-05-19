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
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  list: { name: string } | null;
  stats: { sent: number; opened: number; total: number };
  deliveries: DeliveryRow[];
};

export default function CommunicatieGeschiedenisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
          Verzonden: {data.stats.sent} · Geopend: {data.stats.opened} · Totaal: {data.stats.total}
        </p>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
