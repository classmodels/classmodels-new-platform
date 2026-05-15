import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GUEST_MARKETING_SLUGS = ['gratis-fotoshoot', 'casting', 'intake-gesprek'] as const;
const DAY_LABELS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

function parseRange(from?: string, to?: string) {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const e = new Date();
    return { from: new Date(e.getTime() - 30 * 24 * 60 * 60 * 1000), to: e };
  }
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);
  return { from: start, to: end };
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async recordPageView(input: {
    path: string;
    sessionId?: string;
    userId?: string;
    referrer?: string;
  }) {
    const path = input.path.split('?')[0].slice(0, 191) || '/';
    if (path.startsWith('/admin')) return { ok: true, skipped: true };
    await this.prisma.sitePageView.create({
      data: {
        path,
        sessionId: input.sessionId?.slice(0, 191) || null,
        userId: input.userId || null,
        referrer: input.referrer?.slice(0, 512) || null,
      },
    });
    return { ok: true };
  }

  async getDashboard(fromRaw?: string, toRaw?: string) {
    const { from, to } = parseRange(fromRaw, toRaw);
    const dateFilter = { gte: from, lte: to };

    const [
      bookings,
      calendars,
      pageViews,
      totalModels,
      activeModels,
      newUsers,
      totalClients,
    ] = await Promise.all([
      this.prisma.agendaBooking.findMany({
        where: { createdAt: dateFilter },
        select: {
          id: true,
          createdAt: true,
          status: true,
          source: true,
          calendar: { select: { slug: true, title: true } },
        },
      }),
      this.prisma.agendaCalendar.findMany({
        select: { slug: true, title: true },
      }),
      this.prisma.sitePageView.findMany({
        where: { createdAt: dateFilter },
        select: { path: true, sessionId: true, userId: true, createdAt: true },
      }),
      this.prisma.user.count({
        where: {
          roles: { some: { role: { slug: { in: ['model', 'newface', 'tryout', 'inactief'] } } } },
        },
      }),
      this.prisma.user.count({
        where: {
          lastLoginAt: dateFilter,
          roles: { some: { role: { slug: { in: ['model', 'newface', 'tryout', 'inactief'] } } } },
        },
      }),
      this.prisma.user.count({ where: { createdAt: dateFilter } }),
      this.prisma.user.count({
        where: { roles: { some: { role: { slug: 'client' } } } },
      }),
    ]);

    const bookingTotal = bookings.length;
    const byCalendarMap = new Map<string, { slug: string; title: string; count: number }>();
    for (const c of calendars) {
      byCalendarMap.set(c.slug, { slug: c.slug, title: c.title, count: 0 });
    }
    const byStatusMap = new Map<string, number>();
    const bySourceMap = new Map<string, number>();
    const byDateMap = new Map<string, number>();
    const byDowMap = new Map<number, number>();
    const byHourMap = new Map<number, number>();

    for (const b of bookings) {
      const slug = b.calendar.slug;
      const cur = byCalendarMap.get(slug) ?? {
        slug,
        title: b.calendar.title,
        count: 0,
      };
      cur.count += 1;
      byCalendarMap.set(slug, cur);

      byStatusMap.set(b.status, (byStatusMap.get(b.status) ?? 0) + 1);
      bySourceMap.set(b.source, (bySourceMap.get(b.source) ?? 0) + 1);

      const d = b.createdAt;
      const dateKey = d.toISOString().slice(0, 10);
      byDateMap.set(dateKey, (byDateMap.get(dateKey) ?? 0) + 1);
      byDowMap.set(d.getDay(), (byDowMap.get(d.getDay()) ?? 0) + 1);
      byHourMap.set(d.getHours(), (byHourMap.get(d.getHours()) ?? 0) + 1);
    }

    const guestMarketing = GUEST_MARKETING_SLUGS.map((slug) => {
      const row = byCalendarMap.get(slug);
      const count = row?.count ?? 0;
      return {
        slug,
        title: row?.title ?? slug,
        count,
        percent: pct(count, bookingTotal),
      };
    });

    const marketingTotal = guestMarketing.reduce((s, x) => s + x.count, 0);

    const byCalendar = [...byCalendarMap.values()]
      .map((x) => ({ ...x, percent: pct(x.count, bookingTotal) }))
      .sort((a, b) => b.count - a.count);

    const byStatus = [...byStatusMap.entries()]
      .map(([status, count]) => ({ status, count, percent: pct(count, bookingTotal) }))
      .sort((a, b) => b.count - a.count);

    const bySource = [...bySourceMap.entries()]
      .map(([source, count]) => ({
        source,
        label: source === 'web' ? 'Gast (website)' : source === 'portal-model' ? 'Ingelogd model' : source,
        count,
        percent: pct(count, bookingTotal),
      }))
      .sort((a, b) => b.count - a.count);

    const byDayOfWeek = [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
      day: dow,
      label: DAY_LABELS[dow],
      count: byDowMap.get(dow) ?? 0,
    }));

    const byHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: byHourMap.get(hour) ?? 0,
    }));

    const bookingsByDate = [...byDateMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const pvTotal = pageViews.length;
    const sessions = new Set(pageViews.map((p) => p.sessionId).filter(Boolean));
    const loggedSessions = new Set(
      pageViews.filter((p) => p.userId).map((p) => p.userId as string),
    );
    const pathMap = new Map<string, number>();
    const pvByDateMap = new Map<string, number>();
    for (const p of pageViews) {
      pathMap.set(p.path, (pathMap.get(p.path) ?? 0) + 1);
      const dk = p.createdAt.toISOString().slice(0, 10);
      pvByDateMap.set(dk, (pvByDateMap.get(dk) ?? 0) + 1);
    }

    const topPaths = [...pathMap.entries()]
      .map(([path, count]) => ({ path, count, percent: pct(count, pvTotal) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const pageViewsByDate = [...pvByDateMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      bookings: {
        total: bookingTotal,
        marketingTotal,
        guestMarketing,
        byCalendar,
        byStatus,
        bySource,
        byDayOfWeek,
        byHour,
        byDate: bookingsByDate,
      },
      users: {
        totalModels,
        modelsLoggedInInRange: activeModels,
        newAccountsInRange: newUsers,
        totalClients,
      },
      traffic: {
        totalPageViews: pvTotal,
        uniqueSessions: sessions.size,
        uniqueLoggedInVisitors: loggedSessions.size,
        topPaths,
        byDate: pageViewsByDate,
      },
    };
  }
}
