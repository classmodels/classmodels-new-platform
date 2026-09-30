'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApiBase } from '@/lib/api';
import { ymdEuropeBrussels } from '@/lib/agenda-brussels';
import { resolveAgendaBookPath } from '@/lib/agenda-phone';

type SlotDto = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  remaining?: number;
};

type FieldDto = {
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

type WizardStep =
  | 'contact'
  | 'package'
  | 'day'
  | 'done_book';

type PackageChoice = 'testshoot_intake' | 'intake_only' | null;

function slugForPackage(_pkg: PackageChoice): string {
  return 'model-worden';
}

function formatDayLabel(ymd: string): string {
  const { weekday, date } = formatDayParts(ymd);
  return `${weekday} ${date}`;
}

function formatDayParts(ymd: string): { weekday: string; date: string } {
  const d = new Date(`${ymd}T12:00:00`);
  return {
    weekday: new Intl.DateTimeFormat('nl-BE', { weekday: 'long' }).format(d),
    date: new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'long' }).format(d),
  };
}

function startOfWeekMonday(ref: Date = new Date()): Date {
  const d = new Date(ref);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0 = zo … 6 = za
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Volgorde in de UI: maandag → zondag (volledige week) */
function weekDaysOrdered(weekOffset: number): string[] {
  const monday = startOfWeekMonday();
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, off) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + off);
    return ymdEuropeBrussels(d);
  });
}

function weekRangeLabel(weekOffset: number): string {
  const monday = startOfWeekMonday();
  monday.setDate(monday.getDate() + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short' }).format(d);
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

const MAX_WEEK_OFFSET = 8;

function stepLabel(step: WizardStep): string {
  switch (step) {
    case 'package':
      return 'Stap 1 · Jouw keuze';
    case 'day':
      return 'Stap 2 · Kies een dag';
    case 'contact':
      return 'Stap 3 · Jouw gegevens';
    case 'done_book':
      return 'Klaar';
    default:
      return '';
  }
}

function ageFromBirthYear(yearStr: string): number | null {
  const y = Number.parseInt(yearStr.trim(), 10);
  if (!Number.isFinite(y) || y < 1920 || y > new Date().getFullYear()) return null;
  return new Date().getFullYear() - y;
}

export function GuestSignupWizard() {
  const [step, setStep] = useState<WizardStep>('package');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [city, setCity] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [parentPresent, setParentPresent] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pkg, setPkg] = useState<PackageChoice>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [fields, setFields] = useState<FieldDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dayYmd, setDayYmd] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelUrl, setCancelUrl] = useState<string | null>(null);

  const calendarSlug = slugForPackage(pkg);
  const isMinor = (ageFromBirthYear(birthYear) ?? 99) < 18;

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const clearPhoto = () => {
    setPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const onPhotoPick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      setError('Kies een afbeelding (JPG, PNG, WEBP of HEIC).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('De foto is te groot (max. 12 MB).');
      return;
    }
    setError(null);
    setPhoto(file);
  };

  const loadAgenda = useCallback(async (slug: string) => {
    setLoadingSlots(true);
    setLoadError(null);
    try {
      const base = getApiBase();
      const fromD = new Date();
      const toD = new Date(fromD);
      toD.setDate(toD.getDate() + 60);
      const from = ymdEuropeBrussels(fromD);
      const to = ymdEuropeBrussels(toD);
      const q = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const [fRes, sRes] = await Promise.all([
        fetch(`${base}/agenda/fields/${encodeURIComponent(slug)}`),
        fetch(`${base}/agenda/slots/${encodeURIComponent(slug)}?${q}`),
      ]);
      if (!fRes.ok || !sRes.ok) throw new Error('Kon agenda niet laden');
      const fJson = (await fRes.json()) as { fields?: FieldDto[] };
      const sJson = (await sRes.json()) as { slots?: SlotDto[] };
      setFields(fJson.fields ?? []);
      setSlots(sJson.slots ?? []);
    } catch {
      setFields([]);
      setSlots([]);
      setLoadError('De agenda is even niet bereikbaar. Probeer het zo opnieuw.');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'day' && pkg) {
      void loadAgenda(slugForPackage(pkg));
    }
  }, [step, pkg, loadAgenda]);

  const displaySlots = slots;

  const todayYmd = ymdEuropeBrussels(new Date());

  const slotsByDay = useMemo(() => {
    const map = new Map<string, SlotDto[]>();
    for (const s of displaySlots) {
      const list = map.get(s.slotDate) ?? [];
      list.push(s);
      map.set(s.slotDate, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [displaySlots]);

  const weekDays = useMemo(() => weekDaysOrdered(weekOffset), [weekOffset]);
  const canPrevWeek = weekOffset > 0;
  const canNextWeek = weekOffset < MAX_WEEK_OFFSET;

  const validateContact = (): string | null => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Vul een geldig e-mailadres in.';
    }
    if (!postcode.trim()) return 'Vul je postcode in.';
    if (!city.trim()) return 'Vul je gemeente in.';
    if (!lastName.trim()) return 'Vul je naam in.';
    if (!firstName.trim()) return 'Vul je voornaam in.';
    if (!phone.trim()) return 'Vul je gsm-nummer in.';
    if (ageFromBirthYear(birthYear) === null) return 'Vul een geldig geboortejaar in.';
    if (isMinor && !parentPresent) {
      return 'Bevestig de verplichte aanwezigheid van een ouder of voogd.';
    }
    return null;
  };

  const goFromContact = () => {
    const err = validateContact();
    if (err) {
      setError(err);
      return;
    }
    if (!slotId) {
      setError('Kies eerst een dag en een uur.');
      setStep('day');
      return;
    }
    setError(null);
    void book();
  };

  const goFromPackage = () => {
    if (!pkg) {
      setError('Kies hoe je wilt starten.');
      return;
    }
    setError(null);
    setDayYmd(null);
    setSlotId(null);
    setWeekOffset(0);
    setStep('day');
  };

  const pickHour = (ymd: string, id: string) => {
    setDayYmd(ymd);
    setSlotId(id);
    setError(null);
    setStep('contact');
  };

  const selectedSlotTime = useMemo(() => {
    if (!slotId) return null;
    const s = displaySlots.find((x) => x.id === slotId);
    return s ? s.startTime.slice(0, 5) : null;
  }, [displaySlots, slotId]);

  const pickedMomentLabel =
    dayYmd && selectedSlotTime
      ? `${formatDayLabel(dayYmd)} · ${selectedSlotTime}`
      : null;

  const book = async () => {
    if (!slotId || !pkg) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('slotId', slotId);
      const fieldPayload: Record<string, string> = {
        voornaam: firstName.trim(),
        achternaam: lastName.trim(),
        email: email.trim(),
        telefoon: phone.trim(),
        postcode: postcode.trim(),
        gemeente: city.trim(),
        geboortejaar: birthYear.trim(),
        pakket:
          pkg === 'testshoot_intake'
            ? 'Gratis testshoot + intake-gesprek'
            : 'Alleen intake-gesprek',
      };
      if (pkg === 'testshoot_intake') {
        fieldPayload.opmerkingen = 'Inclusief gratis testshoot';
      }
      if (isMinor) {
        fieldPayload.ouder_aanwezig = parentPresent ? 'ja' : 'nee';
      }

      const known = new Set(fields.map((f) => f.fieldKey));
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(fieldPayload)) {
        if (
          known.has(k) ||
          k === 'voornaam' ||
          k === 'achternaam' ||
          k === 'email' ||
          k === 'telefoon' ||
          k === 'postcode' ||
          k === 'gemeente' ||
          k === 'geboortejaar' ||
          k === 'ouder_aanwezig'
        ) {
          mapped[k] = v;
        }
      }
      mapped.voornaam = firstName.trim();
      mapped.achternaam = lastName.trim();
      mapped.email = email.trim();
      mapped.telefoon = phone.trim();
      mapped.postcode = postcode.trim();
      mapped.gemeente = city.trim();
      mapped.geboortejaar = birthYear.trim();
      mapped.pakket =
        pkg === 'testshoot_intake'
          ? 'Gratis testshoot + intake-gesprek'
          : 'Alleen intake-gesprek';
      if (pkg === 'testshoot_intake') {
        mapped.opmerkingen = 'Inclusief gratis testshoot';
      }
      if (isMinor) mapped.ouder_aanwezig = parentPresent ? 'ja' : 'nee';

      fd.append('fields', JSON.stringify(mapped));
      if (photo) {
        const fileKey = fields.find((f) => f.type === 'file')?.fieldKey ?? 'foto';
        fd.append(fileKey, photo);
      }
      const path = resolveAgendaBookPath(undefined, null);
      const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
      const res = await fetch(url, { method: 'POST', body: fd });
      const text = await res.text();
      if (!res.ok) {
        let msg = 'Boeken mislukt. Probeer een ander moment.';
        try {
          const j = JSON.parse(text) as { message?: string | string[] };
          if (typeof j.message === 'string') msg = j.message;
          else if (Array.isArray(j.message)) msg = j.message.join(', ');
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      try {
        const j = JSON.parse(text) as { cancelUrl?: string };
        setCancelUrl(j.cancelUrl ?? null);
      } catch {
        setCancelUrl(null);
      }
      setStep('done_book');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Boeken mislukt');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep('package');
    setPkg(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setPostcode('');
    setCity('');
    setBirthYear('');
    setParentPresent(false);
    clearPhoto();
    setDayYmd(null);
    setSlotId(null);
    setWeekOffset(0);
    setError(null);
    setCancelUrl(null);
  };

  return (
    <div className="nieuw-signup-grid">
      <div className="nieuw-signup-intro">
        <span className="nieuw-label">JOUW EERSTE STAP</span>
        <h2 className="nieuw-display nieuw-display-md" style={{ marginTop: 14 }}>
          Plan je kennismaking
        </h2>
        <ul className="nieuw-checklist" style={{ marginTop: 18 }}>
          <li>
            <span className="v">✓</span>
            <span>Geen ervaring nodig</span>
          </li>
          <li>
            <span className="v">✓</span>
            <span>Volledig vrijblijvend, geen verplichtingen</span>
          </li>
          <li>
            <span className="v">✓</span>
            <span>Vrijblijvend in Hulshout</span>
          </li>
          <li>
            <span className="v">✓</span>
            <span>Alleen nieuwsgierig? Geen probleem!</span>
          </li>
        </ul>
      </div>

      <div className="nieuw-signup-panel">
        <div className="nieuw-signup-panel-head">
          <p className="nieuw-signup-step">{stepLabel(step)}</p>
          {step === 'day' || step === 'contact' ? (
            <button
              type="button"
              className="nieuw-btn nieuw-btn-ghost nieuw-signup-back-top"
              onClick={() => setStep(step === 'contact' ? 'day' : 'package')}
            >
              ← Back
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="nieuw-signup-error" role="alert">
            {error}
          </p>
        ) : null}

        {step === 'package' ? (
          <>
            <h3 className="nieuw-signup-title">Maak een afspraak</h3>
            <p className="nieuw-signup-sub">Maak uw keuze</p>
            <button
              type="button"
              className={`nieuw-signup-choice${pkg === 'testshoot_intake' ? ' is-on' : ''}`}
              onClick={() => setPkg('testshoot_intake')}
            >
              <span className="nieuw-signup-radio" aria-hidden />
              <span>
                <strong>Gratis testshoot + intake-gesprek</strong>
                <small>Eerst voor de camera, daarna vrijblijvend advies over jouw kansen.</small>
              </span>
            </button>
            <button
              type="button"
              className={`nieuw-signup-choice${pkg === 'intake_only' ? ' is-on' : ''}`}
              onClick={() => setPkg('intake_only')}
            >
              <span className="nieuw-signup-radio" aria-hidden />
              <span>
                <strong>Alleen intake-gesprek</strong>
                <small>Persoonlijk kennismaken in Hulshout — zonder fotoshoot.</small>
              </span>
            </button>
            <button type="button" className="nieuw-btn nieuw-signup-cta" onClick={goFromPackage}>
              Volgende stap →
            </button>
          </>
        ) : null}

        {step === 'contact' ? (
          <>
            <h3 className="nieuw-signup-title">Jouw gegevens</h3>
            <p className="nieuw-signup-sub">Vul je contactgegevens in om de afspraak te bevestigen.</p>
            {pickedMomentLabel ? (
              <p className="nieuw-signup-picked">Gekozen: {pickedMomentLabel}</p>
            ) : null}

            <label className="nieuw-signup-label">
              E-mailadres
              <input
                className="nieuw-signup-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.be"
                autoComplete="email"
              />
            </label>

            <div className="nieuw-signup-row">
              <label className="nieuw-signup-label">
                Postcode
                <input
                  className="nieuw-signup-input"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="2220"
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </label>
              <label className="nieuw-signup-label">
                Gemeente
                <input
                  className="nieuw-signup-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Hulshout"
                  autoComplete="address-level2"
                />
              </label>
            </div>

            <div className="nieuw-signup-row">
              <label className="nieuw-signup-label">
                Naam
                <input
                  className="nieuw-signup-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Jouw naam"
                  autoComplete="family-name"
                />
              </label>
              <label className="nieuw-signup-label">
                Voornaam
                <input
                  className="nieuw-signup-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jouw voornaam"
                  autoComplete="given-name"
                />
              </label>
            </div>

            <div className="nieuw-signup-row">
              <label className="nieuw-signup-label">
                Gsm
                <input
                  className="nieuw-signup-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Bijvoorbeeld 0498…"
                  autoComplete="tel"
                />
              </label>
              <label className="nieuw-signup-label">
                Geboortejaar
                <input
                  className="nieuw-signup-input"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                  placeholder="2005"
                  inputMode="numeric"
                  autoComplete="bday-year"
                />
              </label>
            </div>

            <div className="nieuw-signup-photo">
              <div className="nieuw-signup-photo-head">
                <span>Foto uploaden</span>
                <em>(optioneel)</em>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                className="nieuw-signup-photo-input"
                onChange={(e) => onPhotoPick(e.target.files?.[0])}
              />
              {photoPreview ? (
                <div className="nieuw-signup-photo-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Gekozen foto" />
                  <div className="nieuw-signup-photo-preview-meta">
                    <strong>{photo?.name}</strong>
                    <span>
                      {photo ? `${Math.max(1, Math.round(photo.size / 1024))} KB` : ''}
                    </span>
                    <div className="nieuw-signup-photo-preview-actions">
                      <button
                        type="button"
                        className="nieuw-btn nieuw-btn-ghost"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        Andere foto
                      </button>
                      <button type="button" className="nieuw-btn nieuw-btn-ghost" onClick={clearPhoto}>
                        Verwijderen
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="nieuw-signup-photo-drop"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <span className="nieuw-signup-photo-icon" aria-hidden>
                    +
                  </span>
                  <strong>Sleep of kies een foto</strong>
                  <small>JPG, PNG of HEIC — max. 12 MB</small>
                </button>
              )}
            </div>

            {isMinor ? (
              <label className="nieuw-signup-check">
                <input
                  type="checkbox"
                  checked={parentPresent}
                  onChange={(e) => setParentPresent(e.target.checked)}
                />
                <span>
                  Verplicht: een ouder of voogd is aanwezig bij de afspraak
                  <small>Omdat je minderjarig bent, is dit nodig.</small>
                </span>
              </label>
            ) : null}

            <button
              type="button"
              className="nieuw-btn nieuw-signup-cta"
              disabled={busy}
              onClick={goFromContact}
            >
              {busy ? 'Bezig…' : 'Bevestig uw afspraak →'}
            </button>
          </>
        ) : null}

        {step === 'day' ? (
          <>
            <h3 className="nieuw-signup-title">Maak uw afspraak</h3>
            <p className="nieuw-signup-sub">
              Kies een dag, daarna kan je een uur kiezen.
            </p>
            {loadingSlots ? <p className="nieuw-signup-sub">Momenten laden…</p> : null}
            {!loadingSlots && loadError ? (
              <p className="nieuw-signup-error" role="alert">
                {loadError}
              </p>
            ) : null}
            {!loadingSlots && !loadError && displaySlots.length === 0 ? (
              <p className="nieuw-signup-error" role="alert">
                Er zijn momenteel geen vrije momenten. Probeer het later opnieuw of kies een andere week.
              </p>
            ) : null}

            {!loadingSlots ? (
              <div className="nieuw-signup-day-block">
                <div className="nieuw-signup-day-pager">
                  <button
                    type="button"
                    className="nieuw-signup-day-arrow"
                    aria-label="Vorige week"
                    disabled={!canPrevWeek}
                    onClick={() => {
                      setWeekOffset((w) => Math.max(0, w - 1));
                      setDayYmd(null);
                      setSlotId(null);
                    }}
                  >
                    ‹ Vorige
                  </button>
                  <span className="nieuw-signup-day-pager-meta">{weekRangeLabel(weekOffset)}</span>
                  <button
                    type="button"
                    className="nieuw-signup-day-arrow"
                    aria-label="Volgende week"
                    disabled={!canNextWeek}
                    onClick={() => {
                      setWeekOffset((w) => Math.min(MAX_WEEK_OFFSET, w + 1));
                      setDayYmd(null);
                      setSlotId(null);
                    }}
                  >
                    Volgende ›
                  </button>
                </div>

                <div className="nieuw-signup-day-frames">
                  {weekDays.map((ymd) => {
                    const parts = formatDayParts(ymd);
                    const daySlots = slotsByDay.get(ymd) ?? [];
                    const isPast = ymd < todayYmd;
                    const hasHours = daySlots.length > 0;
                    const isClosed = !isPast && !hasHours;
                    const isUnavailable = isPast || isClosed;
                    const isOpen = !isUnavailable && dayYmd === ymd;
                    const first = daySlots[0]?.startTime.slice(0, 5);
                    const last = daySlots[daySlots.length - 1]?.startTime.slice(0, 5);
                    return (
                      <div
                        key={ymd}
                        className={`nieuw-signup-day-frame${isOpen ? ' is-on' : ''}${isUnavailable ? ' is-past' : ''}`}
                      >
                        <button
                          type="button"
                          className="nieuw-signup-day-toggle"
                          aria-expanded={isOpen}
                          disabled={isUnavailable}
                          onClick={() => {
                            if (isUnavailable) return;
                            if (isOpen) {
                              setDayYmd(null);
                              setSlotId(null);
                              setError(null);
                              return;
                            }
                            setDayYmd(ymd);
                            setSlotId(null);
                            setError(null);
                          }}
                        >
                          <span className="nieuw-signup-radio" aria-hidden />
                          <strong>
                            {parts.weekday} {parts.date}
                          </strong>
                          {hasHours && first && last ? (
                            <span className="nieuw-signup-day-range">
                              {first} – {last}
                            </span>
                          ) : isPast ? (
                            <span className="nieuw-signup-day-range">Datum voorbij</span>
                          ) : (
                            <span className="nieuw-signup-day-range">Geen afspraak mogelijk</span>
                          )}
                        </button>

                        {isOpen ? (
                          <div className="nieuw-signup-day-expand">
                            <div className="nieuw-signup-day-hours" role="list">
                              {daySlots.map((s) => {
                                const on = slotId === s.id;
                                const label = s.startTime.slice(0, 5);
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    role="listitem"
                                    className={`nieuw-signup-hour-check${on ? ' is-on' : ''}`}
                                    aria-pressed={on}
                                    onClick={() => pickHour(ymd, s.id)}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {step === 'done_book' ? (
          <>
            <h3 className="nieuw-signup-title">Afspraak bevestigd</h3>
            <p className="nieuw-signup-sub">
              Je ontvangt een bevestiging per e-mail
              {dayYmd ? ` voor ${formatDayLabel(dayYmd)}` : ''}.
            </p>
            {cancelUrl ? (
              <p className="nieuw-signup-sub">
                Annuleren kan via de link in je mail, of{' '}
                <a className="nieuw-link" href={cancelUrl}>
                  hier
                </a>
                .
              </p>
            ) : null}
            <button type="button" className="nieuw-btn" onClick={reset}>
              Nieuwe inschrijving
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
