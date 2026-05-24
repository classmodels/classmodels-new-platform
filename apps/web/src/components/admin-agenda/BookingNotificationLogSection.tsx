'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-api';

export type BookingNotificationLogRow = {
  id: string;
  channel: string;
  trigger: string;
  templateName: string | null;
  subject: string | null;
  recipient: string | null;
  bodyPreview: string | null;
  sent: boolean;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

const TRIGGER_LABELS: Record<string, string> = {
  booking_created: 'Bevestiging bij boeking',
  booking_confirmed: 'Komst bevestigd',
  booking_cancelled: 'Annulatie',
  reminder: 'Herinnering',
  followup: 'Opvolging',
};

function formatNlDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('nl-BE', {
      timeZone: 'Europe/Brussels',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Props = {
  bookingId: string;
  token: string | null;
};

export function BookingNotificationLogSection({ bookingId, token }: Props) {
  const [rows, setRows] = useState<BookingNotificationLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !bookingId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch<BookingNotificationLogRow[]>(
        `/admin/agenda/bookings/${bookingId}/notifications`,
        token,
      );
      setRows(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  }, [bookingId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (logId: string) => {
    if (!token) return;
    if (!window.confirm('Deze melding uit de lijst verwijderen?')) return;
    setBusyId(logId);
    setErr(null);
    try {
      await adminFetch(`/admin/agenda/bookings/${bookingId}/notifications/${logId}`, token, {
        method: 'DELETE',
      });
      setRows((prev) => prev.filter((r) => r.id !== logId));
      if (openId === logId) setOpenId(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Verwijderen mislukt');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-600">Verzonden mails &amp; SMS</h4>
        <button
          type="button"
          className="text-xs text-muted underline hover:text-ink"
          onClick={() => void load()}
          disabled={loading}
        >
          Vernieuwen
        </button>
      </div>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      {loading && !rows.length ? (
        <p className="mt-2 text-xs text-muted">Laden…</p>
      ) : !rows.length ? (
        <p className="mt-2 text-xs text-muted">Nog geen geregistreerde mails of SMS voor deze afspraak.</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-lg border border-line">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-zinc-50 text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Kanaal</th>
                <th className="px-3 py-2 font-medium">Verstuurd</th>
                <th className="px-3 py-2 font-medium">Datum</th>
                <th className="px-3 py-2 font-medium">Uur</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const when = r.sentAt ?? r.createdAt;
                const formatted = formatNlDateTime(when);
                const comma = formatted.indexOf(', ');
                const dayPart = comma >= 0 ? formatted.slice(0, comma) : formatted;
                const timePart = comma >= 0 ? formatted.slice(comma + 2) : '—';
                const label = r.templateName?.trim() || TRIGGER_LABELS[r.trigger] || r.trigger;
                const open = openId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className="border-t border-line">
                      <td className="px-3 py-2 text-ink">{label}</td>
                      <td className="px-3 py-2 uppercase text-muted">{r.channel}</td>
                      <td className="px-3 py-2">
                        {r.sent ? (
                          <span className="text-emerald-700">Ja</span>
                        ) : (
                          <span className="text-red-600">Nee</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{dayPart}</td>
                      <td className="whitespace-nowrap px-3 py-2">{timePart}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <button
                          type="button"
                          className="mr-2 text-burgundy underline"
                          onClick={() => setOpenId(open ? null : r.id)}
                        >
                          {open ? 'Sluiten' : 'Details'}
                        </button>
                        <button
                          type="button"
                          className="text-red-600 underline disabled:opacity-50"
                          disabled={busyId === r.id}
                          onClick={() => void remove(r.id)}
                        >
                          Verwijder
                        </button>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-t border-line bg-zinc-50">
                        <td colSpan={6} className="px-3 py-3 text-xs text-ink">
                          {r.subject ? (
                            <p>
                              <span className="font-semibold">Onderwerp:</span> {r.subject}
                            </p>
                          ) : null}
                          {r.recipient ? (
                            <p className="mt-1">
                              <span className="font-semibold">Ontvanger:</span> {r.recipient}
                            </p>
                          ) : null}
                          {r.bodyPreview ? (
                            <p className="mt-2 break-words whitespace-pre-wrap text-muted">{r.bodyPreview}</p>
                          ) : null}
                          {!r.sent && r.errorMessage ? (
                            <p className="mt-2 text-red-600">{r.errorMessage}</p>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
