'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type AppDevice = {
  id: string;
  displayMode: string;
  platform: string | null;
  installSource: string | null;
  userAgent: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

type PushDevice = {
  id: string;
  endpointPreview: string;
  userAgent: string | null;
  createdAt: string;
};

type ModelRow = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  hasApp: boolean;
  hasPush: boolean;
  appDevices: AppDevice[];
  pushDevices: PushDevice[];
};

type Overview = {
  stats: {
    modelsWithApp: number;
    modelsWithPush: number;
    totalAppDevices: number;
    totalPushSubscriptions: number;
  };
  models: ModelRow[];
};

function formatName(row: ModelRow): string {
  return [row.firstName, row.lastName].filter(Boolean).join(' ') || '—';
}

function formatPlatform(p: string | null): string {
  if (p === 'ios') return 'iOS';
  if (p === 'android') return 'Android';
  if (p === 'desktop') return 'Desktop';
  return p || '—';
}

export default function AppApparatenPage() {
  const { token, can } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [filter, setFilter] = useState<'all' | 'app' | 'push' | 'both'>('all');

  const load = useCallback(async () => {
    if (!token || !can('admin.push.send')) return;
    try {
      setData(await adminFetch<Overview>('/admin/push/devices-overview', token));
    } catch {
      setData(null);
    }
  }, [token, can]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!can('admin.push.send')) {
    return <p className="text-sm text-muted">Geen rechten om app-apparaten te bekijken.</p>;
  }

  const models = (data?.models ?? []).filter((m) => {
    if (filter === 'app') return m.hasApp;
    if (filter === 'push') return m.hasPush;
    if (filter === 'both') return m.hasApp && m.hasPush;
    return true;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Overzicht van modellen die de app op hun gsm hebben geïnstalleerd (standalone/PWA) en/of pushmeldingen
        hebben ingeschakeld. Alleen ingelogde modellen worden getrackt bij app-gebruik.
      </p>

      {data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Modellen met app', value: data.stats.modelsWithApp },
            { label: 'Modellen met push', value: data.stats.modelsWithPush },
            { label: 'App-apparaten totaal', value: data.stats.totalAppDevices },
            { label: 'Push-abonnementen', value: data.stats.totalPushSubscriptions },
          ].map((s) => (
            <div key={s.label} className="rounded border border-line bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{s.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'Alle'],
            ['app', 'Alleen app'],
            ['push', 'Alleen push'],
            ['both', 'App + push'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filter === id ? 'bg-zinc-900 text-white' : 'border border-line bg-white text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded border border-line bg-white overflow-x-auto">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-2 text-left">Model</th>
              <th className="p-2 text-left">E-mail</th>
              <th className="p-2 text-left">App</th>
              <th className="p-2 text-left">Push</th>
              <th className="p-2 text-left">Laatst gezien / push sinds</th>
              <th className="p-2 text-left">Platform</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted">
                  {data ? 'Geen resultaten voor dit filter.' : 'Laden…'}
                </td>
              </tr>
            ) : (
              models.map((m) => {
                const lastApp = m.appDevices[0]?.lastSeenAt;
                const lastPush = m.pushDevices[0]?.createdAt;
                const lastSeen = [lastApp, lastPush]
                  .filter(Boolean)
                  .map((d) => new Date(d!).getTime())
                  .sort((a, b) => b - a)[0];
                const platforms = [
                  ...new Set(m.appDevices.map((d) => d.platform).filter(Boolean)),
                ] as string[];

                return (
                  <tr key={m.userId} className="border-t border-line align-top">
                    <td className="p-2 font-medium">{formatName(m)}</td>
                    <td className="p-2">{m.email}</td>
                    <td className="p-2">
                      {m.hasApp ? (
                        <span className="inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900">
                          Ja ({m.appDevices.length})
                        </span>
                      ) : (
                        <span className="text-muted">Nee</span>
                      )}
                    </td>
                    <td className="p-2">
                      {m.hasPush ? (
                        <span className="inline-flex rounded bg-sky-100 px-1.5 py-0.5 text-sky-900">
                          Ja ({m.pushDevices.length})
                        </span>
                      ) : (
                        <span className="text-muted">Nee</span>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {lastSeen ? new Date(lastSeen).toLocaleString('nl-BE') : '—'}
                    </td>
                    <td className="p-2">{platforms.map(formatPlatform).join(', ') || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
