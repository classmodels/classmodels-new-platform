import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ModelPortalHistoryService } from '../portal/model-portal-history.service';
import {
  AgendaNotificationService,
  parseSlugList,
} from './agenda-notifications.service';
import {
  AdminBookingsRangeQueryDto,
  AdminCalendarMonthQueryDto,
  AdminOpenDaysQueryDto,
  AdminSlotsQueryDto,
  BookAgendaDto,
  BulkAgendaSlotsDto,
  CancelAgendaDto,
  CreateAgendaCalendarDto,
  CreateAgendaSlotDto,
  CreateClosedDayDto,
  CreateOpenDayDto,
  CreateManualBookingDto,
  CreateAgendaNotificationTemplateDto,
  UpdateAgendaNotificationTemplateDto,
  UpdateAgendaMessagingSettingsDto,
  UpdateAdminBookingDto,
  UpdateAgendaCalendarDto,
} from './dto/agenda.dto';
import {
  ensureDefaultAgendaCalendars,
} from './agenda-default-calendars';
import {
  isGuestBookingOptionalFieldKey,
  isGuestIntakeCalendarSlug,
  isMinorFromIsoDateString,
  validateGuestMinorParentFields,
} from './guest-intake-calendars';
import { agendaBookingPhotoStorageKey } from './agenda-booking-photo';
import { agendaMimeFromFilename, resolveAgendaUploadAbsolutePath } from './agenda-upload-path';
import { MediaService } from '../media/media.service';
import {
  canConfirmAttendanceNow,
  confirmAttendanceBlockedMessage,
  combineBrusselsLocalToUtc,
  parseYmdDayEnd,
  parseYmdDayStart,
  slotDateDayRange,
  slotDateToYmd,
  ymdEuropeBrussels,
} from './agenda-brussels-time';

const activeBookingFilter = {
  status: { notIn: ['cancelled', 'cancelled_cm', 'geannuleerd'] },
} satisfies Prisma.AgendaBookingWhereInput;

const CANCELLED_STATUSES = new Set(['cancelled', 'cancelled_cm', 'geannuleerd']);

function isCancelledStatus(s: string): boolean {
  return CANCELLED_STATUSES.has(s);
}

function fjStr(fj: Record<string, unknown>, key: string): string {
  const v = fj[key];
  if (v == null) return '';
  return String(v).trim();
}

function mergeBookingFieldsJson(
  prev: unknown,
  incoming: Record<string, string> | undefined,
): Record<string, string> {
  const base =
    prev && typeof prev === 'object' && !Array.isArray(prev) ? (prev as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...base };
  if (incoming) {
    for (const [k, v] of Object.entries(incoming)) {
      merged[k] = v;
    }
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[String(k)] = String(v);
    }
  }
  const opm = (out.opmerkingen || out.bericht || '').trim();
  if (opm) {
    out.opmerkingen = opm;
    delete out.bericht;
  }
  return out;
}

function parseYmd(ymd: string): Date {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Ongeldige datum');
  return d;
}

/** Standaardvelden voor nieuwe agenda’s (zelfde basis als seed GENERIC_FIELDS). */
const DEFAULT_AGENDA_FIELD_SEED: Array<{
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  width: string;
  placeholder: string;
  titlePosition: string;
  sortOrder: number;
  options: string | null;
}> = [
  {
    fieldKey: 'voornaam',
    label: 'Voornaam',
    type: 'text',
    required: true,
    width: '2',
    placeholder: 'Voornaam',
    titlePosition: 'above',
    sortOrder: 10,
    options: null,
  },
  {
    fieldKey: 'familienaam',
    label: 'Familienaam',
    type: 'text',
    required: true,
    width: '2',
    placeholder: 'Familienaam',
    titlePosition: 'above',
    sortOrder: 20,
    options: null,
  },
  {
    fieldKey: 'email',
    label: 'E-mail',
    type: 'email',
    required: true,
    width: '2',
    placeholder: 'E-mail',
    titlePosition: 'above',
    sortOrder: 30,
    options: null,
  },
  {
    fieldKey: 'telefoon',
    label: 'Telefoon',
    type: 'tel',
    required: false,
    width: '2',
    placeholder: 'Telefoon',
    titlePosition: 'above',
    sortOrder: 40,
    options: null,
  },
  {
    fieldKey: 'foto',
    label: 'Voeg foto bij',
    type: 'file',
    required: false,
    width: '2',
    placeholder: '',
    titlePosition: 'above',
    sortOrder: 200,
    options: null,
  },
];

function webPublicBase(): string {
  return (process.env.WEB_PUBLIC_URL || process.env.WEB_APP_URL || 'https://www.class-models.be').replace(/\/$/, '');
}

function normTime(t: string): string {
  const s = t.trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new BadRequestException('Ongeldige tijd');
  const h = `${parseInt(m[1], 10)}`.padStart(2, '0');
  const min = m[2].padStart(2, '0');
  const sec = (m[3] ?? '00').padStart(2, '0');
  return `${h}:${min}:${sec}`;
}

/** Effectieve capaciteit: hogere van slot vs agenda (oude sloten met cap 1 volgen zo de agenda-cap). */
function effectiveSlotCapacity(slotCapacity: number, calendarCapacity: number): number {
  return Math.max(slotCapacity, calendarCapacity);
}

function previousCalendarDayYmd(ymd: string): string {
  const [y, m, da] = ymd.split('-').map((x) => parseInt(x, 10));
  const utc = new Date(Date.UTC(y, m - 1, da));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

function timeToMinutes(t: string): number {
  const n = normTime(t);
  const [h, m] = n.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function timeToMinutesSafe(t: string | null | undefined, fallback = '08:00:00'): number {
  return timeToMinutes(safeNormTime(t, fallback));
}

/** HH:mm-regels → minuten sinds middernacht; leeg = null. */
function parseOptionalSlotStartsLines(raw: string | null | undefined): number[] | null {
  if (!raw?.trim()) return null;
  const mins: number[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      mins.push(timeToMinutes(t));
    } catch {
      /** ongeldige regel overslaan */
    }
  }
  if (!mins.length) return null;
  return [...new Set(mins)].sort((a, b) => a - b);
}

type CalSlotSchedule = {
  durationMinutes: number;
  slotStepMinutes?: number | null;
  optionalSlotStarts?: string | null;
  capacity: number;
  defaultDayStartTime: string;
  defaultDayEndTime: string;
  breakStart: string | null;
  breakEnd: string | null;
};

function safeNormTime(t: string | null | undefined, fallback = '08:00:00'): string {
  try {
    if (!t?.trim()) return normTime(fallback);
    return normTime(t);
  } catch {
    return normTime(fallback);
  }
}

function buildSlotRowsForCalendar(cal: CalSlotSchedule): { startTime: string; endTime: string }[] {
  const startM = timeToMinutesSafe(cal.defaultDayStartTime ?? '08:00:00');
  const endM = timeToMinutesSafe(cal.defaultDayEndTime ?? '18:00:00');
  const dur = Math.max(1, cal.durationMinutes || 30);
  const step = Math.max(1, cal.slotStepMinutes ?? dur);
  const explicitStarts = parseOptionalSlotStartsLines(cal.optionalSlotStarts ?? undefined);
  let breakA: number | null = null;
  let breakB: number | null = null;
  if (cal.breakStart && cal.breakEnd) {
    breakA = timeToMinutes(cal.breakStart);
    breakB = timeToMinutes(cal.breakEnd);
    if (breakB <= breakA) {
      breakA = null;
      breakB = null;
    }
  }

  const rows: { startTime: string; endTime: string }[] = [];

  const slotFitsPause = (cur: number): boolean => {
    if (cur + dur > endM) return false;
    if (breakA != null && breakB != null && cur < breakB && cur + dur > breakA) return false;
    return true;
  };

  const pushRow = (cur: number) => {
    const endMin = cur + dur;
    const sh = Math.floor(cur / 60);
    const sm = cur % 60;
    const eh = Math.floor(endMin / 60);
    const em = endMin % 60;
    rows.push({
      startTime: `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`,
      endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`,
    });
  };

  if (explicitStarts?.length) {
    for (const cur of explicitStarts) {
      if (slotFitsPause(cur)) pushRow(cur);
    }
  } else {
    let cur = startM;
    while (cur + dur <= endM) {
      if (breakA != null && breakB != null && cur < breakB && cur + dur > breakA) {
        cur = breakB;
        continue;
      }
      pushRow(cur);
      cur += step;
    }
  }

  return rows;
}

function usesOpenDayMode(restrictToOpenDays: boolean | null | undefined): boolean {
  return restrictToOpenDays !== false;
}

function eachYmdInRange(from: Date, to: Date, fn: (ymd: string) => void): void {
  let ymd = slotDateToYmd(from);
  const endYmd = slotDateToYmd(to);
  while (ymd <= endYmd) {
    fn(ymd);
    const next = parseYmd(ymd);
    next.setUTCDate(next.getUTCDate() + 1);
    ymd = slotDateToYmd(next);
  }
}

@Injectable()
export class AgendaService implements OnModuleInit {
  private readonly log = new Logger(AgendaService.name);
  private agendaBookingsFolderId: string | null = null;

  constructor(
    private prisma: PrismaService,
    private notifications: AgendaNotificationService,
    private modelHistory: ModelPortalHistoryService,
    private media: MediaService,
  ) {}

  async onModuleInit() {
    try {
      const r = await ensureDefaultAgendaCalendars(this.prisma);
      if (r.created > 0) {
        this.log.log(`Agenda: ${r.created} standaardagenda('s) aangemaakt (totaal ${r.total}).`);
      }
    } catch (e) {
      this.log.warn(
        `Agenda standaardagenda's bij start mislukt: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    try {
      await this.ensureAgendaBookingsMediaFolder();
    } catch (e) {
      this.log.warn(
        `Agenda mediamap bij start mislukt: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    try {
      await this.ensureOptionalPhotoFieldsOnAllCalendars();
    } catch (e) {
      this.log.warn(
        `Agenda foto-veld bij start mislukt: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    if (String(process.env.AGENDA_RECONCILE_TIMES_ON_BOOT || '1').trim() === '0') return;
    try {
      const r = await this.reconcileAllBookingBrusselsTimes();
      if (r.updated > 0) {
        this.log.log(
          `Agenda: ${r.updated}/${r.scanned} boeking(en) — startAt/endAt gecorrigeerd naar ${'Europe/Brussels'}`,
        );
      }
    } catch (e) {
      this.log.warn(
        `Agenda tijd-correctie bij start mislukt: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** Optioneel foto-veld op elke agenda (ook bestaande), label «Voeg foto bij». */
  private async ensureOptionalPhotoFieldsOnAllCalendars(): Promise<void> {
    const calendars = await this.prisma.agendaCalendar.findMany({ select: { id: true } });
    for (const cal of calendars) {
      const existing = await this.prisma.agendaField.findFirst({
        where: { calendarId: cal.id, fieldKey: 'foto' },
      });
      if (!existing) {
        await this.prisma.agendaField.create({
          data: {
            calendarId: cal.id,
            fieldKey: 'foto',
            label: 'Voeg foto bij',
            type: 'file',
            required: false,
            width: '2',
            placeholder: '',
            titlePosition: 'above',
            sortOrder: 200,
            active: true,
          },
        });
        continue;
      }
      if (existing.label !== 'Voeg foto bij' || existing.required || !existing.active || existing.type !== 'file') {
        await this.prisma.agendaField.update({
          where: { id: existing.id },
          data: {
            label: 'Voeg foto bij',
            type: 'file',
            required: false,
            active: true,
          },
        });
      }
    }
  }

  /** Zet startAt/endAt overal gelijk met slot (Belgische kloktijd). Idempotent. */
  async reconcileAllBookingBrusselsTimes(): Promise<{ scanned: number; updated: number }> {
    const rows = await this.prisma.agendaBooking.findMany({ include: { slot: true } });
    let updated = 0;
    for (const b of rows) {
      if (!b.slot) continue;
      const startNorm = normTime(b.slot.startTime);
      const endNorm = normTime(b.slot.endTime);
      const startAt = combineBrusselsLocalToUtc(b.slot.slotDate, startNorm);
      const endAt = combineBrusselsLocalToUtc(b.slot.slotDate, endNorm);
      if (startAt.getTime() === b.startAt.getTime() && endAt.getTime() === b.endAt.getTime()) continue;
      await this.prisma.agendaBooking.update({
        where: { id: b.id },
        data: { startAt, endAt },
      });
      updated += 1;
    }
    return { scanned: rows.length, updated };
  }

  previewBookingConfirmationHtml(): string {
    return this.notifications.previewBookingConfirmationHtml();
  }

  /** Agenda Pro: welke dagen in [from,to] staan open (incl. jaarlijks herhalend). */
  private openDayYmdSetInRange(
    from: Date,
    to: Date,
    openRows: { openDate: Date; repeatYearly: boolean }[],
  ): Set<string> {
    const set = new Set<string>();
    eachYmdInRange(from, to, (ymd) => {
      const [, cm, cd] = ymd.split('-');
      for (const o of openRows) {
        const openYmd = slotDateToYmd(o.openDate);
        if (o.repeatYearly) {
          const [, om, od] = openYmd.split('-');
          if (cm === om && cd === od) set.add(ymd);
        } else if (openYmd === ymd) {
          set.add(ymd);
        }
      }
    });
    return set;
  }

  private async closedDayYmdSet(calendarId: string, from: Date, to: Date): Promise<Set<string>> {
    const closedRows = await this.prisma.agendaClosedDay.findMany({
      where: {
        calendarId,
        closedDate: {
          gte: parseYmdDayStart(slotDateToYmd(from)),
          lte: parseYmdDayEnd(slotDateToYmd(to)),
        },
      },
      select: { closedDate: true },
    });
    return new Set(closedRows.map((r) => slotDateToYmd(r.closedDate)));
  }

  private async openDayYmdSetForCalendarIfRestricted(
    cal: { id: string; restrictToOpenDays: boolean | null },
    from: Date,
    to: Date,
  ): Promise<Set<string> | null> {
    if (!usesOpenDayMode(cal.restrictToOpenDays)) return null;
    const openRows = await this.prisma.agendaOpenDay.findMany({
      where: { calendarId: cal.id },
      select: { openDate: true, repeatYearly: true },
    });
    return this.openDayYmdSetInRange(from, to, openRows);
  }

  private async materializeGuestSlotsInRange(
    cal: {
      id: string;
      slug: string;
      restrictToOpenDays: boolean | null;
      weekdayOpenMask: number | null;
      durationMinutes: number;
      slotStepMinutes?: number | null;
      optionalSlotStarts?: string | null;
      capacity: number;
      defaultDayStartTime: string;
      defaultDayEndTime: string;
      breakStart: string | null;
      breakEnd: string | null;
    },
    from: Date,
    to: Date,
    closedSet: Set<string>,
    openYmdSet: Set<string> | null,
  ): Promise<void> {
    const restrictOpen = usesOpenDayMode(cal.restrictToOpenDays);
    const mask = cal.weekdayOpenMask ?? 0;
    if (restrictOpen && openYmdSet) {
      for (const ymd of [...openYmdSet].sort()) {
        if (closedSet.has(ymd)) continue;
        const dateOnly = parseYmd(ymd);
        if (cal.slug === 'opleiding') {
          await this.reconcileOpleidingDaySlots(cal.id, dateOnly, cal);
        } else {
          await this.reconcileCalendarDaySlots(cal.id, dateOnly, cal);
        }
      }
    } else if (!restrictOpen && mask !== 0) {
      let cursor = parseYmd(slotDateToYmd(from));
      const end = parseYmd(slotDateToYmd(to));
      while (cursor.getTime() <= end.getTime()) {
        const ymd = slotDateToYmd(cursor);
        const dow = cursor.getUTCDay();
        const bit = 1 << dow;
        if ((mask & bit) !== 0 && !closedSet.has(ymd)) {
          const dateOnly = parseYmd(ymd);
          if (cal.slug === 'opleiding') {
            await this.reconcileOpleidingDaySlots(cal.id, dateOnly, cal);
          } else {
            await this.reconcileCalendarDaySlots(cal.id, dateOnly, cal);
          }
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
  }

  private dedupeKeyForSlot(slotDate: Date, startTime: string): string {
    return `${slotDateToYmd(slotDate)}|${normTime(startTime)}`;
  }

  /** Zelfde filters als publieke slotlijst: sluitingen, open dagen, capaciteit, dedupe op dag+startuur. */
  private async collectGuestVisibleBookableSlotsDeduped(
    cal: { id: string; capacity: number },
    from: Date,
    to: Date,
    now: Date,
    closedSet: Set<string>,
    openYmdSet: Set<string> | null,
  ): Promise<
    Array<{
      id: string;
      slotDate: Date;
      startTime: string;
      endTime: string;
      capacity: number;
      booked: number;
      remaining: number;
    }>
  > {
    const rows = await this.prisma.agendaSlot.findMany({
      where: {
        calendarId: cal.id,
        status: 'open',
        slotDate: {
          gte: parseYmdDayStart(slotDateToYmd(from)),
          lte: parseYmdDayEnd(slotDateToYmd(to)),
        },
      },
      orderBy: [{ slotDate: 'asc' }, { startTime: 'asc' }],
    });

    const slotIds = rows.map((s) => s.id);
    const bookedBySlotId = new Map<string, number>();
    if (slotIds.length) {
      const grouped = await this.prisma.agendaBooking.groupBy({
        by: ['slotId'],
        where: { slotId: { in: slotIds }, ...activeBookingFilter },
        _count: { _all: true },
      });
      for (const g of grouped) bookedBySlotId.set(g.slotId, g._count._all);
    }

    type Row = (typeof rows)[number];
    const withCap: Array<Row & { booked: number; remaining: number; capacity: number }> = [];

    for (const s of rows) {
      const ymd = slotDateToYmd(s.slotDate);
      if (closedSet.has(ymd)) continue;
      if (openYmdSet && !openYmdSet.has(ymd)) continue;

      let startNorm: string;
      try {
        startNorm = normTime(s.startTime);
      } catch {
        continue;
      }
      const startAt = combineBrusselsLocalToUtc(s.slotDate, startNorm);
      if (startAt < now) continue;

      const booked = bookedBySlotId.get(s.id) ?? 0;
      const cap = effectiveSlotCapacity(s.capacity, cal.capacity);
      const remaining = Math.max(0, cap - booked);
      if (remaining <= 0) continue;

      withCap.push({
        ...s,
        capacity: cap,
        booked,
        remaining,
      });
    }

    const seenKeys = new Set<string>();
    const deduped: typeof withCap = [];
    for (const s of withCap) {
      const k = this.dedupeKeyForSlot(s.slotDate, s.startTime);
      if (seenKeys.has(k)) continue;
      seenKeys.add(k);
      deduped.push(s);
    }

    return deduped.map((s) => ({
      id: s.id,
      slotDate: s.slotDate,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
      booked: s.booked,
      remaining: s.remaining,
    }));
  }

  private async countGuestBookableSlotStarts(
    cal: {
      id: string;
      active: boolean;
      publicBooking: boolean;
      restrictToOpenDays: boolean | null;
      weekdayOpenMask: number | null;
      slug: string;
      durationMinutes: number;
      slotStepMinutes?: number | null;
      optionalSlotStarts?: string | null;
      capacity: number;
      defaultDayStartTime: string;
      defaultDayEndTime: string;
      breakStart: string | null;
      breakEnd: string | null;
    },
    now: Date,
  ): Promise<number> {
    if (!cal.active || !cal.publicBooking) return 0;
    const todayYmd = ymdEuropeBrussels(now);
    const from = parseYmd(todayYmd);
    const to = new Date(from.getTime() + 45 * 24 * 60 * 60 * 1000);
    const closedSet = await this.closedDayYmdSet(cal.id, from, to);
    const openYmdSet = await this.openDayYmdSetForCalendarIfRestricted(cal, from, to);
    await this.materializeGuestSlotsInRange(cal, from, to, closedSet, openYmdSet);
    const slots = await this.collectGuestVisibleBookableSlotsDeduped(cal, from, to, now, closedSet, openYmdSet);
    return slots.length;
  }

  /** Maakt ontbrekende sloten voor één dag (open-dag workflow + lazy generatie). */
  async ensureSlotsForCalendarDate(calendarId: string, slotDate: Date, cal: CalSlotSchedule) {
    await this.reconcileCalendarDaySlots(calendarId, slotDate, cal);
  }

  /**
   * Zorgt dat sloten overeenkomen met agenda-uren. Voegt ontbrekende toe, verwijdert verkeerde
   * sloten zonder boeking (per startuur — boekingen blokkeren niet de hele dag).
   */
  private async reconcileCalendarDaySlots(
    calendarId: string,
    slotDate: Date,
    cal: CalSlotSchedule,
  ) {
    const ymd = slotDateToYmd(slotDate);
    const dateOnly = parseYmd(ymd);
    const { gte: dayGte, lte: dayLte } = slotDateDayRange(dateOnly);
    const expected = buildSlotRowsForCalendar(cal);
    const existing = await this.prisma.agendaSlot.findMany({
      where: { calendarId, slotDate: { gte: dayGte, lte: dayLte } },
      select: { id: true, startTime: true, endTime: true },
    });

    const expectedByStart = new Map(
      expected.map((r) => [normTime(r.startTime), { startTime: normTime(r.startTime), endTime: normTime(r.endTime) }]),
    );

    for (const s of existing) {
      let startNorm: string;
      try {
        startNorm = normTime(s.startTime);
      } catch {
        startNorm = '';
      }
      const exp = expectedByStart.get(startNorm);
      const endMatches = exp ? normTime(s.endTime) === exp.endTime : false;
      if (exp && endMatches) {
        expectedByStart.delete(startNorm);
        continue;
      }
      const bc = await this.prisma.agendaBooking.count({
        where: { slotId: s.id, ...activeBookingFilter },
      });
      if (bc > 0) continue;
      await this.prisma.agendaSlot.delete({ where: { id: s.id } });
    }

    for (const row of expectedByStart.values()) {
      await this.prisma.agendaSlot.create({
        data: {
          calendarId,
          slotDate: dateOnly,
          startTime: row.startTime,
          endTime: row.endTime,
          capacity: cal.capacity,
          status: 'open',
        },
      });
    }
  }

  /** Vernieuwt sloten voor alle open dagen (vanaf vandaag) na wijziging agenda-uren. */
  private async reconcileOpenDaySlotsAfterScheduleChange(calendarId: string, cal: CalSlotSchedule) {
    const todayYmd = ymdEuropeBrussels(new Date());
    const openRows = await this.prisma.agendaOpenDay.findMany({
      where: { calendarId },
      select: { openDate: true, repeatYearly: true },
    });
    const from = parseYmd(todayYmd);
    const to = new Date(from.getTime() + 400 * 24 * 60 * 60 * 1000);
    const ymdSet = this.openDayYmdSetInRange(from, to, openRows);
    for (const ymd of [...ymdSet].sort()) {
      if (ymd < todayYmd) continue;
      await this.reconcileCalendarDaySlots(calendarId, parseYmd(ymd), cal);
    }
  }

  /** Vervangt verkeerde opleidingssloten (bijv. oude 1-uurs blokken) door één 14:00–17:00 slot zolang er geen boeking is. */
  private async reconcileOpleidingDaySlots(
    calendarId: string,
    slotDate: Date,
    cal: CalSlotSchedule,
  ) {
    const ymd = slotDateToYmd(slotDate);
    const dateOnly = parseYmd(ymd);
    const { gte: dayGte, lte: dayLte } = slotDateDayRange(dateOnly);
    const rows = await this.prisma.agendaSlot.findMany({
      where: { calendarId, slotDate: { gte: dayGte, lte: dayLte } },
    });
    const expectStart = normTime('14:00');
    const expectEnd = normTime('17:00');
    const ok =
      rows.length === 1 &&
      normTime(rows[0].startTime) === expectStart &&
      normTime(rows[0].endTime) === expectEnd;
    if (ok) return;
    for (const s of rows) {
      const bc = await this.prisma.agendaBooking.count({
        where: { slotId: s.id, ...activeBookingFilter },
      });
      if (bc > 0) return;
    }
    await this.prisma.agendaSlot.deleteMany({ where: { calendarId, slotDate: { gte: dayGte, lte: dayLte } } });
    await this.ensureSlotsForCalendarDate(calendarId, dateOnly, cal);
  }

  async listActiveCalendars() {
    return this.prisma.agendaCalendar.findMany({
      where: { active: true, publicBooking: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        color: true,
        durationMinutes: true,
        capacity: true,
      },
    });
  }

  async getFieldsForSlug(slug: string) {
    const cal = await this.prisma.agendaCalendar.findFirst({
      where: { slug, active: true },
    });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');
    const rows = await this.prisma.agendaField.findMany({
      where: { calendarId: cal.id, active: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return {
      calendar: {
        slug: cal.slug,
        title: cal.title,
        color: cal.color,
        showEndTimeOnPublic: cal.showEndTimeOnPublic,
      },
      fields: rows.map((f) => ({
        fieldKey: f.fieldKey,
        label: f.label,
        type: f.type,
        required: f.required,
        width: f.width,
        placeholder: f.placeholder,
        titlePosition: f.titlePosition,
        options: f.options ? f.options.split('\n').map((x) => x.trim()).filter(Boolean) : [],
      })),
    };
  }

  async getSlots(slug: string, fromStr?: string, toStr?: string) {
    const cal = await this.prisma.agendaCalendar.findFirst({
      where: { slug, active: true, publicBooking: true },
    });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');

    const today = new Date();
    const from = fromStr ? parseYmd(fromStr) : parseYmd(ymdEuropeBrussels(today));
    let to = toStr
      ? parseYmd(toStr)
      : new Date(from.getTime() + 45 * 24 * 60 * 60 * 1000);

    if (to < from) throw new BadRequestException('Datum tot moet na vanaf liggen');

    const closedSet = await this.closedDayYmdSet(cal.id, from, to);
    const openYmdSet = await this.openDayYmdSetForCalendarIfRestricted(cal, from, to);
    await this.materializeGuestSlotsInRange(cal, from, to, closedSet, openYmdSet);

    const now = new Date();
    const deduped = await this.collectGuestVisibleBookableSlotsDeduped(cal, from, to, now, closedSet, openYmdSet);

    const openDates =
      openYmdSet && usesOpenDayMode(cal.restrictToOpenDays)
        ? [...openYmdSet].filter((ymd) => !closedSet.has(ymd)).sort()
        : undefined;

    return {
      calendar: {
        id: cal.id,
        slug: cal.slug,
        title: cal.title,
        color: cal.color,
        durationMinutes: cal.durationMinutes,
        capacityDefault: cal.capacity,
        showEndTimeOnPublic: cal.showEndTimeOnPublic,
      },
      openDates,
      slots: deduped.map((s) => ({
        id: s.id,
        slotDate: s.slotDate.toISOString().slice(0, 10),
        startTime: s.startTime.slice(0, 5),
        endTime: s.endTime.slice(0, 5),
        capacity: s.capacity,
        booked: s.booked,
        remaining: s.remaining,
      })),
    };
  }

  async book(dto: BookAgendaDto, userId: string | null, uploadedFieldUrls: Record<string, string> = {}) {
    const slot = await this.prisma.agendaSlot.findUnique({
      where: { id: dto.slotId },
      include: { calendar: true },
    });
    if (!slot || slot.status !== 'open') throw new NotFoundException('Moment niet gevonden');
    const cal = slot.calendar;
    if (!cal.active || !cal.publicBooking) throw new BadRequestException('Deze agenda is niet beschikbaar');

    const closed = await this.prisma.agendaClosedDay.findUnique({
      where: { calendarId_closedDate: { calendarId: cal.id, closedDate: slot.slotDate } },
    });
    if (closed) throw new BadRequestException('Deze dag is niet beschikbaar.');

    if (usesOpenDayMode(cal.restrictToOpenDays)) {
      const openRows = await this.prisma.agendaOpenDay.findMany({
        where: { calendarId: cal.id },
        select: { openDate: true, repeatYearly: true },
      });
      const ymd = slotDateToYmd(slot.slotDate);
      const day = parseYmd(ymd);
      const allowed = this.openDayYmdSetInRange(day, day, openRows);
      if (!allowed.has(ymd)) {
        throw new BadRequestException('Deze dag staat niet open voor online boekingen.');
      }
    }

    const myActiveBookings = userId
      ? await this.prisma.agendaBooking.findMany({
          where: { userId, calendarId: cal.id, ...activeBookingFilter },
          select: { slotId: true },
        })
      : [];
    const mineOnThisSlot = myActiveBookings.filter((b) => b.slotId === slot.id).length;
    const booked = await this.prisma.agendaBooking.count({
      where: { slotId: slot.id, ...activeBookingFilter },
    });
    const cap = effectiveSlotCapacity(slot.capacity, cal.capacity);
    const room = cap - booked + mineOnThisSlot;
    if (room <= 0) throw new ConflictException('Dit moment is niet meer beschikbaar');

    const fieldsDef = await this.prisma.agendaField.findMany({
      where: { calendarId: cal.id, active: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const fieldsJson: Record<string, string> = { ...dto.fields, ...uploadedFieldUrls };
    let firstname = '';
    let lastname = '';
    let email = '';
    let phone = '';
    let nameParts: string[] = [];

    const webGuest = !userId;

    for (const f of fieldsDef) {
      const val = fieldsJson[f.fieldKey] ?? '';
      if (f.type === 'file') {
        if (!webGuest && f.required && (!val || val.trim() === '')) {
          throw new BadRequestException(`Verplicht veld ontbreekt: ${f.label}`);
        }
        continue;
      }
      const required = webGuest
        ? !isGuestBookingOptionalFieldKey(f.fieldKey, f.type)
        : f.required;
      if (required && (!val || val.trim() === '')) {
        throw new BadRequestException(`Verplicht veld ontbreekt: ${f.label}`);
      }
      if (f.fieldKey === 'voornaam') firstname = val;
      if (f.fieldKey === 'familienaam') lastname = val;
      if (f.fieldKey === 'email') email = val;
      if (f.fieldKey === 'telefoon' || f.fieldKey === 'phone') phone = val;
      if (['voornaam', 'familienaam', 'naam'].includes(f.fieldKey) && val) nameParts.push(val);
    }

    if (webGuest) {
      const dob = (fieldsJson.geboortedatum ?? '').trim();
      if (dob && isMinorFromIsoDateString(dob)) {
        const minorErr = validateGuestMinorParentFields(fieldsJson);
        if (minorErr) throw new BadRequestException(minorErr);
      }
    }

    let name = nameParts.filter(Boolean).join(' ').trim();

    if (userId && (!firstname || !lastname || !email || !phone || !name)) {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true, phone: true },
      });
      if (u) {
        if (!firstname && u.firstName) firstname = u.firstName;
        if (!lastname && u.lastName) lastname = u.lastName;
        if (!email && u.email) email = u.email;
        if (!phone && u.phone) phone = u.phone;
        if (!name) name = [firstname, lastname].filter(Boolean).join(' ').trim();
      }
    }

    const startNorm = normTime(slot.startTime);
    const endNorm = normTime(slot.endTime);
    const startAt = combineBrusselsLocalToUtc(slot.slotDate, startNorm);
    const endAt = combineBrusselsLocalToUtc(slot.slotDate, endNorm);
    const cancelToken = randomUUID();

    const booking = await this.prisma.$transaction(async (tx) => {
      if (userId) {
        await tx.agendaBooking.updateMany({
          where: { userId, calendarId: cal.id, ...activeBookingFilter },
          data: { status: 'cancelled' },
        });
      }
      const bookedAfter = await tx.agendaBooking.count({
        where: { slotId: slot.id, ...activeBookingFilter },
      });
      if (bookedAfter >= cap) {
        throw new ConflictException('Dit moment is niet meer beschikbaar');
      }
      return tx.agendaBooking.create({
        data: {
          calendarId: cal.id,
          slotId: slot.id,
          userId: userId ?? undefined,
          startAt,
          endAt,
          status: userId ? 'confirmed' : 'pending',
          name: name || null,
          firstname: firstname || null,
          lastname: lastname || null,
          email: email || null,
          phone: phone || null,
          fieldsJson: fieldsJson as object,
          source: userId ? 'portal-model' : 'web',
          cancelToken,
        },
      });
    });

    const hideCancelLink = process.env.AGENDA_HIDE_CANCEL_LINK === '1';
    const bookingSuccessPayload = (): {
      success: true;
      bookingId: string;
      cancelUrl?: string;
    } => {
      const out: { success: true; bookingId: string; cancelUrl?: string } = {
        success: true,
        bookingId: booking.id,
      };
      if (!hideCancelLink) {
        out.cancelUrl = `${webPublicBase()}/portal/guest/annuleer?token=${encodeURIComponent(cancelToken)}`;
      }
      return out;
    };

    /** Na commit: mail/SMS/labels mogen NOOIT meer een 500 geven (Nest → “Internal server error”). */
    try {
      const cancelUrl = `${webPublicBase()}/portal/guest/annuleer?token=${encodeURIComponent(cancelToken)}`;
      const confirmUrl = `${webPublicBase()}/portal/guest/bevestig?token=${encodeURIComponent(cancelToken)}`;
      let dateLabel: string;
      try {
        dateLabel = new Intl.DateTimeFormat('nl-BE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(slot.slotDate);
      } catch {
        dateLabel = slot.slotDate.toISOString().slice(0, 10);
      }
      const st = String(slot.startTime ?? '');
      const et = String(slot.endTime ?? '');
      const showEnd = cal.showEndTimeOnPublic !== false;
      const timeLabel = showEnd ? `${st.slice(0, 5)} – ${et.slice(0, 5)}` : st.slice(0, 5);

      void this.notifications
        .dispatchBookingLifecycle('booking_created', {
          bookingId: booking.id,
          toEmail: email || null,
          phone: phone || null,
          displayName: name || firstname || 'klant',
          calendarTitle: String(cal.title ?? ''),
          calendarSlug: String(cal.slug ?? ''),
          bookingStatus: booking.status,
          dateLabel,
          timeLabel,
          cancelUrl,
          confirmUrl,
        })
        .catch((err) => {
          this.log.warn(
            `dispatchBookingLifecycle (async): ${err instanceof Error ? err.message : String(err)}`,
          );
        });

      if (userId) {
        const ymd = slot.slotDate.toISOString().slice(0, 10);
        void this.modelHistory.log(userId, 'agenda_booked', {
          calendarSlug: cal.slug,
          calendarTitle: cal.title,
          slotDate: ymd,
          startTime: st.slice(0, 5),
          endTime: et.slice(0, 5),
          bookingId: booking.id,
          source: 'portal-model',
        });
      }

      return bookingSuccessPayload();
    } catch (e) {
      this.log.error(
        `Agenda book: post-commit pad gefaald — boeking ${booking.id} staat wél in de database: ${e instanceof Error ? e.message : String(e)}`,
        e instanceof Error ? e.stack : undefined,
      );
      return bookingSuccessPayload();
    }
  }

  async getMyBooking(userId: string, slug: string) {
    const cal = await this.prisma.agendaCalendar.findFirst({
      where: { slug, active: true },
    });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');
    const booking = await this.prisma.agendaBooking.findFirst({
      where: { userId, calendarId: cal.id, ...activeBookingFilter },
      include: { slot: true },
      orderBy: { startAt: 'desc' },
    });
    if (!booking) return { booking: null };
    const ymd = booking.slot.slotDate.toISOString().slice(0, 10);
    return {
      booking: {
        id: booking.id,
        slotId: booking.slotId,
        slotDate: ymd,
        startTime: booking.slot.startTime.slice(0, 5),
        endTime: booking.slot.endTime.slice(0, 5),
        status: booking.status,
      },
    };
  }

  async cancelMyBooking(userId: string, slug: string) {
    const cal = await this.prisma.agendaCalendar.findFirst({
      where: { slug, active: true },
    });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');
    const booking = await this.prisma.agendaBooking.findFirst({
      where: { userId, calendarId: cal.id, ...activeBookingFilter },
      include: { slot: true, calendar: { select: { slug: true, title: true } } },
    });
    if (!booking) throw new NotFoundException('Geen actieve afspraak.');
    await this.prisma.agendaBooking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });
    const dateLabel = new Intl.DateTimeFormat('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(booking.slot.slotDate);
    const timeLabel = `${booking.slot.startTime.slice(0, 5)} – ${booking.slot.endTime.slice(0, 5)}`;
    const tok = booking.cancelToken?.trim() || '';
    const cancelUrl = tok
      ? `${webPublicBase()}/portal/guest/annuleer?token=${encodeURIComponent(tok)}`
      : `${webPublicBase()}/portal/guest`;
    const confirmUrl = tok
      ? `${webPublicBase()}/portal/guest/bevestig?token=${encodeURIComponent(tok)}`
      : `${webPublicBase()}/portal/guest`;
    void this.notifications.dispatchBookingLifecycle('booking_cancelled', {
      bookingId: booking.id,
      toEmail: booking.email,
      phone: booking.phone,
      bookingStatus: 'cancelled',
      displayName:
        booking.name || [booking.firstname, booking.lastname].filter(Boolean).join(' ').trim() || 'klant',
      calendarTitle: booking.calendar.title,
      calendarSlug: booking.calendar.slug,
      dateLabel,
      timeLabel,
      cancelUrl,
      confirmUrl,
    });
    const ymd = booking.slot.slotDate.toISOString().slice(0, 10);
    void this.modelHistory.log(userId, 'agenda_cancelled', {
      calendarSlug: cal.slug,
      calendarTitle: cal.title,
      slotDate: ymd,
      startTime: booking.slot.startTime.slice(0, 5),
      endTime: booking.slot.endTime.slice(0, 5),
      bookingId: booking.id,
    });
    return { ok: true as const };
  }

  /** Publiek: enkel agenda + slot (geen naam/e-mail) voor annuleerpagina. */
  async getCancelPreviewByToken(raw: string) {
    const token = raw?.trim();
    if (!token) throw new BadRequestException('Token ontbreekt');
    const booking = await this.prisma.agendaBooking.findUnique({
      where: { cancelToken: token },
      include: { calendar: { select: { title: true, slug: true } }, slot: true },
    });
    if (!booking) throw new NotFoundException('Afspraak niet gevonden of link verlopen.');
    const alreadyCancelled = isCancelledStatus(booking.status);
    return {
      calendarSlug: booking.calendar.slug,
      calendarTitle: booking.calendar.title,
      slotDate: booking.slot.slotDate.toISOString().slice(0, 10),
      startTime: booking.slot.startTime.slice(0, 5),
      endTime: booking.slot.endTime.slice(0, 5),
      alreadyCancelled,
    };
  }

  async cancelByToken(dto: CancelAgendaDto) {
    const token = dto.token?.trim();
    if (!token) throw new BadRequestException('Token ontbreekt');

    const booking = await this.prisma.agendaBooking.findUnique({
      where: { cancelToken: token },
      include: { calendar: { select: { title: true, slug: true } }, slot: true },
    });
    if (!booking) throw new NotFoundException('Afspraak niet gevonden of link verlopen.');

    if (['cancelled', 'cancelled_cm', 'geannuleerd'].includes(booking.status)) {
      return {
        ok: true,
        alreadyCancelled: true as const,
        title: booking.calendar.title,
        calendarSlug: booking.calendar.slug,
      };
    }

    const reason = dto.reason?.trim();
    if (!reason || reason.length < 3) {
      throw new BadRequestException('Reden voor annulatie is verplicht (minstens 3 tekens).');
    }

    const prevFj = booking.fieldsJson as Record<string, unknown> | null;
    const merged = mergeBookingFieldsJson(prevFj ?? {}, {});
    merged.annulatie_reden = reason;
    if (dto.wantsNewAppointment) merged.annulatie_nieuwe_afspraak_gewenst = 'ja';

    await this.prisma.agendaBooking.update({
      where: { id: booking.id },
      data: { status: 'cancelled', fieldsJson: merged },
    });

    const dateLabel = new Intl.DateTimeFormat('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(booking.slot.slotDate);
    const timeLabel = `${booking.slot.startTime.slice(0, 5)} – ${booking.slot.endTime.slice(0, 5)}`;
    const cancelUrl = `${webPublicBase()}/portal/guest/annuleer?token=${encodeURIComponent(token)}`;
    const confirmUrl = `${webPublicBase()}/portal/guest/bevestig?token=${encodeURIComponent(token)}`;
    void this.notifications.dispatchBookingLifecycle('booking_cancelled', {
      bookingId: booking.id,
      toEmail: booking.email,
      phone: booking.phone,
      bookingStatus: 'cancelled',
      displayName:
        booking.name || [booking.firstname, booking.lastname].filter(Boolean).join(' ').trim() || 'klant',
      calendarTitle: booking.calendar.title,
      calendarSlug: booking.calendar.slug,
      dateLabel,
      timeLabel,
      cancelUrl,
      confirmUrl,
    });

    if (booking.userId && booking.slot) {
      const ymd = booking.slot.slotDate.toISOString().slice(0, 10);
      void this.modelHistory.log(booking.userId, 'agenda_cancelled_via_link', {
        calendarSlug: booking.calendar.slug,
        calendarTitle: booking.calendar.title,
        slotDate: ymd,
        startTime: booking.slot.startTime.slice(0, 5),
        endTime: booking.slot.endTime.slice(0, 5),
        bookingId: booking.id,
      });
    }

    return {
      ok: true,
      alreadyCancelled: false as const,
      title: booking.calendar.title,
      calendarSlug: booking.calendar.slug,
    };
  }

  /** Publiek: mag deze boeking nu bevestigd worden? (zelfde token als annuleren) */
  async getConfirmAttendancePreview(raw: string) {
    const token = raw?.trim();
    if (!token) throw new BadRequestException('Token ontbreekt');

    const booking = await this.prisma.agendaBooking.findUnique({
      where: { cancelToken: token },
      include: { calendar: { select: { title: true } }, slot: true },
    });
    if (!booking) throw new NotFoundException('Afspraak niet gevonden of link ongeldig.');

    if (['cancelled', 'cancelled_cm', 'geannuleerd'].includes(booking.status)) {
      return {
        ok: false,
        cancelled: true,
        title: booking.calendar.title,
        canConfirm: false,
        message: 'Deze afspraak is geannuleerd.',
      };
    }

    const now = new Date();
    const canConfirm = canConfirmAttendanceNow(
      booking.slot.slotDate,
      booking.slot.endTime,
      now,
      booking.endAt,
    );

    return {
      ok: true,
      cancelled: false,
      title: booking.calendar.title,
      alreadyAcknowledged: booking.status === 'acknowledged',
      canConfirm,
      appointmentYmd: ymdEuropeBrussels(booking.slot.slotDate),
      todayYmd: ymdEuropeBrussels(now),
      timeLabel: `${booking.slot.startTime.slice(0, 5)} – ${booking.slot.endTime.slice(0, 5)}`,
      message:
        canConfirm ?
          null
        : confirmAttendanceBlockedMessage(
            booking.slot.slotDate,
            booking.slot.startTime,
            booking.slot.endTime,
            now,
          ),
    };
  }

  /**
   * Gast bevestigt komst — dag vóór afspraak, of op afspraakdag tot einde tijdslot (Europe/Brussels).
   * Zelfde token als annuleren.
   */
  async confirmAttendanceByToken(raw: string) {
    const token = raw?.trim();
    if (!token) throw new BadRequestException('Token ontbreekt');

    const booking = await this.prisma.agendaBooking.findUnique({
      where: { cancelToken: token },
      include: { calendar: { select: { title: true, slug: true } }, slot: true },
    });
    if (!booking) throw new NotFoundException('Afspraak niet gevonden of link ongeldig.');

    if (['cancelled', 'cancelled_cm', 'geannuleerd'].includes(booking.status)) {
      throw new BadRequestException('Deze afspraak is geannuleerd.');
    }

    if (
      !canConfirmAttendanceNow(
        booking.slot.slotDate,
        booking.slot.endTime,
        new Date(),
        booking.endAt,
      )
    ) {
      throw new BadRequestException(
        confirmAttendanceBlockedMessage(
          booking.slot.slotDate,
          booking.slot.startTime,
          booking.slot.endTime,
        ),
      );
    }

    if (booking.status === 'acknowledged') {
      return { ok: true, alreadyAcknowledged: true as const, title: booking.calendar.title };
    }

    await this.prisma.agendaBooking.update({
      where: { id: booking.id },
      data: { status: 'acknowledged' },
    });

    const dateLabel = new Intl.DateTimeFormat('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(booking.slot.slotDate);
    const timeLabel = `${booking.slot.startTime.slice(0, 5)} – ${booking.slot.endTime.slice(0, 5)}`;
    const cancelUrl = `${webPublicBase()}/portal/guest/annuleer?token=${encodeURIComponent(token)}`;
    const confirmUrl = `${webPublicBase()}/portal/guest/bevestig?token=${encodeURIComponent(token)}`;
    void this.notifications.dispatchBookingLifecycle('booking_confirmed', {
      bookingId: booking.id,
      toEmail: booking.email,
      phone: booking.phone,
      bookingStatus: 'acknowledged',
      displayName:
        booking.name || [booking.firstname, booking.lastname].filter(Boolean).join(' ').trim() || 'klant',
      calendarTitle: booking.calendar.title,
      calendarSlug: booking.calendar.slug,
      dateLabel,
      timeLabel,
      cancelUrl,
      confirmUrl,
    });

    if (booking.userId) {
      const ymd = booking.slot.slotDate.toISOString().slice(0, 10);
      void this.modelHistory.log(booking.userId, 'agenda_attendance_confirmed', {
        calendarSlug: booking.calendar.slug,
        calendarTitle: booking.calendar.title,
        slotDate: ymd,
        startTime: booking.slot.startTime.slice(0, 5),
        endTime: booking.slot.endTime.slice(0, 5),
        bookingId: booking.id,
      });
    }

    return { ok: true, alreadyAcknowledged: false as const, title: booking.calendar.title };
  }

  /** Admin */

  async adminListBookings(calendarSlug?: string, limit = 100) {
    const where: Prisma.AgendaBookingWhereInput = {};
    if (calendarSlug) {
      const c = await this.prisma.agendaCalendar.findFirst({ where: { slug: calendarSlug } });
      if (!c) return [];
      where.calendarId = c.id;
    }
    return this.prisma.agendaBooking.findMany({
      where,
      orderBy: { startAt: 'desc' },
      take: Math.min(limit, 500),
      include: {
        calendar: { select: { slug: true, title: true } },
        slot: true,
      },
    });
  }

  async adminListCalendars() {
    return this.prisma.agendaCalendar.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  }

  async adminCreateSlot(dto: CreateAgendaSlotDto) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { id: dto.calendarId } });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');
    const slotDate = parseYmd(dto.slotDate);
    const start = normTime(dto.startTime);
    const end = normTime(dto.endTime);
    return this.prisma.agendaSlot.create({
      data: {
        calendarId: cal.id,
        slotDate,
        startTime: start,
        endTime: end,
        capacity: dto.capacity ?? cal.capacity ?? 1,
        status: 'open',
      },
    });
  }

  async adminDeleteSlot(slotId: string) {
    const slot = await this.prisma.agendaSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundException();
    const bookings = await this.prisma.agendaBooking.count({
      where: { slotId, ...activeBookingFilter },
    });
    if (bookings > 0) throw new ConflictException('Slot heeft nog actieve boekingen');
    await this.prisma.agendaSlot.delete({ where: { id: slotId } });
    return { ok: true };
  }

  async adminOverview() {
    await ensureDefaultAgendaCalendars(this.prisma);
    const calendars = await this.prisma.agendaCalendar.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    const todayYmd = ymdEuropeBrussels(new Date());
    const todayStart = parseYmdDayStart(todayYmd);

    const enriched = await Promise.all(
      calendars.map(async (c) => {
        try {
          const openSlotsFuture = await this.prisma.agendaSlot.count({
            where: {
              calendarId: c.id,
              status: 'open',
              slotDate: { gte: todayStart },
            },
          });
          const bookingsCount = await this.prisma.agendaBooking.count({
            where: { calendarId: c.id, ...activeBookingFilter },
          });
          return { ...c, openSlotsFuture, bookingsCount };
        } catch (e) {
          this.log.warn(`adminOverview ${c.slug}: ${e instanceof Error ? e.message : String(e)}`);
          const bookingsCount = await this.prisma.agendaBooking.count({
            where: { calendarId: c.id, ...activeBookingFilter },
          }).catch(() => 0);
          return { ...c, openSlotsFuture: 0, bookingsCount };
        }
      }),
    );

    return { calendars: enriched };
  }

  async adminEnsureDefaultCalendars() {
    return ensureDefaultAgendaCalendars(this.prisma);
  }

  async adminCreateCalendar(dto: CreateAgendaCalendarDto) {
    const clash = await this.prisma.agendaCalendar.findUnique({ where: { slug: dto.slug } });
    if (clash) throw new ConflictException('Deze slug bestaat al');

    const cal = await this.prisma.agendaCalendar.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description ?? '',
        color: dto.color ?? '#6f121b',
        durationMinutes: dto.durationMinutes ?? 60,
        capacity: dto.capacity ?? 1,
        active: dto.active ?? true,
        publicBooking: dto.publicBooking ?? true,
        sortOrder: dto.sortOrder ?? 100,
        restrictToOpenDays: dto.restrictToOpenDays ?? true,
        defaultDayStartTime: dto.defaultDayStartTime ? normTime(dto.defaultDayStartTime) : undefined,
        defaultDayEndTime: dto.defaultDayEndTime ? normTime(dto.defaultDayEndTime) : undefined,
        breakStart: dto.breakStart ? normTime(dto.breakStart) : undefined,
        breakEnd: dto.breakEnd ? normTime(dto.breakEnd) : undefined,
        slotStepMinutes: dto.slotStepMinutes ?? undefined,
        optionalSlotStarts: dto.optionalSlotStarts?.trim() ? dto.optionalSlotStarts.trim() : undefined,
        showEndTimeOnPublic: dto.showEndTimeOnPublic ?? true,
        weekdayOpenMask: dto.weekdayOpenMask ?? 0,
        planningTextOnColor: dto.planningTextOnColor === 'black' ? 'black' : 'white',
      },
    });

    await this.prisma.agendaField.createMany({
      data: DEFAULT_AGENDA_FIELD_SEED.map((r) => ({
        calendarId: cal.id,
        fieldKey: r.fieldKey,
        label: r.label,
        type: r.type,
        required: r.required,
        width: r.width,
        placeholder: r.placeholder,
        titlePosition: r.titlePosition,
        sortOrder: r.sortOrder,
        options: r.options,
        active: true,
      })),
    });

    return cal;
  }

  async adminUpdateCalendar(id: string, dto: UpdateAgendaCalendarDto) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { id } });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');
    if (dto.slug && dto.slug !== cal.slug) {
      const clash = await this.prisma.agendaCalendar.findUnique({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException('Deze slug bestaat al');
    }

    const data: Prisma.AgendaCalendarUpdateInput = {};
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.publicBooking !== undefined) data.publicBooking = dto.publicBooking;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.restrictToOpenDays !== undefined) data.restrictToOpenDays = dto.restrictToOpenDays;
    if (dto.defaultDayStartTime !== undefined) data.defaultDayStartTime = normTime(dto.defaultDayStartTime);
    if (dto.defaultDayEndTime !== undefined) data.defaultDayEndTime = normTime(dto.defaultDayEndTime);
    if (dto.breakStart !== undefined) data.breakStart = dto.breakStart ? normTime(dto.breakStart) : null;
    if (dto.breakEnd !== undefined) data.breakEnd = dto.breakEnd ? normTime(dto.breakEnd) : null;
    if (dto.slotStepMinutes !== undefined) data.slotStepMinutes = dto.slotStepMinutes;
    if (dto.optionalSlotStarts !== undefined) {
      data.optionalSlotStarts = dto.optionalSlotStarts?.trim() ? dto.optionalSlotStarts.trim() : null;
    }
    if (dto.showEndTimeOnPublic !== undefined) data.showEndTimeOnPublic = dto.showEndTimeOnPublic;
    if (dto.weekdayOpenMask !== undefined) data.weekdayOpenMask = dto.weekdayOpenMask;
    if (dto.planningTextOnColor !== undefined) {
      data.planningTextOnColor = dto.planningTextOnColor === 'black' ? 'black' : 'white';
    }

    const updated = await this.prisma.agendaCalendar.update({ where: { id }, data });

    const scheduleChanged =
      dto.defaultDayStartTime !== undefined ||
      dto.defaultDayEndTime !== undefined ||
      dto.breakStart !== undefined ||
      dto.breakEnd !== undefined ||
      dto.slotStepMinutes !== undefined ||
      dto.optionalSlotStarts !== undefined ||
      dto.durationMinutes !== undefined;

    if (scheduleChanged && usesOpenDayMode(updated.restrictToOpenDays)) {
      await this.reconcileOpenDaySlotsAfterScheduleChange(updated.id, updated);
    }

    if (dto.slug !== undefined && dto.slug !== cal.slug) {
      await this.syncNotificationTemplateSlugsAfterCalendarRename(cal.slug, dto.slug);
    }

    return updated;
  }

  /** Bij hernoemen van een agenda-slug: sjabloon-lijsten bijwerken zodat SMS/mail blijven matchen. */
  private async syncNotificationTemplateSlugsAfterCalendarRename(oldSlug: string, newSlug: string) {
    const templates = await this.prisma.agendaNotificationTemplate.findMany({
      select: { id: true, calendarSlugs: true },
    });
    for (const t of templates) {
      const slugs = parseSlugList(t.calendarSlugs);
      if (!slugs.includes(oldSlug)) continue;
      const next = slugs.map((s) => (s === oldSlug ? newSlug : s));
      await this.prisma.agendaNotificationTemplate.update({
        where: { id: t.id },
        data: { calendarSlugs: next as unknown as Prisma.InputJsonValue },
      });
    }
  }

  /** Alleen bestaande agenda-slugs bewaren (aangevinkt = expliciet in de lijst). */
  private async filterValidTemplateCalendarSlugs(slugs: string[] | undefined): Promise<string[]> {
    const input = (slugs ?? []).map((s) => s.trim()).filter(Boolean);
    if (!input.length) return [];
    const all = await this.prisma.agendaCalendar.findMany({ select: { slug: true } });
    const allSet = new Set(all.map((c) => c.slug));
    return input.filter((s) => allSet.has(s));
  }

  private async allCalendarSlugs(): Promise<string[]> {
    const all = await this.prisma.agendaCalendar.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { slug: true },
    });
    return all.map((c) => c.slug);
  }

  async adminDeleteCalendar(id: string) {
    await this.prisma.agendaCalendar.delete({ where: { id } });
    return { ok: true };
  }

  /** Admin: exact tijdvenster (start+eind); maakt een open slot aan indien nodig. */
  private async findOrCreateExactAdminSlot(
    cal: { id: string; capacity: number },
    slotDate: Date,
    start: string,
    end: string,
  ) {
    const startN = normTime(start);
    const endN = normTime(end);
    const candidates = await this.prisma.agendaSlot.findMany({
      where: { calendarId: cal.id, slotDate },
    });
    const exact = candidates.find(
      (s) => normTime(s.startTime) === startN && normTime(s.endTime) === endN,
    );
    if (exact) return exact;
    return this.prisma.agendaSlot.create({
      data: {
        calendarId: cal.id,
        slotDate,
        startTime: startN,
        endTime: endN,
        capacity: cal.capacity,
        status: 'open',
      },
    });
  }

  /** Handmatige boeking door admin (planning); maakt slot aan indien nodig. */
  async adminManualBooking(dto: CreateManualBookingDto) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { id: dto.calendarId } });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');
    const slotDate = parseYmd(dto.slotDate);
    const start = normTime(dto.startTime);
    let end: string;
    if (dto.endTime?.trim()) {
      end = normTime(dto.endTime);
    } else {
      const [h0, m0] = start.split(':').map((x) => parseInt(x, 10));
      let endMinTotal = h0 * 60 + m0 + cal.durationMinutes;
      if (endMinTotal >= 24 * 60) endMinTotal = 24 * 60 - 1;
      end = normTime(`${Math.floor(endMinTotal / 60)}:${endMinTotal % 60}:00`);
    }

    const slot = await this.findOrCreateExactAdminSlot(cal, slotDate, start, end);

    const booked = await this.prisma.agendaBooking.count({
      where: { slotId: slot.id, ...activeBookingFilter },
    });
    const cap = effectiveSlotCapacity(slot.capacity, cal.capacity);
    if (booked >= cap) throw new ConflictException('Dit tijdslot is vol.');

    const startNorm = normTime(slot.startTime);
    const endNorm = normTime(slot.endTime);
    const startAt = combineBrusselsLocalToUtc(slot.slotDate, startNorm);
    const endAt = combineBrusselsLocalToUtc(slot.slotDate, endNorm);
    const cancelToken = randomUUID();
    const name = dto.name?.trim() || 'Handmatig (admin)';

    const booking = await this.prisma.agendaBooking.create({
      data: {
        calendarId: cal.id,
        slotId: slot.id,
        startAt,
        endAt,
        status: 'pending',
        name,
        firstname: dto.firstname?.trim() || null,
        lastname: dto.lastname?.trim() || null,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        fieldsJson: {},
        source: 'admin',
        cancelToken,
      },
    });

    const email = dto.email?.trim();
    const phone = dto.phone?.trim();
    if (email || phone) {
      try {
        const dateLabel = new Intl.DateTimeFormat('nl-BE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(slotDate);
        const st = String(slot.startTime ?? '');
        const et = String(slot.endTime ?? '');
        const showEnd = cal.showEndTimeOnPublic !== false;
        const timeLabel = showEnd ? `${st.slice(0, 5)} – ${et.slice(0, 5)}` : st.slice(0, 5);
        const cancelUrl = `${webPublicBase()}/portal/guest/annuleer?token=${encodeURIComponent(cancelToken)}`;
        const confirmUrl = `${webPublicBase()}/portal/guest/bevestig?token=${encodeURIComponent(cancelToken)}`;
        void this.notifications
          .dispatchBookingLifecycle('booking_created', {
            bookingId: booking.id,
            toEmail: email || null,
            phone: phone || null,
            bookingStatus: booking.status,
            displayName: name,
            calendarTitle: String(cal.title ?? ''),
            calendarSlug: String(cal.slug ?? ''),
            dateLabel,
            timeLabel,
            cancelUrl,
            confirmUrl,
          })
          .catch((err) => {
            this.log.warn(
              `adminManualBooking dispatch (async): ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      } catch (e) {
        this.log.error(
          `adminManualBooking: melding na DB-create mislukt (boeking ${booking.id} bestaat wél): ${e instanceof Error ? e.message : String(e)}`,
          e instanceof Error ? e.stack : undefined,
        );
      }
    }

    return { bookingId: booking.id, slotId: slot.id };
  }

  async adminListSlots(q: AdminSlotsQueryDto) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { id: q.calendarId } });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');

    const from = q.from ? parseYmd(q.from) : new Date('1970-01-01T12:00:00.000Z');
    const to = q.to ? parseYmd(q.to) : new Date('2100-01-01T12:00:00.000Z');
    if (to < from) throw new BadRequestException('Datum tot moet na vanaf liggen');

    const rows = await this.prisma.agendaSlot.findMany({
      where: { calendarId: cal.id, slotDate: { gte: from, lte: to } },
      orderBy: [{ slotDate: 'asc' }, { startTime: 'asc' }],
    });

    const out = [];
    for (const s of rows) {
      const booked = await this.prisma.agendaBooking.count({
        where: { slotId: s.id, ...activeBookingFilter },
      });
      const cap = effectiveSlotCapacity(s.capacity, cal.capacity);
      out.push({
        id: s.id,
        slotDate: s.slotDate.toISOString().slice(0, 10),
        startTime: s.startTime.slice(0, 5),
        endTime: s.endTime.slice(0, 5),
        capacity: cap,
        status: s.status,
        booked,
        remaining: Math.max(0, cap - booked),
      });
    }
    return { calendar: { id: cal.id, slug: cal.slug, title: cal.title }, slots: out };
  }

  async adminBulkCreateSlots(dto: BulkAgendaSlotsDto) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { id: dto.calendarId } });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');

    for (const w of dto.weekdays) {
      if (w < 0 || w > 6) throw new BadRequestException('weekdays: gebruik 0 (zo) t/m 6 (za)');
    }

    const from = parseYmd(dto.fromDate);
    const to = parseYmd(dto.toDate);
    if (to < from) throw new BadRequestException('Datum tot moet na vanaf liggen');

    const start = normTime(dto.startTime);
    const end = normTime(dto.endTime);
    const cap = dto.capacity ?? cal.capacity ?? 1;
    const weekdaySet = new Set(dto.weekdays);

    let created = 0;
    const cursor = new Date(from);
    const endCursor = new Date(to);

    while (cursor.getTime() <= endCursor.getTime()) {
      if (weekdaySet.has(cursor.getUTCDay())) {
        const ymd = cursor.toISOString().slice(0, 10);
        const slotDate = parseYmd(ymd);

        const closed = await this.prisma.agendaClosedDay.findUnique({
          where: { calendarId_closedDate: { calendarId: cal.id, closedDate: slotDate } },
        });

        if (!closed) {
          const exists = await this.prisma.agendaSlot.findFirst({
            where: {
              calendarId: cal.id,
              slotDate,
              startTime: start,
              endTime: end,
            },
          });
          if (!exists) {
            await this.prisma.agendaSlot.create({
              data: {
                calendarId: cal.id,
                slotDate,
                startTime: start,
                endTime: end,
                capacity: cap,
                status: 'open',
              },
            });
            created += 1;
          }
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return { created };
  }

  async adminListClosedDays(calendarId: string) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { id: calendarId } });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');
    const rows = await this.prisma.agendaClosedDay.findMany({
      where: { calendarId },
      orderBy: { closedDate: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      closedDate: r.closedDate.toISOString().slice(0, 10),
      reason: r.reason,
    }));
  }

  async adminAddClosedDay(dto: CreateClosedDayDto) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { id: dto.calendarId } });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');
    const closedDate = parseYmd(dto.closedDate);
    return this.prisma.agendaClosedDay.upsert({
      where: { calendarId_closedDate: { calendarId: cal.id, closedDate } },
      create: {
        calendarId: cal.id,
        closedDate,
        reason: dto.reason ?? null,
      },
      update: { reason: dto.reason ?? null },
    });
  }

  async adminRemoveClosedDay(id: string) {
    try {
      await this.prisma.agendaClosedDay.delete({ where: { id } });
    } catch {
      throw new NotFoundException();
    }
    return { ok: true };
  }

  async adminCalendarMonth(q: AdminCalendarMonthQueryDto) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { id: q.calendarId } });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');

    const startRange = new Date(Date.UTC(q.year, q.month - 1, 1, 0, 0, 0, 0));
    const lastDay = new Date(Date.UTC(q.year, q.month, 0)).getUTCDate();
    const endRange = new Date(Date.UTC(q.year, q.month - 1, lastDay, 23, 59, 59, 999));

    const bookings = await this.prisma.agendaBooking.findMany({
      where: {
        calendarId: cal.id,
        slot: { slotDate: { gte: startRange, lte: endRange } },
        ...activeBookingFilter,
      },
      orderBy: { startAt: 'asc' },
      include: { slot: { select: { slotDate: true, startTime: true, endTime: true } } },
    });

    const slots = await this.prisma.agendaSlot.findMany({
      where: {
        calendarId: cal.id,
        slotDate: { gte: startRange, lte: endRange },
        status: 'open',
      },
      orderBy: [{ slotDate: 'asc' }, { startTime: 'asc' }],
    });

    const days: Record<
      string,
      {
        bookings: Array<{
          id: string;
          startAt: string;
          name: string | null;
          email: string | null;
          status: string;
        }>;
        openSlots: Array<{ id: string; startTime: string; endTime: string }>;
      }
    > = {};

    for (const b of bookings) {
      const key = slotDateToYmd(b.slot.slotDate);
      if (!days[key]) days[key] = { bookings: [], openSlots: [] };
      days[key].bookings.push({
        id: b.id,
        startAt: b.startAt.toISOString(),
        name: b.name,
        email: b.email,
        status: b.status,
      });
    }

    for (const s of slots) {
      const key = s.slotDate.toISOString().slice(0, 10);
      if (!days[key]) days[key] = { bookings: [], openSlots: [] };
      const booked = await this.prisma.agendaBooking.count({
        where: { slotId: s.id, ...activeBookingFilter },
      });
      const cap = effectiveSlotCapacity(s.capacity, cal.capacity);
      if (booked < cap) {
        days[key].openSlots.push({
          id: s.id,
          startTime: s.startTime.slice(0, 5),
          endTime: s.endTime.slice(0, 5),
        });
      }
    }

    return {
      calendar: { id: cal.id, slug: cal.slug, title: cal.title },
      year: q.year,
      month: q.month,
      days,
    };
  }

  async adminBookingsRange(q: AdminBookingsRangeQueryDto) {
    const fromStart = parseYmdDayStart(q.from);
    const toEnd = parseYmdDayEnd(q.to);
    if (toEnd < fromStart) throw new BadRequestException('Datum tot moet na vanaf liggen');

    const rawIds = q.calendarIds
      ? q.calendarIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const statusList = q.statuses
      ? q.statuses
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const statusFilter: Prisma.AgendaBookingWhereInput =
      statusList.length > 0 ? { status: { in: statusList } } : activeBookingFilter;

    const where: Prisma.AgendaBookingWhereInput = {
      slot: { slotDate: { gte: fromStart, lte: toEnd } },
      ...statusFilter,
    };
    if (rawIds.length) {
      where.calendarId = { in: rawIds };
    }

    const rows = await this.prisma.agendaBooking.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: {
        calendar: { select: { id: true, slug: true, title: true, color: true, planningTextOnColor: true } },
        slot: { select: { id: true, slotDate: true, startTime: true, endTime: true } },
      },
    });

    return rows.map((b) => ({
      id: b.id,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      status: b.status,
      name: b.name,
      firstname: b.firstname,
      lastname: b.lastname,
      email: b.email,
      phone: b.phone,
      calendar: b.calendar,
      slot: {
        id: b.slot.id,
        slotDate: b.slot.slotDate.toISOString().slice(0, 10),
        startTime: b.slot.startTime,
        endTime: b.slot.endTime,
      },
      fieldsJson: b.fieldsJson as Record<string, unknown>,
    }));
  }

  async adminGetBooking(id: string) {
    const b = await this.prisma.agendaBooking.findUnique({
      where: { id },
      include: {
        calendar: { select: { id: true, slug: true, title: true, color: true, planningTextOnColor: true } },
        slot: true,
      },
    });
    if (!b) throw new NotFoundException('Boeking niet gevonden');
    return {
      id: b.id,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      status: b.status,
      name: b.name,
      firstname: b.firstname,
      lastname: b.lastname,
      email: b.email,
      phone: b.phone,
      fieldsJson: b.fieldsJson as Record<string, unknown>,
      calendar: b.calendar,
      slot: {
        id: b.slot.id,
        slotDate: b.slot.slotDate.toISOString().slice(0, 10),
        startTime: b.slot.startTime,
        endTime: b.slot.endTime,
      },
    };
  }

  async adminPatchBooking(id: string, dto: UpdateAdminBookingDto) {
    const b = await this.prisma.agendaBooking.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!b) throw new NotFoundException('Boeking niet gevonden');

    const wantsMove =
      dto.calendarId !== undefined ||
      dto.slotDate !== undefined ||
      dto.startTime !== undefined ||
      dto.endTime !== undefined;

    const data: Prisma.AgendaBookingUpdateInput = {};

    if (wantsMove) {
      const targetCalId = dto.calendarId ?? b.calendarId;
      const cal = await this.prisma.agendaCalendar.findUnique({ where: { id: targetCalId } });
      if (!cal) throw new NotFoundException('Agenda niet gevonden');

      const slotDate = dto.slotDate ? parseYmd(dto.slotDate) : b.slot.slotDate;
      const startT = dto.startTime !== undefined ? normTime(dto.startTime) : normTime(b.slot.startTime);
      let endT: string;
      if (dto.endTime !== undefined) {
        endT = normTime(dto.endTime);
      } else if (dto.startTime !== undefined || dto.slotDate !== undefined || dto.calendarId !== undefined) {
        const [h0, m0] = startT.split(':').map((x) => parseInt(x, 10));
        let endMinTotal = h0 * 60 + m0 + cal.durationMinutes;
        if (endMinTotal >= 24 * 60) endMinTotal = 24 * 60 - 1;
        endT = normTime(`${Math.floor(endMinTotal / 60)}:${endMinTotal % 60}:00`);
      } else {
        endT = normTime(b.slot.endTime);
      }

      const slot = await this.findOrCreateExactAdminSlot(cal, slotDate, startT, endT);
      const bookedOthers = await this.prisma.agendaBooking.count({
        where: { slotId: slot.id, id: { not: b.id }, ...activeBookingFilter },
      });
      const cap = effectiveSlotCapacity(slot.capacity, cal.capacity);
      if (bookedOthers >= cap) throw new ConflictException('Dit tijdslot is vol.');

      const startNorm = normTime(slot.startTime);
      const endNorm = normTime(slot.endTime);
      data.slot = { connect: { id: slot.id } };
      data.calendar = { connect: { id: cal.id } };
      data.startAt = combineBrusselsLocalToUtc(slot.slotDate, startNorm);
      data.endAt = combineBrusselsLocalToUtc(slot.slotDate, endNorm);
    }

    const nextStatus = dto.status !== undefined ? dto.status : b.status;
    const nextName = dto.name !== undefined ? dto.name : b.name;
    const nextFirstname = dto.firstname !== undefined ? dto.firstname : b.firstname;
    const nextLastname = dto.lastname !== undefined ? dto.lastname : b.lastname;
    const nextEmail = dto.email !== undefined ? dto.email : b.email;
    const nextPhone = dto.phone !== undefined ? dto.phone : b.phone;
    const mergedFj = mergeBookingFieldsJson(b.fieldsJson, dto.fieldsJson);

    if (isCancelledStatus(nextStatus) && !fjStr(mergedFj, 'annulatie_reden')) {
      throw new BadRequestException('Reden van annulatie is verplicht wanneer de status geannuleerd is.');
    }

    if (dto.status !== undefined) data.status = dto.status;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.firstname !== undefined) data.firstname = dto.firstname;
    if (dto.lastname !== undefined) data.lastname = dto.lastname;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    data.fieldsJson = mergedFj as object;

    return this.prisma.agendaBooking.update({ where: { id }, data });
  }

  async adminDeleteBooking(id: string) {
    try {
      await this.prisma.agendaBooking.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Boeking niet gevonden');
    }
    return { ok: true };
  }

  async adminBulkDeleteBookings(ids: string[]) {
    const uniq = [...new Set(ids.filter(Boolean))];
    if (!uniq.length) return { ok: true as const, deleted: 0 };
    const res = await this.prisma.agendaBooking.deleteMany({ where: { id: { in: uniq } } });
    return { ok: true as const, deleted: res.count };
  }

  async adminReorderNotificationTemplates(orderedIds: string[]) {
    const all = await this.prisma.agendaNotificationTemplate.findMany({ select: { id: true } });
    if (all.length === 0) return [];
    if (all.length !== orderedIds.length) {
      throw new BadRequestException(`Geef precies ${all.length} sjabloon-id's in de gewenste volgorde.`);
    }
    const expected = new Set(all.map((x) => x.id));
    const seen = new Set<string>();
    for (const id of orderedIds) {
      if (!expected.has(id) || seen.has(id)) {
        throw new BadRequestException('Ongeldige of dubbele sjabloon-id in de volgorde.');
      }
      seen.add(id);
    }
    let order = 10;
    await this.prisma.$transaction(
      orderedIds.map((id) =>
        this.prisma.agendaNotificationTemplate.update({
          where: { id },
          data: { sortOrder: order++ },
        }),
      ),
    );
    return this.adminListNotificationTemplates();
  }

  async adminListNotificationTemplates() {
    return this.prisma.agendaNotificationTemplate.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async adminCreateNotificationTemplate(dto: CreateAgendaNotificationTemplateDto) {
    let slugs = await this.filterValidTemplateCalendarSlugs(dto.calendarSlugs);
    if (!slugs.length) slugs = await this.allCalendarSlugs();
    if (!slugs.length) {
      throw new BadRequestException('Selecteer minstens één agenda voor dit sjabloon.');
    }
    return this.prisma.agendaNotificationTemplate.create({
      data: {
        channel: dto.channel,
        name: dto.name,
        enabled: dto.enabled ?? false,
        trigger: dto.trigger,
        offsetMinutes: dto.offsetMinutes ?? 0,
        subject: dto.subject ?? null,
        body: dto.body,
        calendarSlugs: slugs as unknown as Prisma.InputJsonValue,
        enrollmentFilter:
          dto.enrollmentFilter && dto.enrollmentFilter !== 'all' ? dto.enrollmentFilter : null,
        sortOrder: dto.sortOrder ?? 100,
      },
    });
  }

  async adminUpdateNotificationTemplate(id: string, dto: UpdateAgendaNotificationTemplateDto) {
    const row = await this.prisma.agendaNotificationTemplate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Sjabloon niet gevonden');
    const data: Prisma.AgendaNotificationTemplateUpdateInput = {};
    if (dto.channel !== undefined) data.channel = dto.channel;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.trigger !== undefined) data.trigger = dto.trigger;
    if (dto.offsetMinutes !== undefined) data.offsetMinutes = dto.offsetMinutes;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.calendarSlugs !== undefined) {
      const slugs = await this.filterValidTemplateCalendarSlugs(dto.calendarSlugs);
      if (!slugs.length) {
        throw new BadRequestException('Selecteer minstens één agenda (aangevinkt = mail/SMS voor die agenda).');
      }
      data.calendarSlugs = slugs as unknown as Prisma.InputJsonValue;
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.enrollmentFilter !== undefined) {
      data.enrollmentFilter =
        dto.enrollmentFilter && dto.enrollmentFilter !== 'all' ? dto.enrollmentFilter : null;
    }
    return this.prisma.agendaNotificationTemplate.update({ where: { id }, data });
  }

  async adminDeleteNotificationTemplate(id: string) {
    try {
      await this.prisma.agendaNotificationTemplate.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Sjabloon niet gevonden');
    }
    return { ok: true as const };
  }

  async adminDuplicateNotificationTemplate(id: string) {
    const src = await this.prisma.agendaNotificationTemplate.findUnique({ where: { id } });
    if (!src) throw new NotFoundException('Sjabloon niet gevonden');
    return this.prisma.agendaNotificationTemplate.create({
      data: {
        channel: src.channel,
        name: `${src.name} (kopie)`,
        enabled: src.enabled,
        trigger: src.trigger,
        offsetMinutes: src.offsetMinutes,
        subject: src.subject,
        body: src.body,
        calendarSlugs: src.calendarSlugs as Prisma.InputJsonValue,
        enrollmentFilter: src.enrollmentFilter,
        sortOrder: src.sortOrder + 1,
      },
    });
  }

  async adminGetMessagingSettings() {
    const row = await this.prisma.agendaMessagingSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    return {
      bulksmsUsername: row.bulksmsUsername,
      hasBulksmsPassword: !!(row.bulksmsPassword && row.bulksmsPassword.length > 0),
    };
  }

  async adminPatchMessagingSettings(dto: UpdateAgendaMessagingSettingsDto) {
    return this.prisma.agendaMessagingSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        bulksmsUsername: dto.bulksmsUsername ?? null,
        bulksmsPassword: dto.bulksmsPassword ?? null,
      },
      update: {
        ...(dto.bulksmsUsername !== undefined ? { bulksmsUsername: dto.bulksmsUsername } : {}),
        ...(dto.bulksmsPassword !== undefined ? { bulksmsPassword: dto.bulksmsPassword } : {}),
      },
    });
  }

  async adminListOpenDays(q: AdminOpenDaysQueryDto) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { id: q.calendarId } });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');
    const rows = await this.prisma.agendaOpenDay.findMany({
      where: { calendarId: cal.id },
      orderBy: { openDate: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      openDate: r.openDate.toISOString().slice(0, 10),
      repeatYearly: r.repeatYearly,
    }));
  }

  async adminAddOpenDay(dto: CreateOpenDayDto) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { id: dto.calendarId } });
    if (!cal) throw new NotFoundException('Agenda niet gevonden');
    const openDate = parseYmd(dto.openDate);
    const row = await this.prisma.agendaOpenDay.upsert({
      where: { calendarId_openDate: { calendarId: cal.id, openDate } },
      create: {
        calendarId: cal.id,
        openDate,
        repeatYearly: dto.repeatYearly ?? false,
      },
      update: { repeatYearly: dto.repeatYearly ?? false },
    });
    await this.reconcileCalendarDaySlots(cal.id, openDate, cal);
    return row;
  }

  async adminRemoveOpenDay(id: string) {
    const row = await this.prisma.agendaOpenDay.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    await this.prisma.$transaction(async (tx) => {
      const slots = await tx.agendaSlot.findMany({
        where: { calendarId: row.calendarId, slotDate: row.openDate },
        select: { id: true },
      });
      for (const s of slots) {
        await tx.agendaBooking.deleteMany({ where: { slotId: s.id } });
        await tx.agendaSlot.delete({ where: { id: s.id } });
      }
      await tx.agendaOpenDay.delete({ where: { id } });
    });
    return { ok: true };
  }

  async adminListBookingNotifications(bookingId: string) {
    const b = await this.prisma.agendaBooking.findUnique({ where: { id: bookingId }, select: { id: true } });
    if (!b) throw new NotFoundException('Boeking niet gevonden');
    const rows = await this.prisma.agendaBookingNotificationLog.findMany({
      where: { bookingId },
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      channel: r.channel,
      trigger: r.trigger,
      templateId: r.templateId,
      templateName: r.templateName,
      subject: r.subject,
      recipient: r.recipient,
      bodyPreview: r.bodyPreview,
      sent: r.sent,
      sentAt: r.sentAt?.toISOString() ?? null,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async adminDeleteBookingNotification(bookingId: string, logId: string) {
    const row = await this.prisma.agendaBookingNotificationLog.findFirst({
      where: { id: logId, bookingId },
    });
    if (!row) throw new NotFoundException('Melding niet gevonden');
    await this.prisma.agendaBookingNotificationLog.delete({ where: { id: logId } });
    return { ok: true };
  }

  private async ensureAgendaBookingsMediaFolder() {
    await this.media.ensureDefaultFolders();
    const f = await this.prisma.mediaFolder.findUnique({
      where: { slug: 'agenda-afspraken' },
      select: { id: true },
    });
    this.agendaBookingsFolderId = f?.id ?? null;
  }

  /** Zelfde pipeline als modelfoto's: MediaService → MEDIA_ROOT + fieldsJson storageKey. */
  async persistBookingUploads(
    files: Express.Multer.File[],
    userId: string | null,
  ): Promise<Record<string, string>> {
    if (!this.agendaBookingsFolderId) await this.ensureAgendaBookingsMediaFolder();
    const out: Record<string, string> = {};
    for (const f of files ?? []) {
      const saved = await this.media.saveFile(f, userId, this.agendaBookingsFolderId);
      const key = saved.webpKey ?? saved.storageKey;
      if (key) out[f.fieldname] = key;
    }
    return out;
  }

  /** Admin: stream boekingsfoto (mediatheek + legacy agenda-map). */
  async adminResolveBookingPhotoPath(bookingId: string): Promise<{ absolutePath: string; mime: string }> {
    const b = await this.prisma.agendaBooking.findUnique({
      where: { id: bookingId },
      select: { fieldsJson: true },
    });
    if (!b) throw new NotFoundException('Boeking niet gevonden');
    const fj = b.fieldsJson as Record<string, unknown>;
    const foto = typeof fj.foto === 'string' ? fj.foto.trim() : '';
    if (!foto) throw new NotFoundException('Geen foto bij deze afspraak.');
    const key = agendaBookingPhotoStorageKey(foto);
    let fp = key ? this.media.resolveAbsolutePathForPublicFilename(key) : null;
    if (!fp) fp = resolveAgendaUploadAbsolutePath(foto);
    if (!fp) {
      throw new NotFoundException(
        'Foto-bestand niet gevonden op de server. Mogelijk opgeslagen vóór de laatste fix — laat de klant opnieuw uploaden.',
      );
    }
    return { absolutePath: fp, mime: agendaMimeFromFilename(basename(fp)) };
  }
}
