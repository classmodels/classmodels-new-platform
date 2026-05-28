import type { PrismaClient } from '@prisma/client';

/** Standaard Class-Models agenda's (zelfde als prisma/seed). */
export const DEFAULT_AGENDA_CALENDAR_DEFS = [
  {
    slug: 'portfolio',
    title: 'Portfolio afspraak',
    color: '#070414',
    durationMinutes: 30,
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
    label: 'Telefoon',
    type: 'tel',
    required: true,
    width: '2',
    placeholder: '',
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

/** Zorg dat portfolio/casting/… bestaan (idempotent). */
export async function ensureDefaultAgendaCalendars(prisma: PrismaClient): Promise<{ created: number; total: number }> {
  let created = 0;
  for (const d of DEFAULT_AGENDA_CALENDAR_DEFS) {
    const existing = await prisma.agendaCalendar.findUnique({ where: { slug: d.slug } });
    const cal = await prisma.agendaCalendar.upsert({
      where: { slug: d.slug },
      update: {
        title: d.title,
        color: d.color,
        durationMinutes: Math.max(1, d.durationMinutes),
        capacity: Math.max(1, d.capacity),
        sortOrder: d.sortOrder,
        active: true,
        publicBooking: true,
        restrictToOpenDays: true,
        weekdayOpenMask: 0,
        defaultDayStartTime: d.defaultDayStartTime,
        defaultDayEndTime: d.defaultDayEndTime,
      },
      create: {
        slug: d.slug,
        title: d.title,
        description: '',
        color: d.color,
        durationMinutes: Math.max(1, d.durationMinutes),
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
    if (!existing) created += 1;

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
  return { created, total };
}
