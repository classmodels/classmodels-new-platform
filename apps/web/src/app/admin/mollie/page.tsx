'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

export default function AdminMolliePage() {
  const { token } = useAuth();
  const [data, setData] = useState<{
    apiKeyTest: string | null;
    apiKeyLive: string | null;
    webhookUrl: string | null;
    premiumPrice: string;
  } | null>(null);
  const [form, setForm] = useState({
    apiKeyTest: '',
    apiKeyLive: '',
    webhookUrl: '',
    premiumPrice: '48',
  });

  const load = useCallback(async () => {
    if (!token) return;
    const d = await adminFetch<{
      apiKeyTest: string | null;
      apiKeyLive: string | null;
      webhookUrl: string | null;
      premiumPrice: string;
    }>('/admin/mollie-settings', token);
    setData(d);
    setForm({
      apiKeyTest: '',
      apiKeyLive: '',
      webhookUrl: d.webhookUrl ?? '',
      premiumPrice: d.premiumPrice,
    });
  }, [token]);

  useEffect(() => {
    load().catch(() => setData(null));
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await adminFetch('/admin/mollie-settings', token, {
      method: 'PATCH',
      body: JSON.stringify({
        webhookUrl: form.webhookUrl || null,
        premiumPrice: parseFloat(form.premiumPrice),
        ...(form.apiKeyTest ? { apiKeyTest: form.apiKeyTest } : {}),
        ...(form.apiKeyLive ? { apiKeyLive: form.apiKeyLive } : {}),
      }),
    });
    await load();
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-ink">Mollie-instellingen</h1>
      <p className="text-sm text-muted">
        Masked keys tonen alleen een deel. Vul nieuwe keys alleen in om te vervangen. Laat webhook leeg voor de
        standaard <code className="text-xs">…/payments/mollie/webhook</code> op <code className="text-xs">API_PUBLIC_URL</code>
        ; anders wordt de ingevulde volledige URL bij elke betaling naar Mollie gestuurd.
      </p>
      {data ? (
        <p className="text-xs text-muted">
          Huidig (masked): test {data.apiKeyTest ?? '—'}, live {data.apiKeyLive ?? '—'}
        </p>
      ) : null}
      <form onSubmit={save} className="space-y-3 rounded-md border border-line bg-white p-4 text-sm shadow-sm">
        <label className="block">
          <span className="text-xs text-muted">Nieuwe test API key (optioneel)</span>
          <input
            className="mt-1 w-full rounded border border-line px-2 py-1 font-mono text-xs"
            value={form.apiKeyTest}
            onChange={(e) => setForm({ ...form, apiKeyTest: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Nieuwe live API key (optioneel)</span>
          <input
            className="mt-1 w-full rounded border border-line px-2 py-1 font-mono text-xs"
            value={form.apiKeyLive}
            onChange={(e) => setForm({ ...form, apiKeyLive: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Webhook-URL (notitie / Mollie dashboard)</span>
          <input
            className="mt-1 w-full rounded border border-line px-2 py-1 text-xs"
            value={form.webhookUrl}
            onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Premieprijs (EUR)</span>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border border-line px-2 py-1 text-xs"
            value={form.premiumPrice}
            onChange={(e) => setForm({ ...form, premiumPrice: e.target.value })}
          />
        </label>
        <button type="submit" className="rounded bg-burgundy px-3 py-1.5 text-white hover:bg-burgundyDeep">
          Opslaan
        </button>
      </form>
    </div>
  );
}
