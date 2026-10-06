'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  timeSlot: string;
  ageGroup: string;
  createdAt: string;
};

export default function AdminOpenModellendagPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<Row[]>('/admin/open-modellendag', token);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const bySlot = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.timeSlot, (map.get(r.timeSlot) || 0) + 1);
    return map;
  }, [rows]);

  function exportCsv() {
    const header = ['Naam', 'E-mail', 'Telefoon', 'Leeftijd', 'Leeftijdsgroep', 'Startuur', 'Ingeschreven'];
    const lines = [
      header.join(';'),
      ...rows.map((r) =>
        [
          r.name,
          r.email,
          r.phone,
          String(r.age),
          r.ageGroup,
          r.timeSlot,
          new Date(r.createdAt).toLocaleString('nl-BE'),
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(';'),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open-modellendag-inschrijvingen.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!token) return <p className="text-sm text-zinc-600">Inloggen vereist.</p>;

  if (!can('admin.agenda.read')) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-zinc-900">Open Modellendag</h1>
        <p className="text-sm text-zinc-600">Geen toegang.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Open Modellendag</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Inschrijvingen voor zondag 11 oktober — naam, mail, tel, leeftijd en startuur.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Vernieuwen
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!rows.length}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            CSV downloaden
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-800">
          Totaal: {rows.length}
        </span>
        {['11:00', '13:00', '15:00', '17:00'].map((slot) => (
          <span key={slot} className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">
            {slot}: {bySlot.get(slot) || 0}
          </span>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Laden…</p> : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Naam</th>
              <th className="px-4 py-3 font-semibold">E-mail</th>
              <th className="px-4 py-3 font-semibold">Telefoon</th>
              <th className="px-4 py-3 font-semibold">Leeftijd</th>
              <th className="px-4 py-3 font-semibold">Groep</th>
              <th className="px-4 py-3 font-semibold">Startuur</th>
              <th className="px-4 py-3 font-semibold">Ingeschreven</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-zinc-50/80">
                <td className="px-4 py-3 font-medium text-zinc-900">{r.name}</td>
                <td className="px-4 py-3 text-zinc-700">
                  <a className="underline decoration-zinc-300 hover:decoration-zinc-600" href={`mailto:${r.email}`}>
                    {r.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  <a className="underline decoration-zinc-300 hover:decoration-zinc-600" href={`tel:${r.phone}`}>
                    {r.phone}
                  </a>
                </td>
                <td className="px-4 py-3">{r.age}</td>
                <td className="px-4 py-3">{r.ageGroup}</td>
                <td className="px-4 py-3 font-semibold">{r.timeSlot}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(r.createdAt).toLocaleString('nl-BE')}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Nog geen inschrijvingen.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
