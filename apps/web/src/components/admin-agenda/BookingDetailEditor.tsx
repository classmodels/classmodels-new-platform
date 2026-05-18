'use client';

import {
  ageFromIsoBirthYmd,
  fjString,
  isCancelledAgendaStatus,
  isReservedFieldsJsonKey,
  opmerkingenDisplayValue,
} from '@/lib/agenda-booking-detail';

export type BookingDetailEditorModel = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  fieldsJson: Record<string, unknown>;
  calendar: { id: string; slug: string; title: string; color?: string };
  slot: { id: string; slotDate: string; startTime: string; endTime: string };
};

type CalChoice = { id: string; title: string };

type StatusOpt = { v: string; label: string };

type Props<T extends BookingDetailEditorModel> = {
  detail: T;
  onDetailChange: (next: T) => void;
  schedCalId: string;
  setSchedCalId: (v: string) => void;
  schedYmd: string;
  setSchedYmd: (v: string) => void;
  schedStart: string;
  setSchedStart: (v: string) => void;
  schedEnd: string;
  setSchedEnd: (v: string) => void;
  calendars: CalChoice[];
  statusOpts: readonly StatusOpt[];
};

function setFj<T extends BookingDetailEditorModel>(
  detail: T,
  onDetailChange: (n: T) => void,
  patch: Record<string, string | undefined>,
) {
  const nextFj = { ...detail.fieldsJson } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === '') delete nextFj[k];
    else nextFj[k] = v;
  }
  onDetailChange({ ...detail, fieldsJson: nextFj });
}

export function BookingDetailEditor<T extends BookingDetailEditorModel>({
  detail,
  onDetailChange,
  schedCalId,
  setSchedCalId,
  schedYmd,
  setSchedYmd,
  schedStart,
  setSchedStart,
  schedEnd,
  setSchedEnd,
  calendars,
  statusOpts,
}: Props<T>) {
  const fj = detail.fieldsJson;
  const geb = fjString(fj, 'geboortedatum');
  const age = geb ? ageFromIsoBirthYmd(geb) : null;
  const minor = age != null && age < 18;
  const opm = opmerkingenDisplayValue(fj);

  const dynamicEntries = Object.entries(fj).filter(([k]) => {
    if (isReservedFieldsJsonKey(k)) return false;
    if (k.toLowerCase() === 'email') return false;
    return true;
  });

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs text-muted">
          Status
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            value={detail.status}
            onChange={(e) => onDetailChange({ ...detail, status: e.target.value })}
          >
            {statusOpts.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Agenda
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            value={schedCalId}
            onChange={(e) => setSchedCalId(e.target.value)}
          >
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Dag
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            value={schedYmd}
            onChange={(e) => setSchedYmd(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          Van (HH:mm)
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            value={schedStart}
            onChange={(e) => setSchedStart(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          Tot (HH:mm)
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            value={schedEnd}
            onChange={(e) => setSchedEnd(e.target.value)}
          />
        </label>
      </div>

      <h4 className="mt-6 text-sm font-semibold text-slate-600">Afspraakgegevens</h4>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          {typeof fj.foto === 'string' && fj.foto.length > 0 ? (
            <img src={fj.foto} alt="Upload" className="max-h-80 w-full rounded-lg border border-line object-contain" />
          ) : (
            <div className="flex h-48 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted">
              Geen foto
            </div>
          )}
          <label className="text-xs text-muted">
            Opmerkingen <span className="text-red-600">*</span>
            <textarea
              rows={8}
              className="mt-1 w-full resize-y rounded-lg border border-zinc-200 px-2 py-2 text-sm text-ink"
              value={opm}
              onChange={(e) => {
                const v = e.target.value;
                setFj(detail, onDetailChange, { opmerkingen: v, bericht: undefined });
              }}
            />
          </label>
        </div>

        <div className="grid gap-2 text-sm">
          {(
            [
              ['name', 'Naam', detail.name],
              ['firstname', 'Voornaam', detail.firstname],
              ['lastname', 'Familienaam', detail.lastname],
              ['email', 'E-mail', detail.email],
              ['phone', 'GSM', detail.phone],
            ] as const
          ).map(([key, lab, val]) => (
            <label key={key} className="text-xs text-muted">
              {lab} <span className="text-red-600">*</span>
              <input
                className="mt-0.5 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm text-ink"
                value={val ?? ''}
                onChange={(e) => onDetailChange({ ...detail, [key]: e.target.value || null })}
              />
            </label>
          ))}

          <label className="text-xs text-muted">
            Geboortedatum <span className="text-red-600">*</span>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <input
                type="date"
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={geb}
                onChange={(e) => setFj(detail, onDetailChange, { geboortedatum: e.target.value })}
              />
              {age != null ? (
                <span className="whitespace-nowrap text-xs font-medium text-ink">Leeftijd: {age} jaar</span>
              ) : geb ? (
                <span className="text-xs text-red-600">Ongeldige datum</span>
              ) : null}
            </div>
          </label>

          <label className="text-xs text-muted">
            Adres <span className="text-red-600">*</span>
            <input
              className="mt-0.5 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
              value={fjString(fj, 'adres')}
              onChange={(e) => setFj(detail, onDetailChange, { adres: e.target.value })}
            />
          </label>

          {isCancelledAgendaStatus(detail.status) ? (
            <label className="text-xs text-muted">
              Reden van annulatie <span className="text-red-600">*</span>
              <textarea
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={fjString(fj, 'annulatie_reden')}
                placeholder="Waarom wordt deze afspraak geannuleerd?"
                onChange={(e) => setFj(detail, onDetailChange, { annulatie_reden: e.target.value })}
              />
            </label>
          ) : fjString(fj, 'annulatie_reden') ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-muted">
              <span className="font-semibold text-ink">Opgeslagen annulatiereden</span>
              <p className="mt-1 whitespace-pre-wrap text-ink">{fjString(fj, 'annulatie_reden')}</p>
            </div>
          ) : null}

          {minor ? (
            <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950">
              <p className="font-semibold">U bent minderjarig</p>
              <p>
                U dient verplicht aanwezig te zijn met iemand van uw ouders. Geef hieronder aan met wie u komt en de
                contactgegevens van die ouder.
              </p>
              <label className="mt-1 block text-xs font-medium text-amber-950">
                Ik kom met <span className="text-red-600">*</span>
                <select
                  className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-2 text-sm text-ink"
                  value={fjString(fj, 'ouder_met')}
                  onChange={(e) => setFj(detail, onDetailChange, { ouder_met: e.target.value })}
                >
                  <option value="">— kies —</option>
                  <option value="vader">Mijn vader</option>
                  <option value="moeder">Mijn moeder</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-amber-950">
                Naam ouder <span className="text-red-600">*</span>
                <input
                  className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-2 text-sm"
                  value={fjString(fj, 'ouder_naam')}
                  onChange={(e) => setFj(detail, onDetailChange, { ouder_naam: e.target.value })}
                />
              </label>
              <label className="block text-xs font-medium text-amber-950">
                GSM ouder <span className="text-red-600">*</span>
                <input
                  className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-2 text-sm"
                  value={fjString(fj, 'ouder_gsm')}
                  onChange={(e) => setFj(detail, onDetailChange, { ouder_gsm: e.target.value })}
                />
              </label>
            </div>
          ) : null}

          {dynamicEntries.map(([k, v]) => (
            <label key={k} className="text-xs text-muted capitalize">
              {k.replace(/_/g, ' ')}
              <input
                className="mt-0.5 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={v == null ? '' : String(v)}
                onChange={(e) =>
                  onDetailChange({
                    ...detail,
                    fieldsJson: { ...detail.fieldsJson, [k]: e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
