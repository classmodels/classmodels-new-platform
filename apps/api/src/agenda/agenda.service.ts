import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ModelPortalHistoryService } from '../portal/model-portal-history.service';
import { AgendaNotificationService } from './agenda-notifications.service';
import {
  AdminBookingsRangeQueryDto,
  AdminCalendarMonthQueryDto,
  AdminOpenDaysQueryDto,
  AdminSlotsQueryDto,
  BookAgendaDto,
  BulkAgendaSlotsDto,
  CreateAgendaCalendarDto,
  CreateAgendaSlotDto,
  CreateClosedDayDto,
  CreateOpenDayDto,
  UpdateAdminBookingDto,
  UpdateAgendaCalendarDto,
} from './dto/agenda.dto';

const activeBookingFilter = {
  status: { notIn: ['cancelled', 'cancelled_cm', 'geannuleerd'] },
} satisfies Prisma.AgendaBookingWhereInput;

function parseYmd(ymd: string): Date {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Ongeldige datum');
  return d;
}

function combineUtc(slotDate: Date, timeStr: string): Date {
  const ymd = slotDate.toISOString().slice(0, 10);
  const full = normTime(timeStr);
  const [hh, mm, ss] = full.split(':').map((x) => parseInt(x, 10));
  const [y, mo, da] = ymd.split('-').map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, mo - 1, da, hh, mm ?? 0, ss ?? 0));
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
];

function webPublicBase(): string {
  return (process.env.WEB_PUBLIC_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
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

function ymdEuropeBrussels(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
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

@Injectable()
export class AgendaService {
  constructor(
    private prisma: PrismaService,
    private notifications: AgendaNotificationService,
    private modelHistory: ModelPortalHistoryService,
  ) {}

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
    const cursor = new Date(from);
    const end = new Date(to);
    while (cursor.getTime() <= end.getTime()) {
      const ymd = cursor.toISOString().slice(0, 10);
      for (const o of openRows) {
        if (o.repeatYearly) {
          if (
            cursor.getUTCMonth() === o.openDate.getUTCMonth() &&
            cursor.getUTCDate() === o.openDate.getUTCDate()
          ) {
            set.add(ymd);
          }
        } else if (o.openDate.toISOString().slice(0, 10) === ymd) {
          set.add(ymd);
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return set;
  }

  /** Maakt ontbrekende sloten voor één dag (open-dag workflow + lazy generatie). */
  async ensureSlotsForCalendarDate(
    calendarId: string,
    slotDate: Date,
    cal: {
      durationMinutes: number;
      slotStepMinutes?: number | null;
      optionalSlotStarts?: string | null;
      capacity: number;
      defaultDayStartTime: string;
      defaultDayEndTime: string;
      breakStart: string | null;
      breakEnd: string | null;
    },
  ) {
    const dateOnly = new Date(`${slotDate.toISOString().slice(0, 10)}T12:00:00.000Z`);
    const existing = await this.prisma.agendaSlot.count({
      where: { calendarId, slotDate: dateOnly },
    });
    if (existing > 0) return;

    const startM = timeToMinutes(cal.defaultDayStartTime ?? '08:00:00');
    const endM = timeToMinutes(cal.defaultDayEndTime ?? '18:00:00');
    const dur = cal.durationMinutes;
    const step = cal.slotStepMinutes ?? dur;
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

    if (rows.length === 0) return;
    await this.prisma.agendaSlot.createMany({
      data: rows.map((r) => ({
        calendarId,
        slotDate: dateOnly,
        startTime: r.startTime,
        endTime: r.endTime,
        capacity: cal.capacity,
        status: 'open',
      })),
    });
  }

  /** Vervangt verkeerde opleidingssloten (bijv. oude 1-uurs blokken) door één 14:00–17:00 slot zolang er geen boeking is. */
  private async reconcileOpleidingDaySlots(
    calendarId: string,
    slotDate: Date,
    cal: {
      durationMinutes: number;
      slotStepMinutes?: number | null;
      optionalSlotStarts?: string | null;
      capacity: number;
      defaultDayStartTime: string;
      defaultDayEndTime: string;
      breakStart: string | null;
      breakEnd: string | null;
    },
  ) {
    const dateOnly = new Date(`${slotDate.toISOString().slice(0, 10)}T12:00:00.000Z`);
    const rows = await this.prisma.agendaSlot.findMany({
      where: { calendarId, slotDate: dateOnly },
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
    await this.prisma.agendaSlot.deleteMany({ where: { calendarId, slotDate: dateOnly } });
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
      calendar: { slug: cal.slug, title: cal.title, color: cal.color },
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
    const from = fromStr ? parseYmd(fromStr) : new Date(`${today.toISOString().slice(0, 10)}T12:00:00.000Z`);
    let to = toStr
      ? parseYmd(toStr)
      : new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);

    if (to < from) throw new BadRequestException('Datum tot moet na vanaf liggen');

    const closedRows = await this.prisma.agendaClosedDay.findMany({
      where: { calendarId: cal.id, closedDate: { gte: from, lte: to } },
      select: { closedDate: true },
    });
    const closedSet = new Set(closedRows.map((r) => r.closedDate.toISOString().slice(0, 10)));

    const restrictOpen = cal.restrictToOpenDays === true;
    const openRows = restrictOpen
      ? await this.prisma.agendaOpenDay.findMany({
          where: { calendarId: cal.id },
          select: { openDate: true, repeatYearly: true },
        })
      : [];
    const openYmdSet = restrictOpen ? this.openDayYmdSetInRange(from, to, openRows) : null;

    /** Lazy slot-aanmaak: bij restrictOpen alleen op expliciete open dagen; anders op weekdagen volgens mask (0 = uit). */
    const mask = cal.weekdayOpenMask ?? 0;
    if (restrictOpen && openYmdSet) {
      for (const ymd of [...openYmdSet].sort()) {
        if (closedSet.has(ymd)) continue;
        const dateOnly = parseYmd(ymd);
        if (cal.slug === 'opleiding') {
          await this.reconcileOpleidingDaySlots(cal.id, dateOnly, cal);
        } else {
          const n = await this.prisma.agendaSlot.count({
            where: { calendarId: cal.id, slotDate: dateOnly },
          });
          if (n === 0) await this.ensureSlotsForCalendarDate(cal.id, dateOnly, cal);
        }
      }
    } else if (!restrictOpen && mask !== 0) {
      let cursor = new Date(from);
      const end = new Date(to);
      while (cursor.getTime() <= end.getTime()) {
        const ymd = cursor.toISOString().slice(0, 10);
        const dow = cursor.getUTCDay();
        const bit = 1 << dow;
        if ((mask & bit) !== 0 && !closedSet.has(ymd)) {
          const dateOnly = parseYmd(ymd);
          if (cal.slug === 'opleiding') {
            await this.reconcileOpleidingDaySlots(cal.id, dateOnly, cal);
          } else {
            const n = await this.prisma.agendaSlot.count({
              where: { calendarId: cal.id, slotDate: dateOnly },
            });
            if (n === 0) {
              await this.ensureSlotsForCalendarDate(cal.id, dateOnly, cal);
            }
          }
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    const now = new Date();
    const rows = await this.prisma.agendaSlot.findMany({
      where: {
        calendarId: cal.id,
        status: 'open',
        slotDate: { gte: from, lte: to },
      },
      orderBy: [{ slotDate: 'asc' }, { startTime: 'asc' }],
    });

    const out: Array<
      (typeof rows)[number] & { booked: number; remaining: number }
    > = [];

    for (const s of rows) {
      const ymd = s.slotDate.toISOString().slice(0, 10);
      if (closedSet.has(ymd)) continue;
      if (openYmdSet && !openYmdSet.has(ymd)) continue;

      const startAt = combineUtc(s.slotDate, normTime(s.startTime));
      if (startAt < now) continue;

      const booked = await this.prisma.agendaBooking.count({
        where: { slotId: s.id, ...activeBookingFilter },
      });
      const cap = effectiveSlotCapacity(s.capacity, cal.capacity);
      const remaining = Math.max(0, cap - booked);
      if (remaining <= 0) continue;

      out.push({
        ...s,
        capacity: cap,
        booked,
        remaining,
      });
    }

    const dedupKey = (s: (typeof out)[number]) =>
      `${s.slotDate.toISOString().slice(0, 10)}|${normTime(s.startTime)}`;
    const seenKeys = new Set<string>();
    const deduped: typeof out = [];
    for (const s of out) {
      const k = dedupKey(s);
      if (seenKeys.has(k)) continue;
      seenKeys.add(k);
      deduped.push(s);
    }

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

    if (cal.restrictToOpenDays) {
      const openRows = await this.prisma.agendaOpenDay.findMany({
        where: { calendarId: cal.id },
        select: { openDate: true, repeatYearly: true },
      });
      const ymd = slot.slotDate.toISOString().slice(0, 10);
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

    for (const f of fieldsDef) {
      const val = fieldsJson[f.fieldKey] ?? '';
      if (f.type === 'file') {
        if (f.required && (!val || val.trim() === '')) {
          throw new BadRequestException(`Verplicht veld ontbreekt: ${f.label}`);
        }
        continue;
      }
      if (f.required && (!val || val.trim() === '')) {
        throw new BadRequestException(`Verplicht veld ontbreekt: ${f.label}`);
      }
      if (f.fieldKey === 'voornaam') firstname = val;
      if (f.fieldKey === 'familienaam') lastname = val;
      if (f.fieldKey === 'email') email = val;
      if (f.fieldKey === 'telefoon' || f.fieldKey === 'phone') phone = val;
      if (['voornaam', 'familienaam', 'naam'].includes(f.fieldKey) && val) nameParts.push(val);
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
    const startAt = combineUtc(slot.slotDate, startNorm);
    const endAt = combineUtc(slot.slotDate, endNorm);
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
          status: 'confirmed',
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

    const cancelUrl = `${webPublicBase()}/portal/guest/annuleer?token=${encodeURIComponent(cancelToken)}`;
    const confirmUrl = `${webPublicBase()}/portal/guest/bevestig?token=${encodeURIComponent(cancelToken)}`;
    const dateLabel = new Intl.DateTimeFormat('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(slot.slotDate);
    const timeLabel = `${slot.startTime.slice(0, 5)} – ${slot.endTime.slice(0, 5)}`;

    await this.notifications.sendBookingConfirmation({
      toEmail: email || null,
      phone: phone || null,
      displayName: name || firstname || 'klant',
      calendarTitle: cal.title,
      dateLabel,
      timeLabel,
      cancelUrl,
      confirmUrl,
    });

    const out: {
      success: true;
      bookingId: string;
      cancelUrl?: string;
    } = { success: true, bookingId: booking.id };
    if (process.env.AGENDA_HIDE_CANCEL_LINK !== '1') {
      out.cancelUrl = cancelUrl;
    }
    if (userId) {
      const ymd = slot.slotDate.toISOString().slice(0, 10);
      void this.modelHistory.log(userId, 'agenda_booked', {
        calendarSlug: cal.slug,
        calendarTitle: cal.title,
        slotDate: ymd,
        startTime: slot.startTime.slice(0, 5),
        endTime: slot.endTime.slice(0, 5),
        bookingId: booking.id,
        source: 'portal-model',
      });
    }
    return out;
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
      include: { slot: true },
    });
    if (!booking) throw new NotFoundException('Geen actieve afspraak.');
    await this.prisma.agendaBooking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
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

  async cancelByToken(raw: string) {
    const token = raw?.trim();
    if (!token) throw new BadRequestException('Token ontbreekt');

    const booking = await this.prisma.agendaBooking.findUnique({
      where: { cancelToken: token },
      include: { calendar: { select: { title: true, slug: true } }, slot: true },
    });
    if (!booking) throw new NotFoundException('Afspraak niet gevonden of link verlopen.');

    if (['cancelled', 'cancelled_cm', 'geannuleerd'].includes(booking.status)) {
      return { ok: true, alreadyCancelled: true as const, title: booking.calendar.title };
    }

    await this.prisma.agendaBooking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
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

    return { ok: true, alreadyCancelled: false as const, title: booking.calendar.title };
  }

  /**
   * Gast bevestigt komst — enkel toegestaan op de kalenderdag vóór de afspraak (Europe/Brussels).
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

    const slotYmd = booking.slot.slotDate.toISOString().slice(0, 10);
    const today = ymdEuropeBrussels(new Date());
    const mustBe = previousCalendarDayYmd(slotYmd);
    if (today !== mustBe) {
      throw new BadRequestException(
        `Komst bevestigen kan alleen op de dag vóór uw afspraak (op ${mustBe}). Vandaag is ${today}.`,
      );
    }

    if (booking.status === 'acknowledged') {
      return { ok: true, alreadyAcknowledged: true as const, title: booking.calendar.title };
    }

    await this.prisma.agendaBooking.update({
      where: { id: booking.id },
      data: { status: 'acknowledged' },
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
    const calendars = await this.prisma.agendaCalendar.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    const today = new Date();
    const todayYmd = today.toISOString().slice(0, 10);
    const todayDate = parseYmd(todayYmd);

    const enriched = await Promise.all(
      calendars.map(async (c) => {
        const openSlotsFuture = await this.prisma.agendaSlot.count({
          where: {
            calendarId: c.id,
            status: 'open',
            slotDate: { gte: todayDate },
          },
        });
        const bookingsCount = await this.prisma.agendaBooking.count({
          where: { calendarId: c.id, ...activeBookingFilter },
        });
        return { ...c, openSlotsFuture, bookingsCount };
      }),
    );

    const recentBookings = await this.prisma.agendaBooking.findMany({
      take: 12,
      orderBy: { startAt: 'desc' },
      where: activeBookingFilter,
      include: {
        calendar: { select: { slug: true, title: true } },
        slot: { select: { slotDate: true, startTime: true } },
      },
    });

    return { calendars: enriched, recentBookings };
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

    return this.prisma.agendaCalendar.update({ where: { id }, data });
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
        startAt: { gte: startRange, lte: endRange },
        ...activeBookingFilter,
      },
      orderBy: { startAt: 'asc' },
      include: { slot: { select: { startTime: true, endTime: true } } },
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
      const key = b.startAt.toISOString().slice(0, 10);
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
    const fromStart = new Date(`${q.from}T00:00:00.000Z`);
    const toEnd = new Date(`${q.to}T23:59:59.999Z`);
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
      startAt: { gte: fromStart, lte: toEnd },
      ...statusFilter,
    };
    if (rawIds.length) {
      where.calendarId = { in: rawIds };
    }

    const rows = await this.prisma.agendaBooking.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: {
        calendar: { select: { id: true, slug: true, title: true, color: true } },
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
        calendar: { select: { id: true, slug: true, title: true, color: true } },
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
    const b = await this.prisma.agendaBooking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Boeking niet gevonden');

    const data: Prisma.AgendaBookingUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.firstname !== undefined) data.firstname = dto.firstname;
    if (dto.lastname !== undefined) data.lastname = dto.lastname;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.fieldsJson !== undefined) {
      data.fieldsJson = dto.fieldsJson as object;
    }

    return this.prisma.agendaBooking.update({ where: { id }, data });
  }

  async adminDeleteBooking(id: string) {
    const b = await this.prisma.agendaBooking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Boeking niet gevonden');
    await this.prisma.agendaBooking.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    return { ok: true };
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
    await this.ensureSlotsForCalendarDate(cal.id, openDate, cal);
    return row;
  }

  async adminRemoveOpenDay(id: string) {
    try {
      await this.prisma.agendaOpenDay.delete({ where: { id } });
    } catch {
      throw new NotFoundException();
    }
    return { ok: true };
  }
}
