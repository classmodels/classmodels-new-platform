'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { getApiBase } from '@/lib/api';
import {
  GUEST_MINOR_PARENT_FIELD_KEYS,
  GUEST_MINOR_WITH_OPTIONS,
  isGuestBookingOptionalFieldKey,
  isGuestIntakeCalendarSlug,
  isMinorFromIsoDateString,
  validateGuestMinorParentFieldsClient,
} from '@/lib/agenda-guest-intake';
import { ymdEuropeBrussels } from '@/lib/agenda-brussels';
import { CLASS_MODELS_OFFICE, GUEST_APPOINTMENT_OFFICE_LINE } from '@/lib/class-models-office';
import { CmProgressOverlay } from '@/components/CmProgressOverlay';
import { uploadWithProgress, formatEtaSeconds } from '@/lib/upload-with-progress';
import { useIsMobile } from '@/lib/use-is-mobile';
import { NieuwAlertDialog } from '@/components/nieuw/NieuwAlertDialog';
import {
  agendaFieldDisplayLabel,
  agendaFieldPlaceholder,
  agendaMobileError,
  applyBirthDateMaskInput,
  birthDateFieldDisplay,
  isBirthDateFieldKey,
  isBirthDateInputEmpty,
  normalizeAgendaMobileNational,
  normalizeIsoBirthDateClient,
  resolveAgendaBookPath,
} from '@/lib/agenda-phone';

function ymdLocal(d: Date): string {
  return ymdEuropeBrussels(d);
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

type TravelInfo = {
  distanceKm: number;
  durationMinutes: number;
  distanceLabel: string;
  mapsDirectionsUrl: string;
  mapsEmbedUrl: string;
  visitorAddress: string;
};

type BookNotifications = {
  emailSent?: boolean;
  smsSent?: boolean;
  emailError?: string;
};

function parseBookResponse(text: string): {
  cancelUrl?: string;
  travel?: TravelInfo;
  officeAddress?: string;
  notifications?: BookNotifications;
} {
  try {
    const j = JSON.parse(text) as {
      cancelUrl?: string;
      officeAddress?: string;
      travel?: TravelInfo;
      notifications?: BookNotifications;
    };
    return {
      cancelUrl: j.cancelUrl,
      travel: j.travel,
      officeAddress: j.officeAddress,
      notifications: j.notifications,
    };
  } catch {
    return {};
  }
}

function fieldEffectiveRequired(guestWebBooking: boolean, f: FieldDto): boolean {
  if (!guestWebBooking) return f.required;
  if (isGuestBookingOptionalFieldKey(f.fieldKey, f.type)) return false;
  return true;
}

const WEEKDAY_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'] as const;
/** Max. dagen per pagina op de pc; op de gsm 2 dagen met alle uren onder elkaar. */
const DAYS_PER_PAGE_DESKTOP = 4;
const DAYS_PER_PAGE_MOBILE = 2;

function colHeader(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  const wd = WEEKDAY_SHORT[dt.getDay()];
  return `${wd} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

export function GuestBookingPanel({
  calendarSlug,
  heading: _heading,
  onClose,
  variant = 'default',
  authToken,
  bookUrl,
  onBookingSuccess,
  autoBookOnPick = false,
  showOccupiedSlots = false,
  hideSlotTitle = false,
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
  /** Volle sloten tonen als «Bezet» (portfolio). */
  showOccupiedSlots?: boolean;
  /** Titel staat buiten het kader (gasten-agenda’s). */
  hideSlotTitle?: boolean;
}) {
  const isMobile = useIsMobile() === true;
  const daysPerPage = isMobile ? DAYS_PER_PAGE_MOBILE : DAYS_PER_PAGE_DESKTOP;

  const [step, setStep] = useState<Step>('slots');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{
    title?: string;
    message?: string;
    items?: string[];
  } | null>(null);
  const [fields, setFields] = useState<FieldDto[]>([]);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [showEndTimeOnPublic, setShowEndTimeOnPublic] = useState(false);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; sublabel: string } | null>(null);
  const [cancelUrl, setCancelUrl] = useState<string | null>(null);
  const [travelInfo, setTravelInfo] = useState<TravelInfo | null>(null);
  const [bookNotifications, setBookNotifications] = useState<BookNotifications | null>(null);

  /** Pagina voor pro-kolomweergave (0 = eerste 4 datums met sloten). */
  const [dayPage, setDayPage] = useState(0);

  const showAlert = useCallback(
    (opts: { title?: string; message?: string; items?: string[] } | string) => {
      if (typeof opts === 'string') {
        setAlert({ title: 'Let op', message: opts });
        return;
      }
      setAlert({
        title: opts.title ?? 'Nog even aanvullen',
        message: opts.message,
        items: opts.items,
      });
    },
    [],
  );

  const loadData = useCallback(async () => {
    const base = getApiBase();
    setLoading(true);
    setAlert(null);
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
        openDates?: string[];
        calendar?: { showEndTimeOnPublic?: boolean };
      };
      setFields(fJson.fields ?? []);
      setSlots(sJson.slots ?? []);
      setOpenDates(sJson.openDates ?? []);
      const endVis = sJson.calendar?.showEndTimeOnPublic ?? fJson.calendar?.showEndTimeOnPublic;
      setShowEndTimeOnPublic(endVis === true);
      setSlotId(null);
      setForm({});
      setCancelUrl(null);
      setStep('slots');
      // Alleen dagen met boekbare (of bezette) sloten in de pager — geen lege “open” dagen.
      const bookableDates = [
        ...new Set((sJson.slots ?? []).map((s) => s.slotDate)),
      ].sort();
      const todayYmd = ymdEuropeBrussels(new Date());
      let startIdx = bookableDates.findIndex((d) => d >= todayYmd);
      if (startIdx < 0) startIdx = 0;
      if (bookableDates.length > daysPerPage) {
        setDayPage(Math.floor(startIdx / daysPerPage));
      } else {
        setDayPage(0);
      }
    } catch (e: unknown) {
      showAlert(e instanceof Error ? e.message : 'Laden mislukt');
      setSlots([]);
      setOpenDates([]);
    } finally {
      setLoading(false);
    }
  }, [calendarSlug, daysPerPage, showAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedDates = useMemo(() => {
    // Alleen dagen met zichtbare sloten (vrij of bezet) — zo geen “open dag” zonder klikbare uren.
    return [...new Set(slots.map((s) => s.slotDate))].sort();
  }, [slots]);

  const totalPages = Math.max(1, Math.ceil(sortedDates.length / daysPerPage));

  useEffect(() => {
    if (dayPage > 0 && dayPage >= totalPages) setDayPage(Math.max(0, totalPages - 1));
  }, [dayPage, totalPages]);

  /** Bij weinig dagen: alles tonen; anders paginas van `daysPerPage`. */
  const visibleDates = useMemo(() => {
    if (sortedDates.length <= daysPerPage) return sortedDates;
    const start = dayPage * daysPerPage;
    return sortedDates.slice(start, start + daysPerPage);
  }, [sortedDates, dayPage, daysPerPage]);

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

  const guestWebBooking = !authToken;
  const strictGuestForm = guestWebBooking && isGuestIntakeCalendarSlug(calendarSlug);
  const showGuestOffice = guestWebBooking && isGuestIntakeCalendarSlug(calendarSlug);
  const showMinorGuard =
    strictGuestForm && isMinorFromIsoDateString((form.geboortedatum ?? '').trim());

  const displayFields = useMemo(() => fields, [fields]);

  const showDatePager = sortedDates.length > daysPerPage;

  const datePager = showDatePager ? (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-200/80 pt-3">
      <button
        type="button"
        aria-label="Vorige dagen"
        disabled={dayPage <= 0}
        className="rounded border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-35"
        onClick={() => setDayPage((p) => Math.max(0, p - 1))}
      >
        ‹ Vorige dagen
      </button>
      <span className="min-w-0 flex-1 px-2 text-center text-[11px] leading-snug text-zinc-500">
        {sortedDates.length
          ? `Andere dagen bekijken · dag ${dayPage * daysPerPage + 1}–${Math.min(sortedDates.length, (dayPage + 1) * daysPerPage)} van ${sortedDates.length}`
          : ''}
      </span>
      <button
        type="button"
        aria-label="Volgende dagen"
        disabled={dayPage >= totalPages - 1}
        className="rounded border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-35"
        onClick={() => setDayPage((p) => Math.min(totalPages - 1, p + 1))}
      >
        Volgende dagen ›
      </button>
    </div>
  ) : null;

  /**
   * Gsm: duidelijke navigatie BOVEN de kalender — "Bekijk volgende dagen →"
   * zodat meteen duidelijk is dat er meer dagen zijn dan de twee zichtbare.
   */
  const topDatePager = showDatePager ? (
    <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
      <button
        type="button"
        aria-label="Vorige dagen"
        disabled={dayPage <= 0}
        className="rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-35"
        onClick={() => setDayPage((p) => Math.max(0, p - 1))}
      >
        ‹ Vorige
      </button>
      <button
        type="button"
        aria-label="Bekijk volgende dagen"
        disabled={dayPage >= totalPages - 1}
        className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-35"
        onClick={() => setDayPage((p) => Math.min(totalPages - 1, p + 1))}
      >
        Bekijk volgende dagen <span aria-hidden className="text-sm leading-none">→</span>
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
      setAlert(null);
      setSlotId(pickedSlotId);
      try {
        const fd = new FormData();
        fd.append('slotId', pickedSlotId);
        fd.append('fields', '{}');
        const path = resolveAgendaBookPath(bookUrl, authToken);
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
        const parsed = parseBookResponse(text);
        if (parsed.cancelUrl) setCancelUrl(parsed.cancelUrl);
        setTravelInfo(parsed.travel ?? null);
        setBookNotifications(parsed.notifications ?? null);
        if (onBookingSuccess) {
          // UI is al aangevinkt; refresh op de achtergrond.
          void Promise.resolve(onBookingSuccess()).then(() => loadData());
          return;
        }
        setStep('success');
      } catch (e: unknown) {
        showAlert({ title: 'Boeken mislukt', message: e instanceof Error ? e.message : 'Boeken mislukt' });
        setSlotId(null);
      } finally {
        setBusy(false);
      }
    },
    [authToken, bookUrl, loadData, onBookingSuccess, showAlert],
  );

  const isSlotOccupied = (s: SlotDto) =>
    showOccupiedSlots && typeof s.remaining === 'number' && s.remaining <= 0;

  const renderSlotButton = (s: SlotDto, sel: boolean, compact?: boolean) => {
    const occupied = isSlotOccupied(s);
    const pending = busy && sel;
    return (
      <button
        key={s.id}
        type="button"
        disabled={occupied || (busy && !sel)}
        aria-pressed={sel}
        className={[
          'flex w-full min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-medium tabular-nums transition',
          compact ? 'px-2 py-1.5' : '',
          occupied
            ? 'cursor-not-allowed border-red-300 bg-red-50 text-red-800'
            : sel
              ? compact
                ? 'border-zinc-900 ring-1 ring-zinc-900 bg-white'
                : 'border-burgundy ring-1 ring-burgundy bg-panel'
              : compact
                ? 'border-zinc-200 bg-white hover:border-zinc-400'
                : 'border-line bg-panel hover:border-burgundy/45',
          busy && !sel ? 'opacity-50' : '',
        ].join(' ')}
        onClick={() => {
          if (occupied || busy) return;
          if (autoBookOnPick) {
            void quickBook(s.id);
            return;
          }
          setSlotId(s.id);
          setStep('form');
          setAlert(null);
        }}
      >
        <span
          className={[
            'flex h-3.5 w-3.5 shrink-0 rounded-full border',
            occupied
              ? 'border-red-400 bg-red-200'
              : sel
                ? compact
                  ? 'border-zinc-900 bg-zinc-900'
                  : 'border-burgundy bg-burgundy'
                : 'border-zinc-300',
          ].join(' ')}
          aria-hidden
        />
        <span className={occupied ? 'text-red-800' : compact ? 'text-zinc-900' : 'text-ink'}>
          {occupied ? (
            <>
              {slotTimeLabel(s)} <span className="font-semibold">— Bezet</span>
            </>
          ) : (
            <>
              {slotTimeLabel(s)}
              {pending ? (
                <span className={`ml-1 text-[10px] font-normal ${compact ? 'text-zinc-500' : 'text-muted'}`}>
                  {' '}
                  (bezig…)
                </span>
              ) : null}
            </>
          )}
        </span>
      </button>
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotId) return;
    if (strictGuestForm || guestWebBooking) {
      const missing: string[] = [];
      for (const f of displayFields) {
        const req = fieldEffectiveRequired(guestWebBooking, f);
        if (!req) continue;
        if (f.type === 'file') continue;
        const label = agendaFieldDisplayLabel(f.fieldKey, f.label);
        if (f.type === 'checkbox') {
          if (form[f.fieldKey] !== '1') missing.push(`${label} (aanvinken)`);
          continue;
        }
        const v = (form[f.fieldKey] ?? '').trim();
        if (isBirthDateFieldKey(f.fieldKey) ? isBirthDateInputEmpty(v) : !v) missing.push(label);
      }

      const phoneKey =
        displayFields.find((f) => ['telefoon', 'phone', 'gsm'].includes(f.fieldKey))?.fieldKey ??
        'telefoon';
      const phoneVal = (form[phoneKey] ?? form.telefoon ?? form.phone ?? form.gsm ?? '').trim();
      const phoneErr = agendaMobileError(phoneVal, 'GSM');
      if (phoneErr) {
        if (phoneErr.includes('verplicht')) {
          if (!missing.includes('GSM')) missing.push('GSM');
        } else {
          missing.push('GSM (ongeldig nummer)');
        }
      }

      let gebNormalized: string | null = null;
      const gebRaw = (form.geboortedatum ?? '').trim();
      const gebField = displayFields.find((f) => isBirthDateFieldKey(f.fieldKey));
      const gebRequired = gebField
        ? fieldEffectiveRequired(guestWebBooking, gebField)
        : Boolean(displayFields.some((f) => f.fieldKey === 'geboortedatum' && f.required));
      if (isBirthDateInputEmpty(gebRaw) && gebRequired) {
        if (!missing.includes('Geboortedatum')) missing.push('Geboortedatum');
      } else if (!isBirthDateInputEmpty(gebRaw)) {
        gebNormalized = normalizeIsoBirthDateClient(gebRaw);
        if (!gebNormalized) {
          missing.push('Geboortedatum (ongeldige datum — bv. 15/03/1998 of 15031998)');
        } else {
          setField('geboortedatum', gebNormalized);
          if (isMinorFromIsoDateString(gebNormalized)) {
            const minorErr = validateGuestMinorParentFieldsClient({
              ...form,
              geboortedatum: gebNormalized,
            });
            if (minorErr) missing.push(minorErr);
          }
        }
      }

      if (missing.length) {
        showAlert({
          title: 'Ontbrekende gegevens',
          message: 'Gelieve de volgende gegevens nog in te vullen of te corrigeren:',
          items: missing,
        });
        return;
      }
    }
    setBusy(true);
    setAlert(null);
    try {
      const fileKeys = displayFields.filter((x) => x.type === 'file').map((x) => x.fieldKey);
      const textPayload = { ...form };
      for (const k of fileKeys) delete textPayload[k];
      const phoneKeySubmit =
        displayFields.find((f) => ['telefoon', 'phone', 'gsm'].includes(f.fieldKey))?.fieldKey ??
        'telefoon';
      if (textPayload[phoneKeySubmit] || textPayload.telefoon) {
        const raw = (textPayload[phoneKeySubmit] || textPayload.telefoon || '').trim();
        const norm = normalizeAgendaMobileNational(raw);
        if (norm) {
          textPayload[phoneKeySubmit] = norm;
          textPayload.telefoon = norm;
        }
      }
      if (textPayload.geboortedatum) {
        const geb = normalizeIsoBirthDateClient(textPayload.geboortedatum);
        if (geb) textPayload.geboortedatum = geb;
      }
      const fd = new FormData();
      fd.append('slotId', slotId);
      fd.append('fields', JSON.stringify(textPayload));
      let hasFiles = false;
      for (const k of fileKeys) {
        const fl = files[k];
        if (fl) {
          fd.append(k, fl);
          hasFiles = true;
        }
      }
      const path = resolveAgendaBookPath(bookUrl, authToken);
      const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      if (hasFiles) {
        setUploadProgress({ percent: 0, sublabel: 'Dit kan even duren — laat dit venster open.' });
      }
      let text: string;
      try {
        text = await uploadWithProgress(url, {
          headers,
          body: fd,
          onProgress: (p) => {
            if (!hasFiles) return;
            setUploadProgress({
              percent: p.percent,
              sublabel: `Dit kan even duren — nog ${formatEtaSeconds(p.etaSeconds)}.`,
            });
          },
          onUploadBytesComplete: () => {
            if (!hasFiles) return;
            setUploadProgress({
              percent: 100,
              sublabel: 'Foto ontvangen — de afspraak wordt nu vastgelegd. Dit kan even duren.',
            });
          },
        });
      } finally {
        setUploadProgress(null);
      }
      const parsed = parseBookResponse(text);
      setCancelUrl(parsed.cancelUrl ?? null);
      setTravelInfo(parsed.travel ?? null);
      setBookNotifications(parsed.notifications ?? null);
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
      showAlert({ title: 'Boeken mislukt', message: e instanceof Error ? e.message : 'Boeken mislukt' });
    } finally {
      setBusy(false);
    }
  };

  const renderField = (f: FieldDto) => {
    const req = fieldEffectiveRequired(guestWebBooking, f);
    const displayLabel = agendaFieldDisplayLabel(f.fieldKey, f.label);
    const ph =
      f.titlePosition === 'inside'
        ? displayLabel
        : agendaFieldPlaceholder(f.fieldKey, f.placeholder);
    const labelAbove = f.titlePosition !== 'inside' && f.type !== 'checkbox';
    const common =
      'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400';
    const isPhone = ['telefoon', 'phone', 'gsm'].includes(f.fieldKey);
    const isNr = f.fieldKey === 'nr' || f.fieldKey === 'huisnummer';
    const isBirth = f.type === 'date' || isBirthDateFieldKey(f.fieldKey);
    // Geen type=date (lege native picker lijkt ingevuld) en geen type=number (iPhone blokkeert /).
    const inputType =
      isBirth
        ? 'text'
        : f.type === 'email'
          ? 'email'
          : f.type === 'tel' || isPhone
            ? 'tel'
            : 'text';

    return (
      <div key={f.fieldKey} className={f.width === '1' ? 'sm:col-span-2' : ''}>
        {labelAbove ? (
          <label className="mb-1 block text-xs font-medium text-zinc-700">
            {displayLabel}
            {req ? <span className="text-burgundy"> *</span> : null}
          </label>
        ) : null}
        {f.type === 'textarea' ? (
          <textarea
            className={`${common} min-h-[88px]`}
            placeholder={ph}
            aria-required={req}
            value={form[f.fieldKey] ?? ''}
            onChange={(ev) => setField(f.fieldKey, ev.target.value)}
          />
        ) : null}
        {f.type === 'select' ? (
          <select
            className={common}
            aria-required={req}
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
              aria-required={req}
            />
            {displayLabel}
            {req ? <span className="text-burgundy"> *</span> : null}
          </label>
        ) : null}
        {f.type === 'file' ? (
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className={`${common} py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1`}
            aria-required={req}
            onChange={(ev) => setFileField(f.fieldKey, ev.target.files?.[0])}
          />
        ) : null}
        {!['textarea', 'select', 'checkbox', 'file'].includes(f.type) ? (
          <>
            <input
              type={inputType}
              inputMode={isPhone || isNr || isBirth ? 'numeric' : undefined}
              autoComplete={isPhone ? 'tel' : isNr ? 'address-line2' : isBirth ? 'bday' : undefined}
              autoCorrect={isBirth ? 'off' : undefined}
              spellCheck={isBirth ? false : undefined}
              className={common}
              placeholder={isBirth ? 'dd/mm/jjjj' : ph}
              aria-required={req}
              aria-describedby={isBirth ? `${f.fieldKey}-hint` : undefined}
              value={isBirth ? birthDateFieldDisplay(form[f.fieldKey] ?? '') : (form[f.fieldKey] ?? '')}
              onChange={(ev) =>
                setField(f.fieldKey, isBirth ? applyBirthDateMaskInput(ev.target.value) : ev.target.value)
              }
            />
            {isBirth ? (
              <p id={`${f.fieldKey}-hint`} className="mt-1 text-[11px] leading-snug text-zinc-500">
                Typ 8 cijfers — de schuine strepen staan al klaar (dd/mm/jjjj).
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    );
  };

  const minorWith = (form[GUEST_MINOR_PARENT_FIELD_KEYS.with] ?? '').trim();
  const minorBothParents = minorWith === 'allebei_ouders';

  const minorGuardBlock =
    showMinorGuard ? (
      <div
        key="minor-guard"
        className="sm:col-span-2 rounded-cm border border-amber-200 bg-amber-50/90 px-3 py-3 text-sm text-zinc-800"
      >
        <p className="font-semibold text-zinc-900">Minderjarig</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-700">
          U bent minderjarig. U bent verplicht iemand van uw ouders (of wettelijke begeleider) mee te brengen naar de
          afspraak. Geef hieronder aan met wie u komt en de contactgegevens van die ouder(s).
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Ik kom met <span className="text-burgundy">*</span>
            </label>
            <select
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
              value={form[GUEST_MINOR_PARENT_FIELD_KEYS.with] ?? ''}
              onChange={(ev) => setField(GUEST_MINOR_PARENT_FIELD_KEYS.with, ev.target.value)}
              aria-required
            >
              <option value="">— kies —</option>
              {GUEST_MINOR_WITH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {minorBothParents ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Naam vader <span className="text-burgundy">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  value={form[GUEST_MINOR_PARENT_FIELD_KEYS.fatherName] ?? ''}
                  onChange={(ev) => setField(GUEST_MINOR_PARENT_FIELD_KEYS.fatherName, ev.target.value)}
                  aria-required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  GSM vader <span className="text-burgundy">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  value={form[GUEST_MINOR_PARENT_FIELD_KEYS.fatherPhone] ?? ''}
                  onChange={(ev) => setField(GUEST_MINOR_PARENT_FIELD_KEYS.fatherPhone, ev.target.value)}
                  aria-required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Naam moeder <span className="text-burgundy">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  value={form[GUEST_MINOR_PARENT_FIELD_KEYS.motherName] ?? ''}
                  onChange={(ev) => setField(GUEST_MINOR_PARENT_FIELD_KEYS.motherName, ev.target.value)}
                  aria-required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  GSM moeder <span className="text-burgundy">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  value={form[GUEST_MINOR_PARENT_FIELD_KEYS.motherPhone] ?? ''}
                  onChange={(ev) => setField(GUEST_MINOR_PARENT_FIELD_KEYS.motherPhone, ev.target.value)}
                  aria-required
                />
              </div>
            </>
          ) : minorWith ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Naam {minorWith === 'vader' ? 'vader' : 'moeder'} <span className="text-burgundy">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  value={form[GUEST_MINOR_PARENT_FIELD_KEYS.name] ?? ''}
                  onChange={(ev) => setField(GUEST_MINOR_PARENT_FIELD_KEYS.name, ev.target.value)}
                  aria-required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  GSM {minorWith === 'vader' ? 'vader' : 'moeder'} <span className="text-burgundy">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  value={form[GUEST_MINOR_PARENT_FIELD_KEYS.phone] ?? ''}
                  onChange={(ev) => setField(GUEST_MINOR_PARENT_FIELD_KEYS.phone, ev.target.value)}
                  aria-required
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    ) : null;

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-zinc-500">Bezig met laden…</div>
    );
  }

  if (step === 'success') {
    const embedUrl =
      travelInfo?.mapsDirectionsUrl && travelInfo.visitorAddress
        ? `https://maps.google.com/maps?output=embed&hl=nl&z=10&saddr=${encodeURIComponent(travelInfo.visitorAddress)}&daddr=${encodeURIComponent(CLASS_MODELS_OFFICE.fullAddress)}`
        : travelInfo?.mapsEmbedUrl ?? CLASS_MODELS_OFFICE.mapsEmbedUrl;

    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-zinc-200 bg-white px-5 py-6 shadow-sm">
          <p className="text-center text-base font-semibold tracking-tight text-zinc-900">
            Inschrijving is gelukt
          </p>
          <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600">
            {bookNotifications?.emailSent && bookNotifications?.smsSent
              ? 'U ontvangt een bevestiging per SMS en per e-mail.'
              : bookNotifications?.emailSent
                ? 'U ontvangt een bevestiging per e-mail.'
                : bookNotifications?.smsSent
                  ? 'U ontvangt een bevestiging per SMS.'
                  : bookNotifications && !bookNotifications.emailSent && !bookNotifications.smsSent
                    ? 'Uw afspraak staat vast. De bevestigingsmail kon niet worden verstuurd — controleer uw e-mailadres of neem contact op met Class-Models.'
                    : 'U ontvangt zo dadelijk een bevestiging per SMS en/of e-mail (indien ingevuld).'}
          </p>
          {bookNotifications?.emailError && !bookNotifications.emailSent ? (
            <p className="mt-2 text-center text-xs text-amber-800">{bookNotifications.emailError}</p>
          ) : null}
          <p className="mt-3 rounded-md border border-burgundy/25 bg-burgundy/5 px-3 py-2 text-center text-xs leading-relaxed text-zinc-800">
            <strong className="text-burgundy">Locatie:</strong>{' '}
            {CLASS_MODELS_OFFICE.fullAddress}
          </p>
          {travelInfo?.distanceLabel ? (
            <p className="mt-2 text-center text-sm font-medium text-zinc-900">
              Afstand tot ons kantoor: {travelInfo.distanceLabel}
            </p>
          ) : null}
          {showGuestOffice ? (
            <div className="mt-4 overflow-hidden rounded-md border border-zinc-200">
              <iframe
                title="Route naar Class-Models"
                src={embedUrl}
                className="h-[220px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}
          {travelInfo?.mapsDirectionsUrl ? (
            <p className="mt-3 text-center">
              <a
                href={travelInfo.mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-burgundy underline underline-offset-2"
              >
                Open route in Google Maps
              </a>
            </p>
          ) : null}
          {cancelUrl ? (
            <p className="mt-4 text-center text-xs text-zinc-500">
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
        <p className="text-center text-[11px] text-zinc-500">
          Dit scherm blijft open tot u op «Terug naar de pagina» klikt.
        </p>
      </div>
    );
  }

  if (!slots.length && !openDates.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-zinc-800">
          Er zijn momenteel geen beschikbare datums.
        </p>
        <p className="text-sm text-zinc-600">
          Probeer het later opnieuw — zodra er nieuwe datums worden opengezet, kan u hier meteen boeken.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Terug
        </button>
        {alert ? (
          <NieuwAlertDialog
            open
            title={alert.title}
            message={alert.message}
            items={alert.items}
            onClose={() => setAlert(null)}
          />
        ) : null}
      </div>
    );
  }

  if (variant !== 'pro') {
    return (
      <div className="cm-agenda-on-dark space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
          <div className="min-w-0 flex-1">
            {!hideSlotTitle ? (
              <h2 className="mt-0 font-serif text-xl font-semibold text-ink">
                {step === 'slots' ? 'Kies een beschikbaar moment' : 'Uw gegevens'}
              </h2>
            ) : step === 'form' ? (
              <h2 className="mt-0 font-serif text-xl font-semibold text-ink">Uw gegevens</h2>
            ) : null}
            {step === 'slots' && showGuestOffice ? (
              <p className={`${hideSlotTitle ? 'mt-0' : 'mt-4'} text-[13px] leading-snug text-muted`}>
                {GUEST_APPOINTMENT_OFFICE_LINE}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm font-medium text-burgundy underline underline-offset-2 hover:text-burgundyDeep"
          >
            Annuleren
          </button>
        </div>
        {step === 'slots' ? (
          <div className="space-y-3">
            {isMobile ? topDatePager : null}
            <div
              className={
                isMobile
                  ? ''
                  : 'nieuw-agenda-scroll max-h-[min(520px,62vh)] overflow-y-scroll pr-1'
              }
            >
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
                    {/* Gsm: alle uren volledig onder elkaar (geen scroll per dag). */}
                    <div
                      className={`mt-2 flex flex-col gap-1.5 ${
                        isMobile
                          ? ''
                          : 'nieuw-agenda-scroll max-h-[min(460px,50vh)] overflow-y-scroll pr-0.5'
                      }`}
                    >
                      {(slotsByYmd.get(ymd) ?? []).length === 0 ? (
                        <p className="px-1 py-2 text-[11px] text-muted">
                          Geen vrije momenten (meer) op deze dag.
                        </p>
                      ) : null}
                      {(slotsByYmd.get(ymd) ?? []).map((s) => renderSlotButton(s, slotId === s.id))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {datePager}
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-5">
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
                  setAlert(null);
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
        {alert ? (
          <NieuwAlertDialog
            open
            title={alert.title}
            message={alert.message}
            items={alert.items}
            onClose={() => setAlert(null)}
          />
        ) : null}
      </div>
    );
  }

  const slotsBlock =
    step === 'slots' ? (
      <div className={isMobile ? 'w-full' : 'min-h-0 min-w-0 flex-1'}>
        <div
          className={
            isMobile
              ? 'flex w-full flex-col gap-3'
              : 'flex min-h-0 max-h-[min(520px,62vh)] flex-1 flex-col'
          }
        >
          {isMobile ? topDatePager : null}
          <div
            className={
              isMobile
                ? 'grid w-full gap-2 pb-1'
                : 'grid min-h-0 w-full min-w-0 flex-1 gap-1.5 pb-1'
            }
            style={dayGridStyle}
          >
            {visibleDates.map((ymd) => (
              <div
                key={ymd}
                className={
                  isMobile
                    ? 'flex min-w-0 flex-col text-center'
                    : 'flex min-h-0 min-w-0 flex-col text-center'
                }
              >
                <div className="shrink-0 rounded-t-md bg-zinc-900 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {colHeader(ymd)}
                </div>
                {/* Gsm: natuurlijke hoogte + alle uren zichtbaar (niet inklappen in flex). */}
                <div
                  className={
                    isMobile
                      ? 'space-y-1.5 rounded-b-md border border-t-0 border-zinc-200 bg-zinc-50/80 p-1.5'
                      : 'nieuw-agenda-scroll min-h-0 flex-1 space-y-1.5 overflow-y-scroll rounded-b-md border border-t-0 border-zinc-200 bg-zinc-50/80 p-1.5'
                  }
                >
                  {(slotsByYmd.get(ymd) ?? []).length === 0 ? (
                    <p className="px-1 py-2 text-[10px] text-zinc-500">Geen vrije momenten (meer).</p>
                  ) : null}
                  {(slotsByYmd.get(ymd) ?? []).map((s) => renderSlotButton(s, slotId === s.id, true))}
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
        noValidate
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
            setAlert(null);
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
    <div className={`cm-agenda-on-dark flex flex-col gap-4 ${isMobile ? '' : 'min-h-[min(520px,62vh)]'}`}>
      {uploadProgress ? (
        <CmProgressOverlay
          label="Afspraak versturen…"
          sublabel={uploadProgress.sublabel}
          percent={uploadProgress.percent}
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-3">
        <div>
          <h2 className="mt-0 text-base font-semibold tracking-tight text-zinc-900">
            {step === 'slots' ? 'Kies een beschikbaar moment' : 'Uw gegevens'}
          </h2>
          {showGuestOffice ? (
            <p className="mt-2 text-[11px] leading-snug text-zinc-600">{GUEST_APPOINTMENT_OFFICE_LINE}</p>
          ) : null}
        </div>
      </div>

      <div className={`flex flex-col gap-4 ${isMobile ? '' : 'min-h-0 flex-1'}`}>
        <div className={isMobile ? 'w-full' : 'flex min-h-0 min-w-0 flex-1 flex-col'}>{slotsBlock}</div>
      </div>

      {footer}

      {alert ? (
        <NieuwAlertDialog
          open
          title={alert.title}
          message={alert.message}
          items={alert.items}
          onClose={() => setAlert(null)}
        />
      ) : null}
    </div>
  );
}
