'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getApiBase } from '@/lib/api';

type FieldDto = {
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  width?: string;
  placeholder?: string;
  titlePosition?: string;
  options?: string[];
};

type SlotDto = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  remaining?: number;
  capacity?: number;
};

type Step = 'slots' | 'form' | 'success';

const WEEKDAY_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'] as const;
/** Max. zichtbare dagen tegelijk; rest via pijlen (geen horizontaal scrollen). */
const DAYS_PER_PAGE = 4;

function colHeader(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  const wd = WEEKDAY_SHORT[dt.getDay()];
  return `${wd} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

function monthMatrix(year: number, month: number): ({ ymd: string; inMonth: boolean; dayNum: number } | null)[][] {
  const first = new Date(year, month - 1, 1);
  const startPad = (first.getDay() + 6) % 7;
  const lastDay = new Date(year, month, 0).getDate();
  const cells: ({ ymd: string; inMonth: boolean; dayNum: number } | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    const ymd = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ ymd, inMonth: true, dayNum: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function GuestBookingPanel({
  calendarSlug,
  heading,
  onClose,
  variant = 'default',
  authToken,
  bookUrl,
  onBookingSuccess,
  hideLeftCalendar = false,
  autoBookOnPick = false,
}: {
  calendarSlug: string;
  heading: string;
  onClose: () => void;
  variant?: 'default' | 'pro';
  /** JWT: boeking wordt aan account gekoppeld (modellenportaal). */
  authToken?: string | null;
  /** Relatief pad, bv. `/portal/model/agenda/book-form` */
  bookUrl?: string;
  onBookingSuccess?: () => void | Promise<void>;
  /** Alleen dagkolommen (geen maand-raster), bv. opleiding. */
  hideLeftCalendar?: boolean;
  /** Eén klik boeken zonder formulier (opleiding). */
  autoBookOnPick?: boolean;
}) {
  const [step, setStep] = useState<Step>('slots');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [calTitle, setCalTitle] = useState('');
  const [fields, setFields] = useState<FieldDto[]>([]);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [cancelUrl, setCancelUrl] = useState<string | null>(null);

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [filterDayYmd, setFilterDayYmd] = useState<string | null>(null);
  /** Pagina voor pro-kolomweergave (0 = eerste 4 datums met sloten). */
  const [dayPage, setDayPage] = useState(0);

  const loadData = useCallback(async () => {
    const base = getApiBase();
    setLoading(true);
    setErr(null);
    try {
      const [fRes, sRes] = await Promise.all([
        fetch(`${base}/agenda/fields/${encodeURIComponent(calendarSlug)}`),
        fetch(`${base}/agenda/slots/${encodeURIComponent(calendarSlug)}`),
      ]);
      if (!fRes.ok) throw new Error('Kon agenda niet laden');
      if (!sRes.ok) throw new Error('Kon momenten niet laden');
      const fJson = (await fRes.json()) as { calendar?: { title?: string }; fields: FieldDto[] };
      const sJson = (await sRes.json()) as { slots: SlotDto[] };
      setCalTitle(fJson.calendar?.title ?? '');
      setFields((fJson.fields ?? []).filter((x) => x.type !== 'file'));
      setSlots(sJson.slots ?? []);
      setSlotId(null);
      setForm({});
      setCancelUrl(null);
      setStep('slots');
      setFilterDayYmd(null);
      setDayPage(0);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [calendarSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (step !== 'success') return;
    if (onBookingSuccess) return;
    const t = window.setTimeout(() => onClose(), 14000);
    return () => window.clearTimeout(t);
  }, [step, onClose, onBookingSuccess]);

  const datesWithSlots = useMemo(() => {
    const s = new Set<string>();
    for (const x of slots) s.add(x.slotDate);
    return s;
  }, [slots]);

  const sortedDates = useMemo(() => [...datesWithSlots].sort(), [datesWithSlots]);

  const totalPages = Math.max(1, Math.ceil(sortedDates.length / DAYS_PER_PAGE));

  useEffect(() => {
    if (dayPage > 0 && dayPage >= totalPages) setDayPage(Math.max(0, totalPages - 1));
  }, [dayPage, totalPages]);

  const visibleDates = useMemo(() => {
    if (filterDayYmd && datesWithSlots.has(filterDayYmd)) return [filterDayYmd];
    const start = dayPage * DAYS_PER_PAGE;
    return sortedDates.slice(start, start + DAYS_PER_PAGE);
  }, [sortedDates, filterDayYmd, datesWithSlots, dayPage]);

  const slotsByYmd = useMemo(() => {
    const m = new Map<string, SlotDto[]>();
    for (const s of slots) {
      const prev = m.get(s.slotDate) ?? [];
      prev.push(s);
      m.set(s.slotDate, prev);
    }
    for (const [, list] of m) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return m;
  }, [slots]);

  const picked = slots.find((s) => s.id === slotId);

  const setField = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }));
  const setFileField = (key: string, file: File | undefined) =>
    setFiles((prev) => ({ ...prev, [key]: file }));

  const quickBook = useCallback(
    async (pickedSlotId: string) => {
      setBusy(true);
      setErr(null);
      try {
        const fd = new FormData();
        fd.append('slotId', pickedSlotId);
        fd.append('fields', '{}');
        const path = bookUrl ?? '/agenda/book-form';
        const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
        const headers: HeadersInit = {};
        if (authToken) headers.Authorization = `Bearer ${authToken}`;
        const res = await fetch(url, { method: 'POST', headers, body: fd });
        const text = await res.text();
        if (!res.ok) {
          let msg = text || res.statusText;
          try {
            const j = JSON.parse(text) as { message?: string | string[] };
            if (Array.isArray(j.message)) msg = j.message.join(', ');
            else if (j.message) msg = String(j.message);
          } catch {
            /**/
          }
          throw new Error(msg);
        }
        if (onBookingSuccess) {
          await Promise.resolve(onBookingSuccess());
          await loadData();
          return;
        }
        setStep('success');
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : 'Boeken mislukt');
      } finally {
        setBusy(false);
      }
    },
    [authToken, bookUrl, loadData, onBookingSuccess],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotId) return;
    setBusy(true);
    setErr(null);
    try {
      const fileKeys = fields.filter((x) => x.type === 'file').map((x) => x.fieldKey);
      const textPayload = { ...form };
      for (const k of fileKeys) delete textPayload[k];
      const fd = new FormData();
      fd.append('slotId', slotId);
      fd.append('fields', JSON.stringify(textPayload));
      for (const k of fileKeys) {
        const fl = files[k];
        if (fl) fd.append(k, fl);
      }
      const path = bookUrl ?? '/agenda/book-form';
      const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
      const headers: HeadersInit = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: fd,
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text || res.statusText;
        try {
          const j = JSON.parse(text) as { message?: string | string[] };
          if (Array.isArray(j.message)) msg = j.message.join(', ');
          else if (j.message) msg = String(j.message);
        } catch {
          /**/
        }
        throw new Error(msg);
      }
      try {
        const j = JSON.parse(text) as { cancelUrl?: string };
        setCancelUrl(j.cancelUrl ?? null);
      } catch {
        setCancelUrl(null);
      }
      if (onBookingSuccess) {
        await Promise.resolve(onBookingSuccess());
        setStep('slots');
        setSlotId(null);
        setForm({});
        setFiles({});
        await loadData();
        return;
      }
      setStep('success');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Boeken mislukt');
    } finally {
      setBusy(false);
    }
  };

  const renderField = (f: FieldDto) => {
    const ph = f.titlePosition === 'inside' ? f.label : (f.placeholder ?? '');
    const labelAbove = f.titlePosition !== 'inside' && f.type !== 'checkbox';
    const common =
      'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400';

    return (
      <div key={f.fieldKey} className={f.width === '1' ? 'sm:col-span-2' : ''}>
        {labelAbove ? (
          <label className="mb-1 block text-xs font-medium text-zinc-700">
            {f.label}
            {f.required ? <span className="text-burgundy"> *</span> : null}
          </label>
        ) : null}
        {f.type === 'textarea' ? (
          <textarea
            className={`${common} min-h-[88px]`}
            placeholder={ph}
            required={f.required}
            value={form[f.fieldKey] ?? ''}
            onChange={(ev) => setField(f.fieldKey, ev.target.value)}
          />
        ) : null}
        {f.type === 'select' ? (
          <select
            className={common}
            required={f.required}
            value={form[f.fieldKey] ?? ''}
            onChange={(ev) => setField(f.fieldKey, ev.target.value)}
          >
            <option value="">{ph || 'Kies'}</option>
            {(f.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : null}
        {f.type === 'checkbox' ? (
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={form[f.fieldKey] === '1'}
              onChange={(ev) => setField(f.fieldKey, ev.target.checked ? '1' : '')}
            />
            {f.label}
            {f.required ? <span className="text-burgundy"> *</span> : null}
          </label>
        ) : null}
        {f.type === 'file' ? (
          <input
            type="file"
            accept="image/*"
            className={`${common} py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1`}
            required={f.required}
            onChange={(ev) => setFileField(f.fieldKey, ev.target.files?.[0])}
          />
        ) : null}
        {!['textarea', 'select', 'checkbox', 'file'].includes(f.type) ? (
          <input
            type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'date' ? 'date' : 'text'}
            className={common}
            placeholder={ph}
            required={f.required}
            value={form[f.fieldKey] ?? ''}
            onChange={(ev) => setField(f.fieldKey, ev.target.value)}
          />
        ) : null}
      </div>
    );
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-zinc-500">Bezig met laden…</div>
    );
  }

  if (step === 'success') {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-zinc-200 bg-white px-5 py-6 text-center shadow-sm">
          <p className="text-base font-semibold tracking-tight text-zinc-900">Inschrijving is gelukt</p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            U ontvangt een SMS en een mail ter bevestiging van uw afspraak.
          </p>
          {cancelUrl ? (
            <p className="mt-4 text-left text-xs text-zinc-500">
              Annuleren kan via de link in uw mail.{' '}
              <Link href={cancelUrl} className="font-medium text-burgundy underline underline-offset-2">
                Direct annuleren
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Terug naar de pagina
          </button>
        </div>
        <p className="text-center text-[11px] text-zinc-400">Dit scherm sluit automatisch binnen enkele seconden.</p>
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">Er zijn nog geen vrije momenten voor deze dienst.</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Terug
        </button>
      </div>
    );
  }

  if (variant !== 'pro') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{heading}</p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-ink">
              {step === 'slots' ? 'Kies een moment' : 'Uw gegevens'}
              {calTitle ? <span className="block text-sm font-normal text-muted">{calTitle}</span> : null}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm font-medium text-burgundy underline underline-offset-2 hover:text-burgundyDeep"
          >
            Annuleren
          </button>
        </div>
        {err ? (
          <div className="rounded-cm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{err}</div>
        ) : null}
        {step === 'slots' ? (
          <div className="max-h-[min(420px,55vh)] space-y-4 overflow-y-auto pr-1">
            {sortedDates.map((ymd) => (
              <div key={ymd}>
                <p className="text-xs font-semibold capitalize text-ink">
                  {new Intl.DateTimeFormat('nl-BE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  }).format(new Date(`${ymd}T12:00:00`))}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(slotsByYmd.get(ymd) ?? []).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="rounded-full border border-line bg-panel px-3 py-2 text-xs font-medium text-ink transition hover:border-burgundy hover:bg-burgundy/5"
                      onClick={() => {
                        setSlotId(s.id);
                        setStep('form');
                        setErr(null);
                      }}
                    >
                      {s.startTime} – {s.endTime}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 rounded-cm bg-panel px-3 py-2 text-xs">
              <span className="font-medium text-ink">Gekozen:</span>
              <span>
                {picked?.slotDate} om {picked?.startTime}
              </span>
              <button
                type="button"
                className="ml-auto text-burgundy underline underline-offset-2 hover:text-burgundyDeep"
                onClick={() => {
                  setStep('slots');
                  setSlotId(null);
                  setErr(null);
                }}
              >
                Ander moment
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{fields.map(renderField)}</div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-cm bg-burgundy py-3 text-sm font-semibold text-white shadow-sm hover:bg-burgundyDeep disabled:opacity-55"
            >
              {busy ? 'Bezig…' : 'Afspraak bevestigen'}
            </button>
          </form>
        )}
      </div>
    );
  }

  const calendarBlock = (
    <div className="flex w-full shrink-0 flex-col border-b border-zinc-200 pb-4 lg:w-[32%] lg:border-b-0 lg:border-r lg:pr-4 lg:pb-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Vorige maand"
          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
          onClick={() => shiftMonth(-1)}
        >
          ‹
        </button>
        <span className="text-center text-xs font-semibold capitalize text-zinc-800">
          {new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' }).format(
            new Date(viewYear, viewMonth - 1, 1),
          )}
        </span>
        <button
          type="button"
          aria-label="Volgende maand"
          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
          onClick={() => shiftMonth(1)}
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-[10px] font-medium text-zinc-500">
        {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((d) => (
          <div key={d} className="text-center py-0.5">
            {d}
          </div>
        ))}
        {monthMatrix(viewYear, viewMonth).map((row, ri) => (
          <FragmentRow
            key={ri}
            row={row}
            datesWithSlots={datesWithSlots}
            filterDayYmd={filterDayYmd}
            selectDay={(ymd) => {
              setFilterDayYmd(ymd);
              setDayPage(0);
            }}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-zinc-500">
        <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500 align-middle" aria-hidden /> Groen = nog
        vrije momenten. Tik op een dag om enkel die datum te tonen.
      </p>
      {filterDayYmd ? (
        <button
          type="button"
          className="mt-2 text-left text-[11px] font-medium text-burgundy underline"
          onClick={() => {
            setFilterDayYmd(null);
            setDayPage(0);
          }}
        >
          Alle beschikbare dagen tonen
        </button>
      ) : null}
    </div>
  );

  const slotsBlock =
    step === 'slots' ? (
      <div className="min-h-0 min-w-0 flex-1">
        <div className="flex max-h-[min(480px,58vh)] flex-col overflow-hidden">
          {!filterDayYmd && sortedDates.length > DAYS_PER_PAGE ? (
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Vorige dagen"
                disabled={dayPage <= 0}
                className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-35"
                onClick={() => setDayPage((p) => Math.max(0, p - 1))}
              >
                ‹ Vorige
              </button>
              <span className="text-center text-[11px] text-zinc-500">
                {sortedDates.length
                  ? `Dag ${dayPage * DAYS_PER_PAGE + 1}–${Math.min(sortedDates.length, (dayPage + 1) * DAYS_PER_PAGE)} van ${sortedDates.length}`
                  : ''}
              </span>
              <button
                type="button"
                aria-label="Volgende dagen"
                disabled={dayPage >= totalPages - 1}
                className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-35"
                onClick={() => setDayPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Volgende ›
              </button>
            </div>
          ) : null}
          <div
            className="grid flex-1 gap-1.5 overflow-hidden pb-1"
            style={
              visibleDates.length
                ? { gridTemplateColumns: `repeat(${visibleDates.length}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {visibleDates.map((ymd) => (
              <div key={ymd} className="min-w-0 text-center">
                <div className="rounded-t-md bg-zinc-900 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {colHeader(ymd)}
                </div>
                <div className="space-y-1.5 rounded-b-md border border-t-0 border-zinc-200 bg-zinc-50/80 p-1.5">
                  {(slotsByYmd.get(ymd) ?? []).map((s) => {
                    const sel = slotId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (autoBookOnPick) {
                            void quickBook(s.id);
                            return;
                          }
                          setSlotId(s.id);
                          setStep('form');
                          setErr(null);
                        }}
                        className={[
                          'flex w-full min-w-0 items-center gap-2 rounded-md border bg-white px-2 py-1.5 text-left text-xs font-medium transition',
                          sel
                            ? 'border-zinc-900 ring-1 ring-zinc-900'
                            : 'border-zinc-200 hover:border-zinc-400',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'flex h-3.5 w-3.5 shrink-0 rounded-full border',
                            sel ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300',
                          ].join(' ')}
                          aria-hidden
                        />
                        <span className="tabular-nums text-zinc-900">
                          {s.startTime} – {s.endTime}
                          {typeof s.remaining === 'number' && s.remaining > 1 ? (
                            <span className="ml-1 text-[10px] font-normal text-zinc-500"> ({s.remaining})</span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <form
        id="guest-pro-booking-form"
        onSubmit={submit}
        className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto pr-0.5"
      >
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          <span className="font-medium">Gekozen:</span>
          <span className="tabular-nums">
            {picked?.slotDate} {picked ? `${picked.startTime} – ${picked.endTime}` : ''}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{fields.map(renderField)}</div>
      </form>
    );

  const footer = (
    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
      <button
        type="button"
        onClick={() => {
          if (step === 'form') {
            setStep('slots');
            setErr(null);
          } else {
            onClose();
          }
        }}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        {step === 'form' ? 'Terug' : 'Annuleren'}
      </button>
      <div className="flex gap-2">
        {step === 'form' ? (
          <button
            type="submit"
            form="guest-pro-booking-form"
            disabled={busy}
            className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? 'Bezig…' : 'Bevestigen'}
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[min(520px,62vh)] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{heading}</p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-zinc-900">
            {step === 'slots' ? 'Online afspraak' : 'Uw gegevens'}
            {calTitle ? <span className="mt-0.5 block text-xs font-normal text-zinc-500">{calTitle}</span> : null}
          </h2>
        </div>
      </div>

      {err ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</div>
      ) : null}

      <div className={`flex min-h-0 flex-1 flex-col gap-4 ${hideLeftCalendar ? '' : 'lg:flex-row'}`}>
        {!hideLeftCalendar ? calendarBlock : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{slotsBlock}</div>
      </div>

      {footer}
    </div>
  );
}

/** Rij in maandraster (Fragment vermijdt extra DOM bij map). */
function FragmentRow({
  row,
  datesWithSlots,
  filterDayYmd,
  selectDay,
}: {
  row: ({ ymd: string; inMonth: boolean; dayNum: number } | null)[];
  datesWithSlots: Set<string>;
  filterDayYmd: string | null;
  selectDay: (ymd: string) => void;
}) {
  return (
    <>
      {row.map((cell, i) => {
        if (!cell) {
          return <div key={`e-${i}`} className="aspect-square max-h-8" />;
        }
        const has = datesWithSlots.has(cell.ymd);
        const sel = filterDayYmd === cell.ymd;
        return (
          <button
            key={cell.ymd}
            type="button"
            disabled={!has}
            onClick={() => has && selectDay(cell.ymd)}
            className={[
              'aspect-square max-h-8 rounded text-[10px] font-medium transition',
              !has
                ? 'text-zinc-300'
                : sel
                  ? 'bg-emerald-600 text-white ring-1 ring-zinc-900'
                  : 'bg-emerald-500/20 text-emerald-900 ring-1 ring-emerald-600/40 hover:bg-emerald-500/30',
            ].join(' ')}
          >
            {cell.dayNum}
          </button>
        );
      })}
    </>
  );
}
