'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { getApiBase } from '@/lib/api';
import {
  GUEST_INTAKE_OPTIONAL_FIELD_KEYS,
  GUEST_MINOR_PARENT_FIELD_KEYS,
  isGuestIntakeCalendarSlug,
  isMinorFromIsoDateString,
} from '@/lib/agenda-guest-intake';

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

function fieldEffectiveRequired(strictGuestForm: boolean, f: FieldDto): boolean {
  if (!strictGuestForm) return f.required;
  if (f.type === 'file') return false;
  if (GUEST_INTAKE_OPTIONAL_FIELD_KEYS.has(f.fieldKey)) return false;
  return true;
}

const WEEKDAY_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'] as const;
/** Max. dagen per pagina; bij meer dagen: Vorige/Volgende onder de kolommen. */
const DAYS_PER_PAGE = 4;

function colHeader(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  const wd = WEEKDAY_SHORT[dt.getDay()];
  return `${wd} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

export function GuestBookingPanel({
  calendarSlug,
  heading,
  onClose,
  variant = 'default',
  authToken,
  bookUrl,
  onBookingSuccess,
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
  /** Eén klik boeken zonder formulier (opleiding). */
  autoBookOnPick?: boolean;
}) {
  const [step, setStep] = useState<Step>('slots');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [calTitle, setCalTitle] = useState('');
  const [fields, setFields] = useState<FieldDto[]>([]);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [showEndTimeOnPublic, setShowEndTimeOnPublic] = useState(true);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [cancelUrl, setCancelUrl] = useState<string | null>(null);

  /** Pagina voor pro-kolomweergave (0 = eerste 4 datums met sloten). */
  const [dayPage, setDayPage] = useState(0);

  const loadData = useCallback(async () => {
    const base = getApiBase();
    setLoading(true);
    setErr(null);
    try {
      const fromD = new Date();
      const toD = new Date(fromD);
      toD.setDate(toD.getDate() + 45);
      const q = `from=${encodeURIComponent(ymdLocal(fromD))}&to=${encodeURIComponent(ymdLocal(toD))}`;
      const [fRes, sRes] = await Promise.all([
        fetch(`${base}/agenda/fields/${encodeURIComponent(calendarSlug)}`),
        fetch(`${base}/agenda/slots/${encodeURIComponent(calendarSlug)}?${q}`),
      ]);
      if (!fRes.ok) throw new Error('Kon agenda niet laden');
      if (!sRes.ok) throw new Error('Kon momenten niet laden');
      const fJson = (await fRes.json()) as {
        calendar?: { title?: string; showEndTimeOnPublic?: boolean };
        fields: FieldDto[];
      };
      const sJson = (await sRes.json()) as {
        slots: SlotDto[];
        calendar?: { showEndTimeOnPublic?: boolean };
      };
      setCalTitle(fJson.calendar?.title ?? '');
      setFields(fJson.fields ?? []);
      setSlots(sJson.slots ?? []);
      const endVis = sJson.calendar?.showEndTimeOnPublic ?? fJson.calendar?.showEndTimeOnPublic;
      setShowEndTimeOnPublic(endVis !== false);
      setSlotId(null);
      setForm({});
      setCancelUrl(null);
      setStep('slots');
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

  const sortedDates = useMemo(() => {
    const s = new Set<string>();
    for (const x of slots) s.add(x.slotDate);
    return [...s].sort();
  }, [slots]);

  const totalPages = Math.max(1, Math.ceil(sortedDates.length / DAYS_PER_PAGE));

  useEffect(() => {
    if (dayPage > 0 && dayPage >= totalPages) setDayPage(Math.max(0, totalPages - 1));
  }, [dayPage, totalPages]);

  /** Bij ≤4 dagen: alles tonen; bij >4: pagina van 4. */
  const visibleDates = useMemo(() => {
    if (sortedDates.length <= DAYS_PER_PAGE) return sortedDates;
    const start = dayPage * DAYS_PER_PAGE;
    return sortedDates.slice(start, start + DAYS_PER_PAGE);
  }, [sortedDates, dayPage]);

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

  /** 1→100%, 2→50%, 3→33%, 4→25% (minmax zodat kolommen volle breedte delen). */
  const dayGridStyle = useMemo((): CSSProperties => {
    const n = visibleDates.length;
    const cols = Math.min(Math.max(n, 1), 4);
    return { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
  }, [visibleDates.length]);

  const picked = slots.find((s) => s.id === slotId);

  const strictGuestForm = !authToken && isGuestIntakeCalendarSlug(calendarSlug);
  const showMinorGuard =
    strictGuestForm && isMinorFromIsoDateString((form.geboortedatum ?? '').trim());

  const displayFields = useMemo(
    () => (!authToken ? fields.filter((f) => f.type !== 'file') : fields),
    [authToken, fields],
  );

  const showDatePager = sortedDates.length > DAYS_PER_PAGE;

  const datePager = showDatePager ? (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-200/80 pt-3">
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
  ) : null;

  const slotTimeLabel = (s: SlotDto) =>
    showEndTimeOnPublic ? `${s.startTime} – ${s.endTime}` : s.startTime;

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
    if (strictGuestForm) {
      for (const f of displayFields) {
        const req = fieldEffectiveRequired(strictGuestForm, f);
        if (!req) continue;
        if (f.type === 'file') continue;
        if (f.type === 'checkbox') {
          if (form[f.fieldKey] !== '1') {
            setErr(`Vink "${f.label}" aan.`);
            return;
          }
          continue;
        }
        const v = (form[f.fieldKey] ?? '').trim();
        if (!v) {
          setErr(`Vul "${f.label}" in.`);
          return;
        }
      }
      if (isMinorFromIsoDateString((form.geboortedatum ?? '').trim())) {
        if (!(form[GUEST_MINOR_PARENT_FIELD_KEYS.name] ?? '').trim()) {
          setErr('Vul de naam van ouder of begeleider in.');
          return;
        }
        if (!(form[GUEST_MINOR_PARENT_FIELD_KEYS.phone] ?? '').trim()) {
          setErr('Vul het GSM-nummer van ouder of begeleider in.');
          return;
        }
      }
    }
    setBusy(true);
    setErr(null);
    try {
      const fileKeys = displayFields.filter((x) => x.type === 'file').map((x) => x.fieldKey);
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
    const req = fieldEffectiveRequired(strictGuestForm, f);
    const ph = f.titlePosition === 'inside' ? f.label : (f.placeholder ?? '');
    const labelAbove = f.titlePosition !== 'inside' && f.type !== 'checkbox';
    const common =
      'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400';

    return (
      <div key={f.fieldKey} className={f.width === '1' ? 'sm:col-span-2' : ''}>
        {labelAbove ? (
          <label className="mb-1 block text-xs font-medium text-zinc-700">
            {f.label}
            {req ? <span className="text-burgundy"> *</span> : null}
          </label>
        ) : null}
        {f.type === 'textarea' ? (
          <textarea
            className={`${common} min-h-[88px]`}
            placeholder={ph}
            required={req}
            value={form[f.fieldKey] ?? ''}
            onChange={(ev) => setField(f.fieldKey, ev.target.value)}
          />
        ) : null}
        {f.type === 'select' ? (
          <select
            className={common}
            required={req}
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
            {req ? <span className="text-burgundy"> *</span> : null}
          </label>
        ) : null}
        {f.type === 'file' ? (
          <input
            type="file"
            accept="image/*"
            className={`${common} py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1`}
            required={req}
            onChange={(ev) => setFileField(f.fieldKey, ev.target.files?.[0])}
          />
        ) : null}
        {!['textarea', 'select', 'checkbox', 'file'].includes(f.type) ? (
          <input
            type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'date' ? 'date' : 'text'}
            className={common}
            placeholder={ph}
            required={req}
            value={form[f.fieldKey] ?? ''}
            onChange={(ev) => setField(f.fieldKey, ev.target.value)}
          />
        ) : null}
      </div>
    );
  };

  const minorGuardBlock =
    showMinorGuard ? (
      <div
        key="minor-guard"
        className="sm:col-span-2 rounded-cm border border-amber-200 bg-amber-50/90 px-3 py-3 text-sm text-zinc-800"
      >
        <p className="font-semibold text-zinc-900">Minderjarig</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-700">
          U bent minderjarig. U bent verplicht iemand van uw ouders (of wettelijke begeleider) mee te brengen naar de
          afspraak. Vul hieronder de gegevens van de ouder of begeleider in.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Naam ouder of begeleider (moeder/vader){' '}
              <span className="text-burgundy">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
              value={form[GUEST_MINOR_PARENT_FIELD_KEYS.name] ?? ''}
              onChange={(ev) => setField(GUEST_MINOR_PARENT_FIELD_KEYS.name, ev.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              GSM ouder of begeleider <span className="text-burgundy">*</span>
            </label>
            <input
              type="tel"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
              value={form[GUEST_MINOR_PARENT_FIELD_KEYS.phone] ?? ''}
              onChange={(ev) => setField(GUEST_MINOR_PARENT_FIELD_KEYS.phone, ev.target.value)}
              required
            />
          </div>
        </div>
      </div>
    ) : null;

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
          <div className="space-y-3">
            <div className="max-h-[min(520px,62vh)] overflow-y-auto pr-1">
              <div className="grid w-full gap-4" style={dayGridStyle}>
                {visibleDates.map((ymd) => (
                  <div key={ymd} className="min-w-0">
                    <p className="text-xs font-semibold capitalize text-ink">
                      {new Intl.DateTimeFormat('nl-BE', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      }).format(new Date(`${ymd}T12:00:00`))}
                    </p>
                    <div className="mt-2 flex max-h-[min(460px,50vh)] flex-col gap-1.5 overflow-y-auto pr-0.5">
                      {(slotsByYmd.get(ymd) ?? []).map((s) => {
                        const sel = slotId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={[
                              'flex w-full min-w-0 items-center gap-2 rounded-md border bg-panel px-3 py-2 text-left text-xs font-medium tabular-nums transition',
                              sel ? 'border-burgundy ring-1 ring-burgundy' : 'border-line hover:border-burgundy/45',
                            ].join(' ')}
                            onClick={() => {
                              if (autoBookOnPick) {
                                void quickBook(s.id);
                                return;
                              }
                              setSlotId(s.id);
                              setStep('form');
                              setErr(null);
                            }}
                          >
                            <span
                              className={[
                                'flex h-3.5 w-3.5 shrink-0 rounded-full border',
                                sel ? 'border-burgundy bg-burgundy' : 'border-zinc-300',
                              ].join(' ')}
                              aria-hidden
                            />
                            <span className="text-ink">
                              {slotTimeLabel(s)}
                              {typeof s.remaining === 'number' && s.remaining > 1 ? (
                                <span className="ml-1 text-[10px] font-normal text-muted"> ({s.remaining} vrij)</span>
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
            {datePager}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 rounded-cm bg-panel px-3 py-2 text-xs">
              <span className="font-medium text-ink">Gekozen:</span>
              <span>
                {picked?.slotDate}
                {picked ? ` · ${slotTimeLabel(picked)}` : ''}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {displayFields.map(renderField)}
              {minorGuardBlock}
            </div>
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

  const slotsBlock =
    step === 'slots' ? (
      <div className="min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 max-h-[min(520px,62vh)] flex-1 flex-col">
          <div className="grid min-h-0 w-full min-w-0 flex-1 gap-1.5 pb-1" style={dayGridStyle}>
            {visibleDates.map((ymd) => (
              <div key={ymd} className="flex min-h-0 min-w-0 flex-col text-center">
                <div className="shrink-0 rounded-t-md bg-zinc-900 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {colHeader(ymd)}
                </div>
                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-b-md border border-t-0 border-zinc-200 bg-zinc-50/80 p-1.5">
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
                          {slotTimeLabel(s)}
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
          {datePager}
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
            {picked?.slotDate} {picked ? slotTimeLabel(picked) : ''}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {displayFields.map(renderField)}
          {minorGuardBlock}
        </div>
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

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{slotsBlock}</div>
      </div>

      {footer}
    </div>
  );
}
