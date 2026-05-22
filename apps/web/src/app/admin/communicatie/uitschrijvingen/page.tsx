'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Row = {
  id: string;
  email: string;
  displayName: string | null;
  source: string;
  createdAt: string;
  user: { firstName: string | null; lastName: string | null; email: string } | null;
};

export default function CommunicatieUitschrijvingenPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !can('admin.push.send')) return;
    try {
      setRows(await adminFetch<Row[]>('/admin/comms/unsubscribes', token));
    } catch {
      setRows([]);
    }
  }, [token, can]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string, email: string) => {
    if (!token || !window.confirm(`${email} opnieuw mailen toestaan (uitschrijving verwijderen)?`)) return;
    setMsg(null);
    try {
      await adminFetch(`/admin/comms/unsubscribes/${id}`, token, { method: 'DELETE' });
      await load();
      setMsg('Uitschrijving verwijderd — dit adres kan weer e-mails ontvangen.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Verwijderen mislukt');
    }
  };

  if (!can('admin.push.send')) {
    return <p className="text-sm text-muted">Geen rechten om uitschrijvingen te bekijken.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Modellen die onderaan een bulk-e-mail op &quot;Uitschrijven&quot; klikten. Zij worden niet meer
        geselecteerd bij Verzenden. Dubbele e-mailadressen in een lijst verwijdert u via Contactlijsten →
        Dubbele verwijderen.
      </p>
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
      <div className="rounded border border-line bg-white overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-2 text-left">Datum</th>
              <th className="p-2 text-left">E-mail</th>
              <th className="p-2 text-left">Naam</th>
              <th className="p-2 text-left">Bron</th>
              <th className="p-2 text-left" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const name =
                r.displayName ||
                [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') ||
                '—';
              return (
                <tr key={r.id} className="border-t border-line">
                  <td className="p-2 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString('nl-BE')}
                  </td>
                  <td className="p-2">{r.email}</td>
                  <td className="p-2 text-muted">{name}</td>
                  <td className="p-2 text-muted">{r.source === 'link' ? 'Link in mail' : r.source}</td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="text-burgundy underline"
                      onClick={() => void remove(r.id, r.email)}
                    >
                      Opnieuw toestaan
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? <p className="p-4 text-sm text-muted">Nog niemand uitgeschreven.</p> : null}
      </div>
    </div>
  );
}
