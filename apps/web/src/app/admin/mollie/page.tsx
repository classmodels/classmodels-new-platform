'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type MollieSettings = {
  activeMode: 'test' | 'live';
  modeSource: 'database' | 'env' | 'default_test';
  hasApiKeyTest: boolean;
  hasApiKeyLive: boolean;
  activeKeyConfigured: boolean;
  effectiveWebhookUrl: string;
  webhookIgnoredLocalhost?: boolean;
  storedWebhookUrl?: string | null;
  suggestedWebhookUrl: string;
  apiPublicUrl: string;
  webhookUsesLocalhost?: boolean;
  apiKeyTest: string | null;
  apiKeyLive: string | null;
  webhookUrl: string | null;
  premiumPrice: string;
  tryoutPrice: string;
};

type TestResult = { ok: true; mode: string; message: string };

export default function AdminMolliePage() {
  const { token, can } = useAuth();
  const [data, setData] = useState<MollieSettings | null>(null);
  const [form, setForm] = useState({
    activeMode: 'test' as 'test' | 'live',
    apiKeyTest: '',
    apiKeyLive: '',
    webhookUrl: '',
    premiumPrice: '48',
    tryoutPrice: '600',
  });
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState<'test' | 'live' | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const d = await adminFetch<MollieSettings>('/admin/mollie-settings', token);
    setData(d);
    setForm((prev) => ({
      ...prev,
      activeMode: d.activeMode,
      apiKeyTest: '',
      apiKeyLive: '',
      webhookUrl: d.webhookUrl ?? '',
      premiumPrice: d.premiumPrice,
      tryoutPrice: d.tryoutPrice,
    }));
  }, [token]);

  useEffect(() => {
    load().catch(() => setData(null));
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaveMsg(null);
    setSaveErr(null);
    try {
      await adminFetch('/admin/mollie-settings', token, {
        method: 'PATCH',
        body: JSON.stringify({
          activeMode: form.activeMode,
          webhookUrl: form.webhookUrl || null,
          premiumPrice: parseFloat(form.premiumPrice),
          tryoutPrice: parseFloat(form.tryoutPrice),
          ...(form.apiKeyTest ? { apiKeyTest: form.apiKeyTest } : {}),
          ...(form.apiKeyLive ? { apiKeyLive: form.apiKeyLive } : {}),
        }),
      });
      setSaveMsg('Instellingen opgeslagen.');
      await load();
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Opslaan mislukt');
    }
  };

  const runTest = async (mode: 'test' | 'live') => {
    if (!token) return;
    if (mode === 'live' && data && !data.hasApiKeyLive) {
      setTestErr('Geen live key ingesteld — gebruik eerst Test verbinding (test key), of vul een live_… key in.');
      return;
    }
    if (mode === 'test' && data && !data.hasApiKeyTest && !form.apiKeyTest.trim()) {
      setTestErr('Geen test key ingesteld — plak je test_… key uit Mollie en klik Opslaan.');
      return;
    }
    setTestBusy(mode);
    setTestResult(null);
    setTestErr(null);
    try {
      const res = await adminFetch<TestResult>('/admin/mollie-settings/test-connection', token, {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      setTestResult(res);
    } catch (err) {
      setTestErr(err instanceof Error ? err.message : 'Test mislukt');
    } finally {
      setTestBusy(null);
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  const canWrite = can('admin.billing.write');

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Mollie-instellingen</h1>
        <p className="mt-2 text-sm text-muted">
          Kies <strong>test</strong> of <strong>live</strong> API-modus voor alle betalingen (premium en try-out).
          Vul de bijhorende key in en test de verbinding voordat je live gaat.
        </p>
      </div>

      {data ? (
        <div className="rounded-md border border-line bg-zinc-50 p-4 text-sm space-y-2">
          <p>
            <span className="font-medium text-ink">Actieve modus:</span>{' '}
            <span
              className={
                data.activeMode === 'live'
                  ? 'rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900'
                  : 'rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900'
              }
            >
              {data.activeMode === 'live' ? 'LIVE' : 'TEST'}
            </span>
            {data.modeSource === 'database' ? (
              <span className="ml-2 text-xs text-muted">(via backoffice)</span>
            ) : data.modeSource === 'env' ? (
              <span className="ml-2 text-xs text-muted">(via MOLLIE_MODE in .env)</span>
            ) : (
              <span className="ml-2 text-xs text-muted">(standaard: test)</span>
            )}
          </p>
          <p className="text-xs text-muted">
            Keys: test {data.hasApiKeyTest ? '✓' : '—'} ({data.apiKeyTest ?? 'niet ingesteld'}), live{' '}
            {data.hasApiKeyLive ? '✓' : '—'} ({data.apiKeyLive ?? 'niet ingesteld'})
          </p>
          {!data.activeKeyConfigured ? (
            <p className="text-xs font-medium text-red-700">
              De actieve modus heeft nog geen API key — afrekenen werkt niet tot je een key opslaat.
            </p>
          ) : null}
          {data.webhookIgnoredLocalhost ? (
            <p className="text-xs font-medium text-amber-900">
              Let op: in de database staat nog een localhost-webhook. Die wordt op live genegeerd; wis het veld
              hieronder en klik Opslaan.
            </p>
          ) : null}
          {data.webhookUsesLocalhost ? (
            <p className="text-xs font-medium text-red-700">
              Webhook wijst nog naar localhost — betalingen falen. Zet in Combell{' '}
              <code className="rounded bg-white px-1">API_PUBLIC_URL=https://api.class-models.be</code> en deploy
              opnieuw, of vul hieronder handmatig de webhook in.
            </p>
          ) : null}
          <p className="text-xs text-muted break-all">
            <span className="font-medium text-ink">Webhook (effectief):</span> {data.effectiveWebhookUrl}
          </p>
          <p className="text-xs text-muted break-all">
            Zet deze URL ook in je Mollie-dashboard (Developers → Webhooks). Suggestie op basis van API_PUBLIC_URL:{' '}
            <code className="rounded bg-white px-1">{data.suggestedWebhookUrl}</code>
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">Laden…</p>
      )}

      <form onSubmit={save} className="space-y-4 rounded-md border border-line bg-white p-4 text-sm shadow-sm">
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted">Actieve API-modus</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="activeMode"
                checked={form.activeMode === 'test'}
                disabled={!canWrite}
                onChange={() => setForm({ ...form, activeMode: 'test' })}
              />
              <span>Test API</span>
              <span className="text-xs text-muted">(test_… key)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="activeMode"
                checked={form.activeMode === 'live'}
                disabled={!canWrite}
                onChange={() => setForm({ ...form, activeMode: 'live' })}
              />
              <span>Live API</span>
              <span className="text-xs text-muted">(live_… key)</span>
            </label>
          </div>
        </fieldset>

        <label className="block">
          <span className="text-xs text-muted">
            Test API key {data?.hasApiKeyTest ? '(ingesteld — laat leeg om te behouden)' : ''}
          </span>
          <input
            className="mt-1 w-full rounded border border-line px-2 py-1 font-mono text-xs"
            placeholder="test_…"
            value={form.apiKeyTest}
            disabled={!canWrite}
            onChange={(e) => setForm({ ...form, apiKeyTest: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">
            Live API key {data?.hasApiKeyLive ? '(ingesteld — laat leeg om te behouden)' : ''}
          </span>
          <input
            className="mt-1 w-full rounded border border-line px-2 py-1 font-mono text-xs"
            placeholder="live_…"
            value={form.apiKeyLive}
            disabled={!canWrite}
            onChange={(e) => setForm({ ...form, apiKeyLive: e.target.value })}
            autoComplete="off"
          />
        </label>

        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={testBusy !== null}
              onClick={() => runTest('test')}
              className="rounded border border-line bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-50"
            >
              {testBusy === 'test' ? 'Testen…' : 'Test verbinding (test key)'}
            </button>
            <button
              type="button"
              disabled={testBusy !== null || !data?.hasApiKeyLive}
              title={!data?.hasApiKeyLive ? 'Eerst live key invullen en opslaan' : undefined}
              onClick={() => runTest('live')}
              className="rounded border border-line bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-50"
            >
              {testBusy === 'live' ? 'Testen…' : 'Test verbinding (live key)'}
            </button>
          </div>
        ) : null}
        <p className="text-xs text-muted">
          Gebruik <strong>Test verbinding (test key)</strong> zolang je in testmodus betaalt.
        </p>

        {testResult ? (
          <p className="text-xs text-emerald-800">
            Verbinding OK ({testResult.mode}): {testResult.message}
          </p>
        ) : null}
        {testErr ? <p className="text-xs text-red-700">{testErr}</p> : null}

        <label className="block">
          <span className="text-xs text-muted">
            Webhook-URL override (optioneel — <strong>laat leeg op live</strong>, dan:{' '}
            {data?.suggestedWebhookUrl ?? '…/payments/mollie/webhook'})
          </span>
          {/localhost|127\.0\.0\.1/i.test(form.webhookUrl) ? (
            <p className="mt-1 text-xs font-medium text-red-700">
              localhost werkt niet op class-models.be. Maak het veld leeg en klik Opslaan.
            </p>
          ) : null}
          <div className="mt-1 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded border border-line px-2 py-1 text-xs"
              placeholder="leeg laten op productie"
              value={form.webhookUrl}
              disabled={!canWrite}
              onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
            />
            {canWrite ? (
              <button
                type="button"
                className="shrink-0 rounded border border-line px-2 py-1 text-xs hover:bg-zinc-50"
                onClick={() => setForm({ ...form, webhookUrl: '' })}
              >
                Leegmaken
              </button>
            ) : null}
          </div>
        </label>
        <label className="block">
          <span className="text-xs text-muted">Premieprijs (EUR)</span>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border border-line px-2 py-1 text-xs"
            value={form.premiumPrice}
            disabled={!canWrite}
            onChange={(e) => setForm({ ...form, premiumPrice: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Try-out modeshow — inschrijfprijs (EUR)</span>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border border-line px-2 py-1 text-xs"
            value={form.tryoutPrice}
            disabled={!canWrite}
            onChange={(e) => setForm({ ...form, tryoutPrice: e.target.value })}
          />
        </label>

        {canWrite ? (
          <button type="submit" className="rounded bg-burgundy px-3 py-1.5 text-white hover:bg-burgundyDeep">
            Opslaan
          </button>
        ) : (
          <p className="text-xs text-muted">Alleen lezen — geen admin.billing.write.</p>
        )}
        {saveMsg ? <p className="text-xs text-emerald-800">{saveMsg}</p> : null}
        {saveErr ? <p className="text-xs text-red-700">{saveErr}</p> : null}
      </form>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
        <p className="font-medium">Productie (class-models.be)</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            Zet op de server <code>API_PUBLIC_URL=https://api.class-models.be</code> en{' '}
            <code>WEB_APP_URL=https://www.class-models.be</code>
          </li>
          <li>Webhook moet publiek bereikbaar zijn: https://api.class-models.be/payments/mollie/webhook</li>
          <li>
            Test eerst met modus <strong>Test</strong> + test key; schakel daarna over naar Live
          </li>
        </ul>
      </div>
    </div>
  );
}
