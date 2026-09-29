/**
 * Verifieert dat ensureDefaultAgendaCalendars bestaande capaciteit niet naar 1 reset
 * (de bug die na elke pipeline de opleiding-openingen terugzet).
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/verify-agenda-capacity-preserve.ts
 */
import { ensureDefaultAgendaCalendars } from '../src/agenda/agenda-default-calendars';

type Cal = {
  id: string;
  slug: string;
  title: string;
  color: string;
  capacity: number;
  durationMinutes: number;
  slotStepMinutes: number | null;
  showEndTimeOnPublic: boolean;
  sortOrder: number;
};

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const defs = [
    { slug: 'portfolio', capacity: 1, durationMinutes: 120, slotStepMinutes: 30 as number | null, showEndTimeOnPublic: true, sortOrder: 10, color: '#070414', title: 'Portfolio afspraak' },
    { slug: 'opleiding', capacity: 20, durationMinutes: 180, slotStepMinutes: null as number | null, showEndTimeOnPublic: false, sortOrder: 20, color: '#45525f', title: 'Opleiding afspraak' },
    { slug: 'intake-gesprek', capacity: 1, durationMinutes: 60, slotStepMinutes: null as number | null, showEndTimeOnPublic: false, sortOrder: 30, color: '#2f6f55', title: 'Intake-Gesprek' },
    { slug: 'casting', capacity: 1, durationMinutes: 60, slotStepMinutes: null as number | null, showEndTimeOnPublic: false, sortOrder: 40, color: '#2e66c7', title: 'Casting' },
    { slug: 'gratis-fotoshoot', capacity: 1, durationMinutes: 90, slotStepMinutes: null as number | null, showEndTimeOnPublic: false, sortOrder: 50, color: '#b7cae8', title: 'Gratis Fotoshoot' },
  ];

  const store = new Map<string, Cal>(
    defs.map((d) => [
      d.slug,
      {
        id: `cal-${d.slug}`,
        slug: d.slug,
        title: d.title,
        color: d.color,
        capacity: d.capacity,
        durationMinutes: d.durationMinutes,
        slotStepMinutes: d.slotStepMinutes,
        showEndTimeOnPublic: d.showEndTimeOnPublic,
        sortOrder: d.sortOrder,
      },
    ]),
  );

  const updates: Array<{ slug?: string; id?: string; data: Record<string, unknown> }> = [];
  /** Slot-max per calendar: opleiding 20, rest 1 — simuleert live DB na admin-instelling. */
  const slotMaxByCalId = new Map<string, number>([
    ['cal-opleiding', 20],
    ['cal-portfolio', 1],
    ['cal-intake-gesprek', 1],
    ['cal-casting', 1],
    ['cal-gratis-fotoshoot', 1],
  ]);

  const prisma = {
    agendaCalendar: {
      findUnique: async ({ where }: { where: { slug?: string; id?: string } }) => {
        if (where.slug) return store.get(where.slug) ?? null;
        if (where.id) return [...store.values()].find((c) => c.id === where.id) ?? null;
        return null;
      },
      findUniqueOrThrow: async ({ where }: { where: { slug: string } }) => {
        const c = store.get(where.slug);
        if (!c) throw new Error(`missing ${where.slug}`);
        return c;
      },
      update: async ({
        where,
        data,
      }: {
        where: { slug?: string; id?: string };
        data: Record<string, unknown>;
      }) => {
        updates.push({ slug: where.slug, id: where.id, data });
        const key =
          where.slug ??
          [...store.entries()].find(([, c]) => c.id === where.id)?.[0];
        if (!key) throw new Error('update target missing');
        const cur = store.get(key)!;
        const next = { ...cur, ...data } as Cal;
        store.set(key, next);
        return next;
      },
      create: async () => {
        throw new Error('create should not run for existing calendars');
      },
      count: async () => store.size,
      updateMany: async () => ({ count: 0 }),
    },
    agendaField: {
      count: async () => 3,
      createMany: async () => ({ count: 0 }),
    },
    agendaSlot: {
      aggregate: async ({ where }: { where: { calendarId: string } }) => ({
        _max: { capacity: slotMaxByCalId.get(where.calendarId) ?? 1 },
      }),
    },
  };

  const result = await ensureDefaultAgendaCalendars(prisma as never);

  const opleiding = store.get('opleiding')!;
  assert(opleiding.capacity === 20, `FAIL: opleiding capacity werd ${opleiding.capacity}, verwacht 20`);

  const capacityWrites = updates.filter((u) => Object.prototype.hasOwnProperty.call(u.data, 'capacity'));
  // Alleen heal omhoog mag capacity zetten; nooit naar default 1.
  for (const w of capacityWrites) {
    assert(
      typeof w.data.capacity === 'number' && (w.data.capacity as number) >= 20,
      `FAIL: capacity write naar ${String(w.data.capacity)} (mag niet verlagen naar 1)`,
    );
  }

  // Tweede keer boot (pipeline restart): capacity blijft 20, geen heal nodig als al gelijk.
  updates.length = 0;
  store.get('opleiding')!.capacity = 20;
  await ensureDefaultAgendaCalendars(prisma as never);
  assert(store.get('opleiding')!.capacity === 20, 'FAIL: tweede boot resette capacity');
  const badReset = updates.some(
    (u) => Object.prototype.hasOwnProperty.call(u.data, 'capacity') && u.data.capacity === 1,
  );
  assert(!badReset, 'FAIL: tweede boot schreef capacity: 1');

  // Heal-pad: calendar stond op 1, slots op 20 → omhoog trekken.
  store.get('opleiding')!.capacity = 1;
  updates.length = 0;
  await ensureDefaultAgendaCalendars(prisma as never);
  assert(store.get('opleiding')!.capacity === 20, 'FAIL: heal van slot-max faalde');

  console.log('OK: ensureDefaultAgendaCalendars behoudt/healt opleiding capacity (20).');
  console.log(`created=${result.created} total=${result.total}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
