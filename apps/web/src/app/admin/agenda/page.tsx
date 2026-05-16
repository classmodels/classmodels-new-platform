'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type OverviewCal = {
  id: string;
  slug: string;
  title: string;
  active: boolean;
  publicBooking: boolean;
  openSlotsFuture: number;
  bookingsCount: number;
};

export default function AdminAgendaOverviewPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [calendars, setCalendars] = useState<OverviewCal[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const data = await adminFetch<{ calendars: OverviewCal[] }>('/admin/agenda/overview', token);
      setCalendars(data.calendars);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
    }
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const createAgenda = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!token || !newSlug.trim() || !newTitle.trim()) return;
    setBusy(true);
    try {
      await adminFetch('/admin/agenda/calendars', token, {
        method: 'POST',
        body: JSON.stringify({ slug: newSlug.trim().toLowerCase(), title: newTitle.trim() }),
      });
      setNewSlug('');
      setNewTitle('');
      setMsg('Agenda aangemaakt.');
      await load();
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    } finally {
      setBusy(false);
    }
  };

  const deleteCal = async (id: string, title: string) => {
    if (!token) return;
    if (!window.confirm(`Agenda «${title}» en alle gekoppelde data definitief verwijderen?`)) return;
    setMsg(null);
    try {
      await adminFetch(`/admin/agenda/calendars/${id}`, token, { method: 'DELETE' });
      setMsg('Agenda verwijderd.');
      await load();
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Verwijderen mislukt');
    }
  };

  const openSettings = (id: string) => {
    router.push(`/admin/agenda/calendar/${id}`);
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-8">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
          {msg}
        </p>
      ) : null}

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Nieuwe agenda</h2>
        <p className="mt-1 text-xs text-muted">
          Slug is de unieke technische naam (kleine letters, koppeltekens). Er wordt automatisch een standaardformulier
          toegevoegd.
        </p>
        <form onSubmit={createAgenda} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Slug
            <input
              className="rounded border border-line px-2 py-1.5"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="bv. portfolio"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            Titel
            <input
              className="min-w-[220px] rounded border border-line px-2 py-1.5"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Weergavenaam"
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-burgundy px-4 py-2 text-white hover:bg-burgundyDeep disabled:opacity-50"
          >
            {busy ? 'Bezig…' : 'Opslaan'}
          </button>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {calendars.map((c) => (
          <div key={c.id} className="flex flex-col rounded-md border border-line bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{c.title}</p>
                <p className="text-xs text-muted">{c.slug}</p>
              </div>
              <span
                className={[
                  'shrink-0 rounded px-2 py-0.5 text-[10px] font-medium uppercase',
                  c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600',
                ].join(' ')}
              >
                {c.active ? 'Actief' : 'Uit'}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted">Open momenten (toekomst)</dt>
                <dd className="font-medium text-ink">{c.openSlotsFuture}</dd>
              </div>
              <div>
                <dt className="text-muted">Boekingen</dt>
                <dd className="font-medium text-ink">{c.bookingsCount}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openSettings(c.id)}
                className="rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-zinc-100"
              >
                Instellingen
              </button>
              <button
                type="button"
                onClick={() => void deleteCal(c.id, c.title)}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
              >
                Verwijderen
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
