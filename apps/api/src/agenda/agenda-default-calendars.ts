import type { PrismaClient } from '@prisma/client';

/** Standaard Class-Models agenda's (zelfde als prisma/seed). */
export const DEFAULT_AGENDA_CALENDAR_DEFS = [
  {
    slug: 'portfolio',
    title: 'Portfolio afspraak',
    color: '#070414',
    /** Sessieduur (min); starts mogen dichter via slotStepMinutes. */
    durationMinutes: 120,
    /** Elke 30 min een nieuwe start → overlappende 2-uurs afspraken. */
    slotStepMinutes: 30,
    capacity: 1,
    sortOrder: 10,
    defaultDayStartTime: '08:00:00',
    defaultDayEndTime: '18:00:00',
  },
  {
    slug: 'opleiding',
    title: 'Opleiding afspraak',
    color: '#45525f',
    durationMinutes: 180,
    capacity: 1,
    sortOrder: 20,
    defaultDayStartTime: '14:00:00',
    defaultDayEndTime: '17:00:00',
  },
  {
    slug: 'intake-gesprek',
    title: 'Intake-Gesprek',
    color: '#2f6f55',
    durationMinutes: 60,
    capacity: 1,
    sortOrder: 30,
    defaultDayStartTime: '08:00:00',
    defaultDayEndTime: '18:00:00',
  },
  {
    slug: 'casting',
    title: 'Casting',
    color: '#2e66c7',
    durationMinutes: 60,
    capacity: 1,
    sortOrder: 40,
    defaultDayStartTime: '08:00:00',
    defaultDayEndTime: '18:00:00',
  },
  {
    /** Eén gastenagenda voor model worden (intake en/of gratis testshoot). */
    slug: 'model-worden',
    title: 'Model worden',
    color: '#856b3f',
    durationMinutes: 90,
    capacity: 1,
    sortOrder: 45,
    defaultDayStartTime: '08:00:00',
    defaultDayEndTime: '18:00:00',
  },
  {
    slug: 'gratis-fotoshoot',
    title: 'Gratis Fotoshoot',
    color: '#b7cae8',
    durationMinutes: 90,
    capacity: 1,
    sortOrder: 50,
    defaultDayStartTime: '08:00:00',
    defaultDayEndTime: '18:00:00',
  },
] as const;

export type DefaultAgendaFieldSeed = {
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  width: string;
  placeholder: string;
  titlePosition: string;
  sortOrder: number;
  options: string | null;
};

export const DEFAULT_GENERIC_AGENDA_FIELDS: DefaultAgendaFieldSeed[] = [
  {
    fieldKey: 'voornaam',
    label: 'Voornaam',
    type: 'text',
    required: true,
    width: '1',
    placeholder: '',
    titlePosition: 'above',
    sortOrder: 10,
    options: null,
  },
  {
    fieldKey: 'achternaam',
    label: 'Achternaam',
    type: 'text',
    required: true,
    width: '1',
    placeholder: '',
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
    placeholder: '',
    titlePosition: 'above',
    sortOrder: 30,
    options: null,
  },
  {
    fieldKey: 'telefoon',
    label: 'GSM',
    type: 'tel',
    required: true,
    width: '2',
    placeholder: '0498720371',
    titlePosition: 'above',
    sortOrder: 40,
    options: null,
  },
  {
    fieldKey: 'geboortedatum',
    label: 'Geboortedatum',
    type: 'date',
    required: true,
    width: '2',
    placeholder: '',
    titlePosition: 'above',
    sortOrder: 50,
    options: null,
  },
  {
    fieldKey: 'opmerkingen',
    label: 'Opmerkingen',
    type: 'textarea',
    required: false,
    width: '2',
    placeholder: '',
    titlePosition: 'above',
    sortOrder: 100,
    options: null,
  },
];

/** Zorg dat portfolio/casting/… bestaan (idempotent).
 * Bestaande capaciteit, uren en duur worden NOOIT overschreven (pipeline mag admin-instellingen niet resetten).
 */
export async function ensureDefaultAgendaCalendars(
  prisma: PrismaClient,
): Promise<{ created: number; total: number; portfolioScheduleUpgraded: boolean }> {
  let created = 0;
  for (const d of DEFAULT_AGENDA_CALENDAR_DEFS) {
    const existing = await prisma.agendaCalendar.findUnique({ where: { slug: d.slug } });
    if (existing) {
      // Alleen metadata die geen boekingscapaciteit/uren wijzigt.
      await prisma.agendaCalendar.update({
        where: { slug: d.slug },
        data: {
          title: d.title,
          color: d.color,
          sortOrder: d.sortOrder,
          active: true,
          publicBooking: true,
        },
      });
    } else {
      await prisma.agendaCalendar.create({
        data: {
          slug: d.slug,
          title: d.title,
          description: '',
          color: d.color,
          durationMinutes: Math.max(1, d.durationMinutes),
          slotStepMinutes: 'slotStepMinutes' in d && d.slotStepMinutes != null ? d.slotStepMinutes : undefined,
          capacity: Math.max(1, d.capacity),
          active: true,
          publicBooking: true,
          sortOrder: d.sortOrder,
          restrictToOpenDays: true,
          weekdayOpenMask: 0,
          defaultDayStartTime: d.defaultDayStartTime,
          defaultDayEndTime: d.defaultDayEndTime,
        },
      });
      created += 1;
    }

    const cal = await prisma.agendaCalendar.findUniqueOrThrow({ where: { slug: d.slug } });
    const fieldCount = await prisma.agendaField.count({ where: { calendarId: cal.id } });
    if (fieldCount === 0) {
      await prisma.agendaField.createMany({
        data: DEFAULT_GENERIC_AGENDA_FIELDS.map((r) => ({
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
    }

    if (d.slug === 'model-worden') {
      const pakket = await prisma.agendaField.findFirst({
        where: { calendarId: cal.id, fieldKey: 'pakket' },
      });
      if (!pakket) {
        await prisma.agendaField.create({
          data: {
            calendarId: cal.id,
            fieldKey: 'pakket',
            label: 'Pakket',
            type: 'text',
            required: false,
            width: '2',
            placeholder: '',
            titlePosition: 'above',
            sortOrder: 5,
            options: null,
            active: true,
          },
        });
      }
    }

    /**
     * Herstel na oude bug die capaciteit bij elke start naar 1 zette:
     * als toekomstige sloten al een hogere cap hebben, trek de agenda-cap omhoog (nooit omlaag).
     */
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const agg = await prisma.agendaSlot.aggregate({
      where: { calendarId: cal.id, slotDate: { gte: today } },
      _max: { capacity: true },
    });
    const maxSlotCap = Math.max(1, agg._max.capacity ?? 1);
    if (maxSlotCap > cal.capacity) {
      await prisma.agendaCalendar.update({
        where: { id: cal.id },
        data: { capacity: maxSlotCap },
      });
    }
  }
  const total = await prisma.agendaCalendar.count();
  await prisma.agendaCalendar.updateMany({
    where: { durationMinutes: { lte: 0 } },
    data: { durationMinutes: 60 },
  });
  await prisma.agendaCalendar.updateMany({
    where: { slotStepMinutes: 0 },
    data: { slotStepMinutes: null },
  });
  /** Portfolio: forceer 2u duur + start elke 30 min (productstandaard). */
  const portfolio = await prisma.agendaCalendar.findUnique({ where: { slug: 'portfolio' } });
  let portfolioScheduleUpgraded = false;
  if (portfolio) {
    const needs =
      portfolio.durationMinutes !== 120 ||
      portfolio.slotStepMinutes !== 30 ||
      portfolio.showEndTimeOnPublic !== true;
    if (needs) {
      await prisma.agendaCalendar.update({
        where: { id: portfolio.id },
        data: {
          durationMinutes: 120,
          slotStepMinutes: 30,
          showEndTimeOnPublic: true,
        },
      });
      portfolioScheduleUpgraded = true;
    }
  }

  await bootstrapModelWordenAvailability(prisma);
  await retireLegacyGuestCalendars(prisma);

  return { created, total, portfolioScheduleUpgraded };
}

/**
 * Intake / casting / gratis-fotoshoot: niet meer publiek of actief in admin als aparte funnel.
 * Bestaande boekingen blijven staan (calendarId ongewijzigd).
 */
async function retireLegacyGuestCalendars(prisma: PrismaClient): Promise<void> {
  await prisma.agendaCalendar.updateMany({
    where: { slug: { in: ['intake-gesprek', 'casting', 'gratis-fotoshoot'] } },
    data: {
      active: false,
      publicBooking: false,
    },
  });
}

/**
 * model-worden is nieuw: zonder open dagen / weekmasker blijft de publieke wizard leeg.
 * Eenmalig (zolang er geen toekomstige open dagen of weekmasker is): neem openingsuren over
 * van intake-gesprek / gratis-fotoshoot, anders standaard ma–vr 08–18.
 */
async function bootstrapModelWordenAvailability(prisma: PrismaClient): Promise<void> {
  const target = await prisma.agendaCalendar.findUnique({ where: { slug: 'model-worden' } });
  if (!target) return;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const futureOpenCount = await prisma.agendaOpenDay.count({
    where: { calendarId: target.id, openDate: { gte: today } },
  });
  const hasWeekdayMask = !target.restrictToOpenDays && (target.weekdayOpenMask ?? 0) !== 0;
  if (futureOpenCount > 0 || hasWeekdayMask) return;

  const sources = await prisma.agendaCalendar.findMany({
    where: { slug: { in: ['intake-gesprek', 'gratis-fotoshoot'] } },
  });
  const preferred =
    sources.find((s) => s.slug === 'intake-gesprek') ??
    sources.find((s) => s.slug === 'gratis-fotoshoot') ??
    null;

  if (preferred) {
    await prisma.agendaCalendar.update({
      where: { id: target.id },
      data: {
        restrictToOpenDays: preferred.restrictToOpenDays,
        weekdayOpenMask: preferred.weekdayOpenMask,
        defaultDayStartTime: preferred.defaultDayStartTime,
        defaultDayEndTime: preferred.defaultDayEndTime,
        breakStart: preferred.breakStart,
        breakEnd: preferred.breakEnd,
        durationMinutes: Math.max(1, preferred.durationMinutes || target.durationMinutes || 60),
        capacity: Math.max(1, preferred.capacity || target.capacity || 1),
        optionalSlotStarts: preferred.optionalSlotStarts,
        slotStepMinutes: preferred.slotStepMinutes,
        publicBooking: true,
        active: true,
      },
    });

    const sourceIds = sources.map((s) => s.id);
    const openDays = await prisma.agendaOpenDay.findMany({
      where: { calendarId: { in: sourceIds }, openDate: { gte: today } },
    });
    const seenOpen = new Set<string>();
    for (const od of openDays) {
      const key = od.openDate.toISOString().slice(0, 10);
      if (seenOpen.has(key)) continue;
      seenOpen.add(key);
      try {
        await prisma.agendaOpenDay.create({
          data: {
            calendarId: target.id,
            openDate: od.openDate,
            repeatYearly: od.repeatYearly,
          },
        });
      } catch {
        /* unique: al aanwezig */
      }
    }

    const closedDays = await prisma.agendaClosedDay.findMany({
      where: { calendarId: { in: sourceIds }, closedDate: { gte: today } },
    });
    const seenClosed = new Set<string>();
    for (const cd of closedDays) {
      const key = cd.closedDate.toISOString().slice(0, 10);
      if (seenClosed.has(key)) continue;
      seenClosed.add(key);
      try {
        await prisma.agendaClosedDay.create({
          data: {
            calendarId: target.id,
            closedDate: cd.closedDate,
            reason: cd.reason,
          },
        });
      } catch {
        /* unique: al aanwezig */
      }
    }

    const afterOpen = await prisma.agendaOpenDay.count({
      where: { calendarId: target.id, openDate: { gte: today } },
    });
    const refreshed = await prisma.agendaCalendar.findUnique({ where: { id: target.id } });
    if (afterOpen > 0 || (!refreshed?.restrictToOpenDays && (refreshed?.weekdayOpenMask ?? 0) !== 0)) {
      return;
    }
  }

  /** Geen bron-openingen: laat ma–vr 08–18 boeken zodat de funnel live werkt. */
  await prisma.agendaCalendar.update({
    where: { id: target.id },
    data: {
      restrictToOpenDays: false,
      weekdayOpenMask: 62, // ma–vr
      defaultDayStartTime: target.defaultDayStartTime || '08:00:00',
      defaultDayEndTime: target.defaultDayEndTime || '18:00:00',
      publicBooking: true,
      active: true,
    },
  });
}
