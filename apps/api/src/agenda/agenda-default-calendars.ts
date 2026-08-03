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

/** Zorg dat portfolio/casting/… bestaan (idempotent). Bestaande uren/duur niet overschrijven. */
export async function ensureDefaultAgendaCalendars(
  prisma: PrismaClient,
): Promise<{ created: number; total: number; portfolioScheduleUpgraded: boolean }> {
  let created = 0;
  for (const d of DEFAULT_AGENDA_CALENDAR_DEFS) {
    const existing = await prisma.agendaCalendar.findUnique({ where: { slug: d.slug } });
    if (existing) {
      await prisma.agendaCalendar.update({
        where: { slug: d.slug },
        data: {
          title: d.title,
          color: d.color,
          capacity: Math.max(1, d.capacity),
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
    } else {
      /** Duur staat al goed — sloten moeten toch hersteld (oude endTime +30). */
      portfolioScheduleUpgraded = true;
    }
  }
  return { created, total, portfolioScheduleUpgraded };
}
