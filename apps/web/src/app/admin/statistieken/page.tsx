'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Dashboard = {
  range: { from: string; to: string };
  bookings: {
    total: number;
    marketingTotal: number;
    guestMarketing: { slug: string; title: string; count: number; percent: number }[];
    byCalendar: { slug: string; title: string; count: number; percent: number }[];
    byStatus: { status: string; count: number; percent: number }[];
    bySource: { source: string; label: string; count: number; percent: number }[];
    byDayOfWeek: { day: number; label: string; count: number }[];
    byHour: { hour: number; count: number }[];
    byDate: { date: string; count: number }[];
  };
  users: {
    totalModels: number;
    modelsLoggedInInRange: number;
    newAccountsInRange: number;
    totalClients: number;
  };
  traffic: {
    totalPageViews: number;
    uniqueSessions: number;
    uniqueLoggedInVisitors: number;
    topPaths: { path: string; count: number; percent: number }[];
    byDate: { date: string; count: number }[];
  };
};

const PIE_COLORS = ['#6f121b', '#9a1c28', '#c4a574', '#2d6a4f', '#457b9d', '#6c757d', '#e9c46a'];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: isoDate(from), to: isoDate(to) };
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-burgundy">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

export default function AdminStatistiekenPage() {
  const { token } = useAuth();
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState<Dashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams({ from: range.from, to: range.to });
      const d = await adminFetch<Dashboard>(`/admin/analytics/dashboard?${q}`, token);
      setData(d);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  }, [token, range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const preset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setRange({ from: isoDate(from), to: isoDate(to) });
  };

  const bookingLine = useMemo(
    () => data?.bookings.byDate.map((x) => ({ ...x, label: x.date.slice(5) })) ?? [],
    [data],
  );

  const trafficLine = useMemo(
    () => data?.traffic.byDate.map((x) => ({ ...x, label: x.date.slice(5) })) ?? [],
    [data],
  );

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Statistieken</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Afspraken (fotoshoot, casting, intake), bezoekers en modellen. Kies een periode om een
            Facebook/Instagram-actie te vergelijken (bv. week vóór en week tijdens campagne).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => preset(7)}>
            7 dagen
          </button>
          <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => preset(30)}>
            30 dagen
          </button>
          <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => preset(90)}>
            90 dagen
          </button>
          <label className="text-xs">
            Van
            <input
              type="date"
              className="ml-1 rounded border border-line px-2 py-1"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </label>
          <label className="text-xs">
            Tot
            <input
              type="date"
              className="ml-1 rounded border border-line px-2 py-1"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded bg-burgundy px-3 py-1.5 text-xs font-medium text-white hover:bg-burgundyDeep disabled:opacity-60"
          >
            {loading ? 'Laden…' : 'Vernieuwen'}
          </button>
        </div>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      {data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Marketing-afspraken" value={data.bookings.marketingTotal} sub="fotoshoot + casting + intake" />
            <Kpi label="Paginaweergaven" value={data.traffic.totalPageViews} sub={`${data.traffic.uniqueSessions} sessies`} />
            <Kpi label="Modellen (totaal)" value={data.users.totalModels} sub={`${data.users.modelsLoggedInInRange} ingelogd in periode`} />
            <Kpi label="Nieuwe accounts" value={data.users.newAccountsInRange} sub={`${data.users.totalClients} klanten totaal`} />
          </section>

          <section className="rounded-md border border-line bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-ink">Gratis fotoshoot, casting & intake</h2>
            <p className="text-xs text-muted">Aantal gemaakte afspraken in de gekozen periode</p>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.bookings.guestMarketing} dataKey="count" nameKey="title" cx="50%" cy="50%" outerRadius={80} label={({ title, percent }) => `${title} ${percent}%`}>
                      {data.bookings.guestMarketing.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2">Type</th>
                    <th className="py-2">Aantal</th>
                    <th className="py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bookings.guestMarketing.map((r) => (
                    <tr key={r.slug} className="border-b border-line/60">
                      <td className="py-2">{r.title}</td>
                      <td className="py-2 font-medium">{r.count}</td>
                      <td className="py-2">{r.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Afspraken per dag" subtitle="Trend — handig rond campagnes">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={bookingLine}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#6f121b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Bezoekers per dag" subtitle="Paginaweergaven">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trafficLine}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#457b9d" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Op welke dag worden afspraken gemaakt?" subtitle="Ma–zo (wanneer mensen boeken)">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.bookings.byDayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6f121b" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Op welk uur worden afspraken gemaakt?" subtitle="24u (tijdstip van boeking)">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.bookings.byHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#9a1c28" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Bron van afspraak" subtitle="Website vs ingelogd model">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.bookings.bySource} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
                    {data.bookings.bySource.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status afspraken">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.bookings.byStatus} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="status" width={75} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#c4a574" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          <section className="rounded-md border border-line bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-ink">Meest bezochte pagina&apos;s</h2>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2">Pad</th>
                  <th className="py-2">Weergaven</th>
                  <th className="py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {data.traffic.topPaths.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-muted">
                      Nog geen data — bezoek de live site na deploy om tellingen op te bouwen.
                    </td>
                  </tr>
                ) : (
                  data.traffic.topPaths.map((r) => (
                    <tr key={r.path} className="border-b border-line/60">
                      <td className="py-2 font-mono text-xs">{r.path}</td>
                      <td className="py-2">{r.count}</td>
                      <td className="py-2">{r.percent}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              Unieke bezoekers (sessies): {data.traffic.uniqueSessions} · Ingelogde bezoekers:{' '}
              {data.traffic.uniqueLoggedInVisitors}
            </p>
          </section>

          <section className="rounded-md border border-line bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-ink">Alle agenda&apos;s</h2>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2">Agenda</th>
                  <th className="py-2">Afspraken</th>
                  <th className="py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.byCalendar.map((r) => (
                  <tr key={r.slug} className="border-b border-line/60">
                    <td className="py-2">{r.title}</td>
                    <td className="py-2">{r.count}</td>
                    <td className="py-2">{r.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : loading ? (
        <p className="text-sm text-muted">Statistieken laden…</p>
      ) : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-ink">{title}</h2>
      {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}
