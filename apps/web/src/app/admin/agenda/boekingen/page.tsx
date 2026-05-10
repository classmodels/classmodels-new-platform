'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Cal = {
  id: string;
  slug: string;
  title: string;
  active: boolean;
  capacity: number;
};

type BookingRow = {
  id: string;
  startAt: string;
  status: string;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  calendar: { slug: string; title: string };
  slot: { slotDate: string; startTime: string; endTime: string };
};

export default function AdminAgendaBoekingenPage() {
  const { token } = useAuth();
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [filterSlug, setFilterSlug] = useState('');

  const loadCals = useCallback(async () => {
    if (!token) return;
    const rows = await adminFetch<Cal[]>('/admin/agenda/calendars', token);
    setCalendars(rows);
  }, [token]);

  const loadBookings = useCallback(async () => {
    if (!token) return;
    const q = filterSlug ? `?calendarSlug=${encodeURIComponent(filterSlug)}&limit=200` : '?limit=200';
    const rows = await adminFetch<BookingRow[]>(`/admin/agenda/bookings${q}`, token);
    setBookings(rows);
  }, [token, filterSlug]);

  useEffect(() => {
    loadCals().catch(() => {});
  }, [loadCals]);

  useEffect(() => {
    loadBookings().catch(() => setBookings([]));
  }, [loadBookings]);

  const df = useMemo(() => new Intl.DateTimeFormat('nl-BE', { dateStyle: 'medium', timeStyle: 'short' }), []);

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Ingeschreven personen / boekingen</h2>
          <select
            className="rounded border border-line bg-white px-2 py-1 text-xs"
            value={filterSlug}
            onChange={(e) => setFilterSlug(e.target.value)}
          >
            <option value="">Alle agenda&apos;s</option>
            {calendars.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 pr-3 font-medium">Moment</th>
                <th className="py-2 pr-3 font-medium">Agenda</th>
                <th className="py-2 pr-3 font-medium">Naam</th>
                <th className="py-2 pr-3 font-medium">Contact</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const slotD = b.slot?.slotDate?.slice(0, 10);
                const nm =
                  b.name ||
                  [b.firstname, b.lastname].filter(Boolean).join(' ') ||
                  '—';
                return (
                  <tr key={b.id} className="border-b border-line/80">
                    <td className="py-2 pr-3 align-top">
                      {df.format(new Date(b.startAt))}
                      {slotD ? (
                        <div className="text-[10px] text-muted">
                          Slot {slotD} {b.slot.startTime?.slice(0, 5)}–{b.slot.endTime?.slice(0, 5)}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 align-top text-muted">{b.calendar.title}</td>
                    <td className="py-2 pr-3 align-top">{nm}</td>
                    <td className="py-2 pr-3 align-top text-muted">
                      {b.email || '—'}
                      {b.phone ? <div>{b.phone}</div> : null}
                    </td>
                    <td className="py-2 align-top">{b.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!bookings.length ? <p className="mt-4 text-xs text-muted">Nog geen boekingen.</p> : null}
      </section>
    </div>
  );
}
