'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { ContainerMediaPicker } from '@/components/admin/ContainerMediaPicker';

type EventRow = {
  id: string;
  slug: string;
  title: string;
  eventDate: string;
  priceStd: number;
  priceVip: number;
  ticketStock: number | null;
  sold: number;
  remaining: number | null;
  published: boolean;
  archived: boolean;
  doorsTime?: string | null;
  startTime?: string | null;
  venueName?: string | null;
  street?: string | null;
  streetNo?: string | null;
  postcode?: string | null;
  city?: string | null;
  locationExtra?: string | null;
  summary?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  ticketFooter?: string | null;
  coupons?: { id: string; code: string; ticketType: string; maxQty: number; active: boolean }[];
};

type OrderRow = {
  id: string;
  orderKey: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  qtyStd: number;
  qtyVip: number;
  totalAmount: number;
  createdAt: string;
  event: { title: string } | null;
  tickets: { code: string; ticketType: string; checkedIn: boolean }[];
};

const emptyEventForm = {
  title: '',
  slug: '',
  eventDate: '',
  doorsTime: '19:00',
  startTime: '20:00',
  venueName: '',
  street: '',
  streetNo: '',
  postcode: '',
  city: '',
  locationExtra: '',
  summary: '',
  description: '',
  coverImageUrl: '',
  ticketFooter: '',
  priceStd: '25',
  priceVip: '45',
  ticketStock: '200',
  published: true,
};

export default function AdminModeshowTicketsPage() {
  const { token, can } = useAuth();
  const canRead = can('admin.billing.read');
  const canWrite = can('admin.billing.write');

  const [tab, setTab] = useState<'events' | 'orders' | 'checkin'>('events');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState(emptyEventForm);
  const [couponForm, setCouponForm] = useState({ code: '', ticketType: 'std', maxQty: '1' });
  const [orderSearch, setOrderSearch] = useState('');
  const [checkCode, setCheckCode] = useState('');
  const [checkResult, setCheckResult] = useState<unknown>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [manual, setManual] = useState({
    eventId: '',
    firstName: '',
    lastName: '',
    email: '',
    qtyStd: '1',
    qtyVip: '0',
    markFree: true,
    sendEmail: true,
  });

  const loadEvents = useCallback(async () => {
    if (!token) return;
    const rows = await adminFetch<EventRow[]>('/admin/modeshow-tickets/events', token);
    setEvents(rows);
    if (!manual.eventId && rows[0]) setManual((m) => ({ ...m, eventId: rows[0].id }));
  }, [token, manual.eventId]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    const q = orderSearch.trim() ? `?search=${encodeURIComponent(orderSearch.trim())}` : '';
    const rows = await adminFetch<OrderRow[]>(`/admin/modeshow-tickets/orders${q}`, token);
    setOrders(rows);
  }, [token, orderSearch]);

  useEffect(() => {
    if (!canRead || !token) return;
    void loadEvents().catch((e) => setErr(e instanceof Error ? e.message : 'Laden mislukt'));
  }, [canRead, token, loadEvents]);

  useEffect(() => {
    if (!canRead || !token || tab !== 'orders') return;
    void loadOrders().catch((e) => setErr(e instanceof Error ? e.message : 'Orders laden mislukt'));
  }, [canRead, token, tab, loadOrders]);

  if (!canRead) {
    return (
      <div className="rounded border border-line bg-white p-6 text-sm text-muted">
        Geen toegang. Vereiste permissie: <code>admin.billing.read</code>
      </div>
    );
  }

  async function saveEvent(e: FormEvent) {
    e.preventDefault();
    if (!token || !canWrite) return;
    setErr('');
    setMsg('');
    try {
      const body = {
        title: form.title,
        slug: form.slug || undefined,
        eventDate: form.eventDate,
        doorsTime: form.doorsTime,
        startTime: form.startTime,
        venueName: form.venueName,
        street: form.street,
        streetNo: form.streetNo,
        postcode: form.postcode,
        city: form.city,
        locationExtra: form.locationExtra,
        summary: form.summary,
        description: form.description,
        coverImageUrl: form.coverImageUrl || null,
        ticketFooter: form.ticketFooter,
        priceStd: Number(form.priceStd) || 0,
        priceVip: Number(form.priceVip) || 0,
        ticketStock: form.ticketStock === '' ? null : Number(form.ticketStock),
        published: form.published,
      };
      if (editing) {
        await adminFetch(`/admin/modeshow-tickets/events/${editing.id}`, token, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setMsg('Evenement bijgewerkt');
      } else {
        await adminFetch('/admin/modeshow-tickets/events', token, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setMsg('Evenement aangemaakt');
      }
      setEditing(null);
      setForm(emptyEventForm);
      await loadEvents();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Opslaan mislukt');
    }
  }

  function startEdit(ev: EventRow) {
    setEditing(ev);
    setForm({
      title: ev.title,
      slug: ev.slug,
      eventDate: ev.eventDate,
      doorsTime: ev.doorsTime || '',
      startTime: ev.startTime || '',
      venueName: ev.venueName || '',
      street: ev.street || '',
      streetNo: ev.streetNo || '',
      postcode: ev.postcode || '',
      city: ev.city || '',
      locationExtra: ev.locationExtra || '',
      summary: ev.summary || '',
      description: ev.description || '',
      coverImageUrl: ev.coverImageUrl || '',
      ticketFooter: ev.ticketFooter || '',
      priceStd: String(ev.priceStd),
      priceVip: String(ev.priceVip),
      ticketStock: ev.ticketStock == null ? '' : String(ev.ticketStock),
      published: ev.published,
    });
    void (async () => {
      if (!token) return;
      const full = await adminFetch<EventRow>(`/admin/modeshow-tickets/events/${ev.id}`, token);
      setEditing(full);
      setForm((f) => ({
        ...f,
        locationExtra: full.locationExtra || '',
        coverImageUrl: full.coverImageUrl || '',
        ticketFooter: full.ticketFooter || '',
        summary: full.summary || f.summary,
        description: full.description || f.description,
      }));
    })();
  }

  async function addCoupon(e: FormEvent) {
    e.preventDefault();
    if (!token || !canWrite || !editing) return;
    try {
      const full = await adminFetch<EventRow>(`/admin/modeshow-tickets/events/${editing.id}/coupons`, token, {
        method: 'POST',
        body: JSON.stringify({
          code: couponForm.code,
          ticketType: couponForm.ticketType,
          maxQty: Number(couponForm.maxQty) || 1,
        }),
      });
      setEditing(full);
      setCouponForm({ code: '', ticketType: 'std', maxQty: '1' });
      setMsg('Coupon toegevoegd');
      await loadEvents();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Coupon mislukt');
    }
  }

  async function lookup() {
    if (!token || !checkCode.trim()) return;
    setErr('');
    try {
      const r = await adminFetch(`/admin/modeshow-tickets/check-in/lookup?code=${encodeURIComponent(checkCode.trim())}`, token);
      setCheckResult(r);
    } catch (ex) {
      setCheckResult(null);
      setErr(ex instanceof Error ? ex.message : 'Niet gevonden');
    }
  }

  async function doCheckIn() {
    if (!token || !canWrite || !checkCode.trim()) return;
    try {
      const r = await adminFetch('/admin/modeshow-tickets/check-in', token, {
        method: 'POST',
        body: JSON.stringify({ code: checkCode.trim() }),
      });
      setCheckResult(r);
      setMsg('Ingecheckt');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Check-in mislukt');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Tickets modeshow</h1>
        <p className="mt-1 text-sm text-muted">
          Evenementen, ticketverkoop (Mollie), bestellingen, PDF-tickets met QR en check-in.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['events', 'Evenementen'],
            ['orders', 'Bestellingen'],
            ['checkin', 'Check-in'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              tab === id ? 'bg-zinc-900 text-white' : 'border border-line bg-white text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg ? <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p> : null}
      {err ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      {tab === 'events' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded border border-line bg-white p-4">
            <h2 className="text-sm font-semibold text-ink">{editing ? 'Evenement bewerken' : 'Nieuw evenement'}</h2>
            <form onSubmit={saveEvent} className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['title', 'Titel', 'text'],
                  ['slug', 'Slug (optioneel)', 'text'],
                  ['eventDate', 'Datum', 'date'],
                  ['doorsTime', 'Deuren', 'time'],
                  ['startTime', 'Start', 'time'],
                  ['venueName', 'Locatie naam', 'text'],
                  ['street', 'Straat', 'text'],
                  ['streetNo', 'Nr', 'text'],
                  ['postcode', 'Postcode', 'text'],
                  ['city', 'Gemeente', 'text'],
                  ['priceStd', 'Prijs standaard', 'number'],
                  ['priceVip', 'Prijs VIP', 'number'],
                  ['ticketStock', 'Voorraad (leeg = ∞)', 'number'],
                ] as const
              ).map(([key, label, type]) => (
                <label key={key} className="text-xs text-muted">
                  {label}
                  <input
                    type={type}
                    className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm text-ink"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required={key === 'title' || key === 'eventDate'}
                    disabled={!canWrite}
                  />
                </label>
              ))}
              <label className="sm:col-span-2 text-xs text-muted">
                Extra locatie-info
                <input
                  className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm text-ink"
                  value={form.locationExtra}
                  onChange={(e) => setForm((f) => ({ ...f, locationExtra: e.target.value }))}
                  disabled={!canWrite}
                  placeholder="Zaal, verdieping, parking…"
                />
              </label>
              <label className="sm:col-span-2 text-xs text-muted">
                Samenvatting
                <textarea
                  className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                  rows={2}
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  disabled={!canWrite}
                />
              </label>
              <label className="sm:col-span-2 text-xs text-muted">
                Beschrijving
                <textarea
                  className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  disabled={!canWrite}
                />
              </label>
              <div className="sm:col-span-2 space-y-2 rounded border border-dashed border-line p-3">
                <p className="text-xs font-medium text-ink">Coverfoto / affiche</p>
                <p className="text-[11px] text-muted">
                  Zichtbaar in de ticketshop en op het PDF-ticket. Kies uit de mediatheek of plak een URL.
                </p>
                {form.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.coverImageUrl}
                    alt="Cover"
                    className="max-h-40 w-full rounded object-cover border border-line"
                  />
                ) : (
                  <div className="flex h-28 items-center justify-center rounded bg-zinc-50 text-xs text-muted">
                    Geen foto
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    className="min-w-[12rem] flex-1 rounded border border-line px-2 py-1.5 text-sm"
                    placeholder="https://… of /media/public/…"
                    value={form.coverImageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                    disabled={!canWrite}
                  />
                  {canWrite ? (
                    <>
                      <button
                        type="button"
                        className="rounded border border-line bg-panel px-3 py-1.5 text-xs font-medium"
                        onClick={() => setMediaPickerOpen(true)}
                      >
                        Mediatheek
                      </button>
                      {form.coverImageUrl ? (
                        <button
                          type="button"
                          className="rounded border border-line px-3 py-1.5 text-xs text-red-700"
                          onClick={() => setForm((f) => ({ ...f, coverImageUrl: '' }))}
                        >
                          Foto wissen
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
              <label className="sm:col-span-2 text-xs text-muted">
                Tekst onderaan PDF-ticket
                <textarea
                  className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                  rows={2}
                  value={form.ticketFooter}
                  onChange={(e) => setForm((f) => ({ ...f, ticketFooter: e.target.value }))}
                  disabled={!canWrite}
                  placeholder="Geldig voor één persoon. Toon QR aan de ingang."
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-ink sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                  disabled={!canWrite}
                />
                Gepubliceerd op de site
              </label>
              {canWrite ? (
                <div className="sm:col-span-2 flex gap-2">
                  <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
                    {editing ? 'Opslaan' : 'Aanmaken'}
                  </button>
                  {editing ? (
                    <button
                      type="button"
                      className="rounded border border-line px-3 py-1.5 text-xs"
                      onClick={() => {
                        setEditing(null);
                        setForm(emptyEventForm);
                      }}
                    >
                      Annuleren
                    </button>
                  ) : null}
                </div>
              ) : null}
            </form>

            {editing?.coupons ? (
              <div className="mt-4 border-t border-line pt-3">
                <h3 className="text-xs font-semibold text-ink">Coupons</h3>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {editing.coupons.map((c) => (
                    <li key={c.id}>
                      {c.code} · {c.ticketType} · max {c.maxQty} {c.active ? '' : '(uit)'}
                    </li>
                  ))}
                </ul>
                {canWrite ? (
                  <form onSubmit={addCoupon} className="mt-2 flex flex-wrap gap-2">
                    <input
                      className="rounded border border-line px-2 py-1 text-xs"
                      placeholder="CODE"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value }))}
                      required
                    />
                    <select
                      className="rounded border border-line px-2 py-1 text-xs"
                      value={couponForm.ticketType}
                      onChange={(e) => setCouponForm((f) => ({ ...f, ticketType: e.target.value }))}
                    >
                      <option value="std">std</option>
                      <option value="vip">vip</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="w-16 rounded border border-line px-2 py-1 text-xs"
                      value={couponForm.maxQty}
                      onChange={(e) => setCouponForm((f) => ({ ...f, maxQty: e.target.value }))}
                    />
                    <button type="submit" className="rounded bg-zinc-900 px-2 py-1 text-xs text-white">
                      + Coupon
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded border border-line bg-white p-4">
            <h2 className="text-sm font-semibold text-ink">Overzicht</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2 pr-2">Titel</th>
                    <th className="py-2 pr-2">Datum</th>
                    <th className="py-2 pr-2">Verkocht</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b border-line/60">
                      <td className="py-2 pr-2 font-medium text-ink">
                        <div className="flex items-center gap-2">
                          {ev.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ev.coverImageUrl}
                              alt=""
                              className="h-10 w-10 rounded object-cover border border-line"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded bg-zinc-100 text-[10px] text-muted">
                              —
                            </span>
                          )}
                          <span>{ev.title}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-2">{ev.eventDate}</td>
                      <td className="py-2 pr-2">
                        {ev.sold}
                        {ev.ticketStock != null ? ` / ${ev.ticketStock}` : ''}
                      </td>
                      <td className="py-2 pr-2">{ev.published ? 'live' : 'concept'}</td>
                      <td className="py-2">
                        <button type="button" className="text-sky-700 underline" onClick={() => startEdit(ev)}>
                          Bewerken
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'orders' ? (
        <div className="space-y-4">
          {canWrite ? (
            <form
              className="rounded border border-line bg-white p-4 grid gap-2 sm:grid-cols-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!token) return;
                try {
                  await adminFetch('/admin/modeshow-tickets/orders/manual', token, {
                    method: 'POST',
                    body: JSON.stringify({
                      eventId: manual.eventId,
                      firstName: manual.firstName,
                      lastName: manual.lastName,
                      email: manual.email,
                      qtyStd: Number(manual.qtyStd) || 0,
                      qtyVip: Number(manual.qtyVip) || 0,
                      markFree: manual.markFree,
                      sendEmail: manual.sendEmail,
                    }),
                  });
                  setMsg('Handmatige bestelling aangemaakt');
                  await loadOrders();
                } catch (ex) {
                  setErr(ex instanceof Error ? ex.message : 'Mislukt');
                }
              }}
            >
              <h2 className="sm:col-span-4 text-sm font-semibold">Handmatige bestelling</h2>
              <select
                className="rounded border border-line px-2 py-1.5 text-sm sm:col-span-2"
                value={manual.eventId}
                onChange={(e) => setManual((m) => ({ ...m, eventId: e.target.value }))}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
              <input className="rounded border border-line px-2 py-1.5 text-sm" placeholder="Voornaam" required value={manual.firstName} onChange={(e) => setManual((m) => ({ ...m, firstName: e.target.value }))} />
              <input className="rounded border border-line px-2 py-1.5 text-sm" placeholder="Naam" required value={manual.lastName} onChange={(e) => setManual((m) => ({ ...m, lastName: e.target.value }))} />
              <input className="rounded border border-line px-2 py-1.5 text-sm sm:col-span-2" type="email" placeholder="E-mail" required value={manual.email} onChange={(e) => setManual((m) => ({ ...m, email: e.target.value }))} />
              <input className="rounded border border-line px-2 py-1.5 text-sm" type="number" min={0} placeholder="qty std" value={manual.qtyStd} onChange={(e) => setManual((m) => ({ ...m, qtyStd: e.target.value }))} />
              <input className="rounded border border-line px-2 py-1.5 text-sm" type="number" min={0} placeholder="qty vip" value={manual.qtyVip} onChange={(e) => setManual((m) => ({ ...m, qtyVip: e.target.value }))} />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={manual.markFree} onChange={(e) => setManual((m) => ({ ...m, markFree: e.target.checked }))} /> Gratis</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={manual.sendEmail} onChange={(e) => setManual((m) => ({ ...m, sendEmail: e.target.checked }))} /> Mail versturen</label>
              <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-xs text-white sm:col-span-4 w-fit">Aanmaken</button>
            </form>
          ) : null}

          <div className="rounded border border-line bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <input
                className="rounded border border-line px-2 py-1.5 text-sm"
                placeholder="Zoek naam / e-mail / code"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
              <button type="button" className="rounded border border-line px-3 py-1.5 text-xs" onClick={() => void loadOrders()}>
                Zoeken
              </button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2 pr-2">Klant</th>
                    <th className="py-2 pr-2">Event</th>
                    <th className="py-2 pr-2">Tickets</th>
                    <th className="py-2 pr-2">Totaal</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-line/60 align-top">
                      <td className="py-2 pr-2">
                        {o.firstName} {o.lastName}
                        <div className="text-muted">{o.email}</div>
                      </td>
                      <td className="py-2 pr-2">{o.event?.title}</td>
                      <td className="py-2 pr-2">
                        std {o.qtyStd} / vip {o.qtyVip}
                        <div className="text-[10px] text-muted">
                          {o.tickets.map((t) => t.code).join(', ')}
                        </div>
                      </td>
                      <td className="py-2 pr-2">€ {Number(o.totalAmount).toFixed(2)}</td>
                      <td className="py-2 pr-2">{o.status}</td>
                      <td className="py-2">
                        {canWrite ? (
                          <button
                            type="button"
                            className="text-sky-700 underline"
                            onClick={() =>
                              void adminFetch(`/admin/modeshow-tickets/orders/${o.id}/resend`, token!, {
                                method: 'POST',
                              })
                                .then(() => setMsg('Tickets opnieuw verstuurd'))
                                .catch((ex) => setErr(ex instanceof Error ? ex.message : 'Resend mislukt'))
                            }
                          >
                            Herstuur mail
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'checkin' ? (
        <div className="rounded border border-line bg-white p-4 max-w-xl space-y-3">
          <h2 className="text-sm font-semibold text-ink">Ticket check-in</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border border-line px-2 py-1.5 text-sm font-mono uppercase"
              placeholder="Ticketcode"
              value={checkCode}
              onChange={(e) => setCheckCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void lookup();
              }}
            />
            <button type="button" className="rounded border border-line px-3 py-1.5 text-xs" onClick={() => void lookup()}>
              Zoek
            </button>
            {canWrite ? (
              <button type="button" className="rounded bg-zinc-900 px-3 py-1.5 text-xs text-white" onClick={() => void doCheckIn()}>
                Check-in
              </button>
            ) : null}
          </div>
          {checkResult ? (
            <pre className="overflow-auto rounded bg-zinc-50 p-3 text-[11px] text-ink">
              {JSON.stringify(checkResult, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}

      <ContainerMediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onPick={(url) => {
          setForm((f) => ({ ...f, coverImageUrl: url }));
          setMediaPickerOpen(false);
        }}
        token={token}
        canRead={can('admin.media.read')}
        canWrite={can('admin.media.write')}
        mode="image"
      />
    </div>
  );
}
