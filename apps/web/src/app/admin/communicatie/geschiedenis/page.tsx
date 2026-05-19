'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type CampaignRow = {
  id: string;
  channel: string;
  subject: string | null;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  list: { id: string; name: string } | null;
  sentBy: { firstName: string | null; lastName: string | null; email: string } | null;
  _count: { deliveries: number };
};

export default function CommunicatieGeschiedenisPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<CampaignRow[]>([]);

  const load = useCallback(async () => {
    if (!token || !can('admin.push.send')) return;
    try {
      setRows(await adminFetch<CampaignRow[]>('/admin/comms/campaigns', token));
    } catch {
      setRows([]);
    }
  }, [token, can]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!can('admin.push.send')) {
    return <p className="text-sm text-muted">Geen rechten om geschiedenis te bekijken.</p>;
  }

  return (
    <div className="rounded border border-line bg-white overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-zinc-50">
          <tr>
            <th className="p-2 text-left">Datum</th>
            <th className="p-2 text-left">Kanaal</th>
            <th className="p-2 text-left">Onderwerp / inhoud</th>
            <th className="p-2 text-left">Verzonden</th>
            <th className="p-2 text-left">Lijst</th>
            <th className="p-2 text-left" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-t border-line">
              <td className="p-2 whitespace-nowrap">{new Date(c.createdAt).toLocaleString('nl-BE')}</td>
              <td className="p-2 uppercase">{c.channel}</td>
              <td className="p-2 max-w-[200px] truncate">{c.subject || '—'}</td>
              <td className="p-2">
                {c.sentCount} ok · {c.failedCount} mis · {c.skippedCount} overgeslagen
              </td>
              <td className="p-2 text-muted">{c.list?.name || '—'}</td>
              <td className="p-2">
                <Link href={`/admin/communicatie/geschiedenis/${c.id}`} className="text-burgundy underline">
                  Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <p className="p-4 text-sm text-muted">Nog geen verzendingen.</p> : null}
    </div>
  );
}
