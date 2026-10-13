import type { Prisma, PrismaClient } from '@prisma/client';
import {
  brandedBookingCreatedBody,
  brandedReminderBody,
} from './agenda-notification-template-restyle';

export const GUEST_SPLIT_SLUGS = ['gratis-fotoshoot', 'intake-gesprek', 'modellendag'] as const;

export type WaveSlotPlan = { start: string; capacity: number };

const FOTOSHOOT_BODY = [
  'Bij modellenwerk denken veel mensen aan perfecte maten, jonge gezichten en een select groepje dat op de catwalk thuishoort. Maar ook winkels, merken en reclamebureaus hebben mensen nodig in wie hun klanten zich herkennen. Gewone mensen met een eigen, bijzondere uitstraling.',
  'Bij Class-Models zoeken we vrouwen en mannen van verschillende leeftijden, maten en achtergronden. Ook met een maatje meer ben je van harte welkom. Je hoeft geen ervaring te hebben. Nieuwsgierigheid en de bereidheid om iets nieuws te proberen zijn een mooi begin.',
  'Daarom nodigen we je uit voor een gratis testshoot en een persoonlijk intakegesprek. Een toegankelijke manier om kennis te maken met modellenwerk en samen te bekijken of je hiervoor in aanmerking komt.',
  '- Hoe voelt het om voor de camera te staan?\n- Welke modellen zoeken we?\n- Hoe verloopt een opdracht?\n- En wat wordt er van je verwacht?',
  'Tijdens het intakegesprek maken we kennis met jou en vertellen we je hoe ons bureau werkt. Je krijgt duidelijke uitleg en alle ruimte om je vragen te stellen. We bespreken je interesses en bekijken samen welke mogelijkheden er voor jou kunnen zijn.',
  'En je mag het zelf ervaren!',
  'Tijdens de testshoot ontdek je hoe het voelt om voor de camera te staan. Je hoeft niet vooraf te weten hoe je moet kijken, bewegen of poseren. Je komt juist om kennis te maken en te ontdekken.',
  'Misschien voelt die eerste stap spannend. Dat is heel begrijpelijk wanneer je iets nieuws probeert. Je hoeft niets te bewijzen of iemand anders te worden. We willen graag zien wie jij bent en wat jouw uitstraling bijzonder maakt.',
  'Gewone mensen. Bijzondere uitstraling.',
  'En hoe zit het met werk of studies?',
  'Modellenwerk gebeurt vaak per opdracht en kan, afhankelijk van de planning, daarmee gecombineerd worden. Betaalde opdrachten kunnen een mooie bijverdienste opleveren. We vertellen je eerlijk hoe dat werkt, zonder beloftes over opdrachten of inkomsten.',
  'Na de kennismaking interesse in meer? Dan bespreken we graag de mogelijkheden. Een testshoot en intakegesprek zijn een eerste stap om te bekijken of modellenwerk bij je past.',
  'Wil je gewoon eens kennismaken en ontdekken hoe het voelt om voor de camera te staan? Ook dan ben je welkom.',
].join('\n\n');

export function normalizeWavePlan(raw: unknown): WaveSlotPlan[] {
  if (!Array.isArray(raw)) return [];
  const out: WaveSlotPlan[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as { start?: unknown; capacity?: unknown };
    const start = String(rec.start ?? '').trim();
    const m = start.match(/^(\d{1,2}):(\d{2})/);
    if (!m) continue;
    const cap = Math.max(1, Math.min(99, Math.trunc(Number(rec.capacity) || 1)));
    out.push({ start: `${m[1].padStart(2, '0')}:${m[2]}`, capacity: cap });
  }
  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

export function waveCapacityForStart(plan: WaveSlotPlan[], startTime: string): number | null {
  const hhmm = startTime.slice(0, 5);
  return plan.find((p) => p.start === hhmm)?.capacity ?? null;
}

export function revealWaveSlots<T extends { slotDate: string; startTime: string; remaining: number }>(
  slots: T[],
): Array<T & { waveFull: boolean }> {
  const byDay = new Map<string, T[]>();
  for (const s of slots) {
    const list = byDay.get(s.slotDate) ?? [];
    list.push(s);
    byDay.set(s.slotDate, list);
  }
  const out: Array<T & { waveFull: boolean }> = [];
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (const s of list) {
      const full = s.remaining <= 0;
      out.push({ ...s, waveFull: full });
      if (!full) break;
    }
  }
  return out.sort((a, b) => {
    const d = a.slotDate.localeCompare(b.slotDate);
    if (d !== 0) return d;
    return a.startTime.localeCompare(b.startTime);
  });
}

function parseSlugList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) return p.map((x) => String(x));
    } catch {
      return [];
    }
  }
  return [];
}

const WIZARD_FIELDS: Array<{ fieldKey: string; label: string; type: string; required: boolean; sortOrder: number }> = [
  { fieldKey: 'voornaam', label: 'Voornaam', type: 'text', required: true, sortOrder: 10 },
  { fieldKey: 'achternaam', label: 'Achternaam', type: 'text', required: true, sortOrder: 20 },
  { fieldKey: 'email', label: 'E-mail', type: 'email', required: true, sortOrder: 30 },
  { fieldKey: 'telefoon', label: 'GSM', type: 'tel', required: true, sortOrder: 40 },
  { fieldKey: 'geboortedatum', label: 'Geboortedatum', type: 'date', required: true, sortOrder: 50 },
  { fieldKey: 'straat', label: 'Straat', type: 'text', required: false, sortOrder: 60 },
  { fieldKey: 'nr', label: 'Nr', type: 'text', required: false, sortOrder: 70 },
  { fieldKey: 'postcode', label: 'Postcode', type: 'text', required: false, sortOrder: 80 },
  { fieldKey: 'gemeente', label: 'Gemeente', type: 'text', required: false, sortOrder: 90 },
];

async function ensureWizardFields(prisma: PrismaClient, calendarId: string) {
  const existing = await prisma.agendaField.findMany({ where: { calendarId } });
  const keys = new Set(existing.map((f) => f.fieldKey));
  for (const f of WIZARD_FIELDS) {
    if (keys.has(f.fieldKey)) continue;
    await prisma.agendaField.create({
      data: {
        calendarId,
        fieldKey: f.fieldKey,
        label: f.label,
        type: f.type,
        required: f.required,
        width: '2',
        placeholder: '',
        titlePosition: 'above',
        sortOrder: f.sortOrder,
        options: null,
        active: true,
      },
    });
  }
  await prisma.agendaField.updateMany({
    where: {
      calendarId,
      fieldKey: { notIn: WIZARD_FIELDS.filter((f) => f.required).map((f) => f.fieldKey) },
    },
    data: { required: false },
  });
}

async function copyOpenDaysOnce(prisma: PrismaClient, targetSlug: string) {
  const target = await prisma.agendaCalendar.findUnique({ where: { slug: targetSlug } });
  if (!target || target.splitOpenDaysSeeded) return;
  const count = await prisma.agendaOpenDay.count({ where: { calendarId: target.id } });
  if (count === 0) {
    const source = await prisma.agendaCalendar.findUnique({ where: { slug: 'model-worden' } });
    if (source) {
      const rows = await prisma.agendaOpenDay.findMany({ where: { calendarId: source.id } });
      for (const row of rows) {
        try {
          await prisma.agendaOpenDay.create({
            data: {
              calendarId: target.id,
              openDate: row.openDate,
              repeatYearly: row.repeatYearly,
              fullyBooked: row.fullyBooked,
              fullyBookedTestshoot: false,
              fullyBookedIntake: false,
            },
          });
        } catch {
          /* uniek */
        }
      }
    }
  }
  await prisma.agendaCalendar.update({
    where: { id: target.id },
    data: { splitOpenDaysSeeded: true },
  });
}

async function seedHomeOnce(
  prisma: PrismaClient,
  slug: string,
  data: Prisma.AgendaCalendarUpdateInput,
) {
  const cal = await prisma.agendaCalendar.findUnique({ where: { slug } });
  if (!cal || cal.homeTitle) return;
  await prisma.agendaCalendar.update({ where: { id: cal.id }, data });
}

async function ensureMail(
  prisma: PrismaClient,
  slug: string,
  title: string,
  trigger: 'booking_created' | 'reminder',
  offsetMinutes: number,
  name: string,
  subject: string,
) {
  const rows = await prisma.agendaNotificationTemplate.findMany({
    where: { channel: 'email', trigger },
    select: { calendarSlugs: true, offsetMinutes: true },
  });
  const exists = rows.some(
    (r) => r.offsetMinutes === offsetMinutes && parseSlugList(r.calendarSlugs).includes(slug),
  );
  if (exists) return;
  await prisma.agendaNotificationTemplate.create({
    data: {
      channel: 'email',
      name,
      enabled: true,
      trigger,
      offsetMinutes,
      subject,
      body: trigger === 'reminder' ? brandedReminderBody() : brandedBookingCreatedBody(),
      calendarSlugs: [slug],
      sortOrder: trigger === 'reminder' ? 20 : 10,
    },
  });
  void title;
}

/** Aparte gastenagenda's, beginpagina, mails en open dagen. Idempotent. */
export async function ensureSplitGuestAgendas(prisma: PrismaClient) {
  const modellendag = await prisma.agendaCalendar.findUnique({ where: { slug: 'modellendag' } });
  if (!modellendag) {
    await prisma.agendaCalendar.create({
      data: {
        slug: 'modellendag',
        title: 'Modellendag · Gratis initiatieles',
        description: '',
        color: '#6f121b',
        durationMinutes: 60,
        capacity: 1,
        active: true,
        publicBooking: true,
        sortOrder: 55,
        restrictToOpenDays: true,
        weekdayOpenMask: 0,
        defaultDayStartTime: '10:00:00',
        defaultDayEndTime: '18:00:00',
        agendaVisible: false,
        homePublished: false,
        waveBooking: true,
        waveSlotPlan: [{ start: '11:00', capacity: 4 }],
        optionalSlotStarts: '11:00',
      },
    });
  } else if (!modellendag.waveBooking && modellendag.waveSlotPlan == null) {
    await prisma.agendaCalendar.update({
      where: { id: modellendag.id },
      data: {
        waveBooking: true,
        waveSlotPlan: [{ start: '11:00', capacity: 4 }],
        optionalSlotStarts: modellendag.optionalSlotStarts?.trim() ? modellendag.optionalSlotStarts : '11:00',
      },
    });
  }

  for (const slug of ['gratis-fotoshoot', 'intake-gesprek', 'modellendag'] as const) {
    const cal = await prisma.agendaCalendar.findUnique({ where: { slug } });
    if (!cal) continue;
    await prisma.agendaCalendar.update({
      where: { id: cal.id },
      data: {
        active: true,
        ...(cal.splitOpenDaysSeeded ? {} : { publicBooking: true }),
      },
    });
    await ensureWizardFields(prisma, cal.id);
  }

  await copyOpenDaysOnce(prisma, 'gratis-fotoshoot');
  await copyOpenDaysOnce(prisma, 'intake-gesprek');

  await seedHomeOnce(prisma, 'gratis-fotoshoot', {
    homePublished: true,
    agendaVisible: true,
    homeKicker: 'Class-Models',
    homeTitle: '“Modellenwerk? Dat is toch niets voor mij?”',
    homeLead: 'Misschien denk je daar na één kennismaking helemaal anders over.',
    homeBody: FOTOSHOOT_BODY,
    homeHighlight:
      'De testshoot en het intakegesprek zijn volledig gratis en zonder verplichtingen. Iedereen is welkom — ervaring is niet nodig.',
    homeClose: 'Geef jezelf de kans om jouw mogelijkheden te ontdekken.',
    homeButtonLabel: 'Ga verder',
    homeImageUrl: '/nieuw/gratis-testshoot-intake.jpg',
  });

  await seedHomeOnce(prisma, 'modellendag', {
    homePublished: false,
    agendaVisible: false,
    homeKicker: 'Class-Models',
    homeTitle: 'Modellendag · Gratis initiatieles',
    homeLead: 'Kom kennismaken tijdens de modellendag.',
    homeBody:
      'Tijdens de modellendag volg je een gratis initiatieles. We maken kennis en je ontdekt hoe een eerste stap in modellenwerk voelt.',
    homeHighlight: 'De initiatieles is gratis en zonder verplichtingen.',
    homeClose: 'Schrijf je in en kies een uur.',
    homeButtonLabel: 'Ga verder',
    homeImageUrl: '/nieuw/gratis-testshoot-intake.jpg',
  });

  const mailFor: Array<[string, string]> = [
    ['gratis-fotoshoot', 'Gratis fotoshoot + intakegesprek'],
    ['intake-gesprek', 'Intake-gesprek'],
    ['modellendag', 'Modellendag · Gratis initiatieles'],
  ];
  for (const [slug, title] of mailFor) {
    await ensureMail(
      prisma,
      slug,
      title,
      'booking_created',
      0,
      `Bevestiging — ${title}`,
      `Bevestiging: ${title} — Class-Models`,
    );
    await ensureMail(
      prisma,
      slug,
      title,
      'reminder',
      -720,
      `Herinnering 12 uur — ${title}`,
      `Herinnering: ${title} — Class-Models`,
    );
  }

  await prisma.agendaCalendar.updateMany({
    where: { slug: 'model-worden' },
    data: { publicBooking: false },
  });
  await prisma.agendaCalendar.updateMany({
    where: { slug: 'casting' },
    data: { active: false, publicBooking: false },
  });
}
