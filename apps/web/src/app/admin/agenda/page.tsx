'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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

type RecentBooking = {
  id: string;
  startAt: string;
  status: string;
  name: string | null;
  email: string | null;
  calendar: { slug: string; title: string };
};

export default function AdminAgendaOverviewPage() {
  const { token } = useAuth();
  const [calendars, setCalendars] = useState<OverviewCal[]>([]);
  const [recent, setRecent] = useState<RecentBooking[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const data = await adminFetch<{ calendars: OverviewCal[]; recentBookings: RecentBooking[] }>(
        '/admin/agenda/overview',
        token,
      );
      setCalendars(data.calendars);
      setRecent(data.recentBookings);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
    }
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  const df = new Intl.DateTimeFormat('nl-BE', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-8">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {calendars.map((c) => (
          <div
            key={c.id}
            className="rounded-md border border-line bg-white p-4 shadow-sm"
          >
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
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link href="/admin/agenda/momenten" className="text-burgundy underline underline-offset-2">
                Momenten
              </Link>
              <Link href="/admin/agenda/kalender" className="text-burgundy underline underline-offset-2">
                Kalender
              </Link>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Laatste boekingen</h2>
        <ul className="mt-3 divide-y divide-line text-xs">
          {recent.map((b) => (
            <li key={b.id} className="flex flex-wrap gap-2 py-2">
              <span className="font-medium text-ink">{df.format(new Date(b.startAt))}</span>
              <span className="text-muted">{b.calendar.title}</span>
              <span>{b.status}</span>
              <span>{b.name || '—'}</span>
              <span className="text-muted">{b.email || ''}</span>
            </li>
          ))}
          {!recent.length ? <li className="py-4 text-muted">Nog geen boekingen.</li> : null}
        </ul>
        <p className="mt-3 text-xs">
          <Link href="/admin/agenda/boekingen" className="font-medium text-burgundy underline underline-offset-2">
            Alle boekingen bekijken
          </Link>
        </p>
      </section>
    </div>
  );
}
