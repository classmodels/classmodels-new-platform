'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type BriefList = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  client: { email: string; companyName?: string | null; firstName?: string | null; lastName?: string | null };
  _count: { responses: number };
};

type BriefDetail = {
  id: string;
  title: string;
  body: string;
  status: string;
  client: { email: string; companyName?: string | null };
  responses: {
    id: string;
    message: string;
    status: string;
    model: { email: string; firstName?: string | null; lastName?: string | null };
  }[];
};

export default function AdminBriefsPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<BriefList[]>([]);
  const [detail, setDetail] = useState<BriefDetail | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!token || !can('admin.briefs.read')) return;
    const data = await adminFetch<BriefList[]>('/admin/briefs', token);
    setRows(data);
  }, [token, can]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const open = async (id: string) => {
    if (!token) return;
    const d = await adminFetch<BriefDetail>(`/admin/briefs/${id}`, token);
    setDetail(d);
  };

  const patchBrief = async (id: string, status: string) => {
    if (!token || !can('admin.briefs.write')) return;
    await adminFetch(`/admin/briefs/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setMsg('Status bijgewerkt.');
    await load();
    if (detail?.id === id) await open(id);
  };

  const patchResponse = async (responseId: string, status: 'accepted' | 'declined') => {
    if (!token || !can('admin.briefs.write')) return;
    await adminFetch(`/admin/briefs/model-responses/${responseId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setMsg('Reactie bijgewerkt.');
    if (detail) await open(detail.id);
    await load();
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.briefs.read')) {
    return <p className="text-sm text-muted">Geen toegang tot casting-aanvragen.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Casting-aanvragen</h1>
        <p className="mt-1 text-sm text-muted">
          Overzicht van klant-aanvragen en model-reacties. Status beheer je hier of door de klant.
        </p>
      </div>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}

      <div className="overflow-x-auto rounded-md border border-line bg-white shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="px-3 py-2">Titel</th>
              <th className="px-3 py-2">Klant</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Reacties</th>
              <th className="px-3 py-2">Acties</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-2 text-ink">{r.title}</td>
                <td className="px-3 py-2 text-muted">{r.client.email}</td>
                <td className="px-3 py-2 text-muted">{r.status}</td>
                <td className="px-3 py-2 text-muted">{r._count.responses}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="mr-2 text-burgundy hover:underline"
                    onClick={() => open(r.id)}
                  >
                    Bekijk
                  </button>
                  {can('admin.briefs.write') ? (
                    <>
                      <button
                        type="button"
                        className="mr-2 text-burgundy hover:underline"
                        onClick={() => patchBrief(r.id, 'archived')}
                      >
                        Archiveer
                      </button>
                      <button
                        type="button"
                        className="text-burgundy hover:underline"
                        onClick={() => patchBrief(r.id, 'closed')}
                      >
                        Sluiten
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail ? (
        <div className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-medium text-ink">{detail.title}</h2>
            <button
              type="button"
              className="text-xs text-muted hover:text-ink"
              onClick={() => setDetail(null)}
            >
              Sluiten
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            {detail.client.email}
            {detail.client.companyName ? ` · ${detail.client.companyName}` : ''}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed">{detail.body}</p>
          <p className="mt-4 text-xs font-medium text-ink">Reacties</p>
          <ul className="mt-2 space-y-2">
            {detail.responses.map((x) => (
              <li key={x.id} className="rounded border border-line bg-panel/40 p-2 text-xs">
                <p className="text-muted">
                  {(x.model.firstName || '') + ' ' + (x.model.lastName || '')} ({x.model.email}) —{' '}
                  {x.status}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{x.message}</p>
                {can('admin.briefs.write') && x.status === 'submitted' ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="text-burgundy hover:underline"
                      onClick={() => patchResponse(x.id, 'accepted')}
                    >
                      Markeer geaccepteerd
                    </button>
                    <button
                      type="button"
                      className="text-burgundy hover:underline"
                      onClick={() => patchResponse(x.id, 'declined')}
                    >
                      Afwijzen
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
