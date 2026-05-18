'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type RoleRow = { slug: string; label: string; _count: { users: number } };
type PushList = { id: string; name: string; description?: string | null };

type PreviewRes = {
  totalAccounts: number;
  withEmail: number;
  withPhone: number;
  channel: 'email' | 'sms';
  eligible: number;
  sample: { id: string; name: string; hasEmail: boolean; hasPhone: boolean }[];
};

export default function AdminBulkMailSmsPage() {
  const { token, can } = useAuth();
  const canSend = can('admin.agenda.write');

  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [rolePick, setRolePick] = useState<Set<string>>(() => new Set());
  const [recipientListId, setRecipientListId] = useState('');
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [lists, setLists] = useState<PushList[]>([]);

  const [subject, setSubject] = useState('Bericht Class Models');
  const [htmlBody, setHtmlBody] = useState('<p>Beste model,</p><p>...</p><p>Met vriendelijke groet,<br/>Class Models</p>');
  const [smsBody, setSmsBody] = useState('');

  const [preview, setPreview] = useState<PreviewRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    if (!token) return;
    const [r, l] = await Promise.all([
      adminFetch<RoleRow[]>('/admin/messaging/bulk/roles', token),
      adminFetch<PushList[]>('/admin/messaging/bulk/recipient-lists', token),
    ]);
    setRoles(r);
    setLists(l);
  }, [token]);

  useEffect(() => {
    loadMeta().catch(() => {
      setErr('Kon rollen of lijsten niet laden.');
    });
  }, [loadMeta]);

  const roleSlugs = useMemo(() => [...rolePick], [rolePick]);

  const buildPreviewPayload = () => ({
    channel,
    roleSlugs: roleSlugs.length ? roleSlugs : undefined,
    recipientListId: recipientListId.trim() || undefined,
  });

  const runPreview = async () => {
    if (!token) return;
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const p = await adminFetch<PreviewRes>('/admin/messaging/bulk/preview', token, {
        method: 'POST',
        body: JSON.stringify(buildPreviewPayload()),
      });
      setPreview(p);
      setOk('Voorbeeld berekend.');
    } catch (e: unknown) {
      setPreview(null);
      setErr(e instanceof Error ? e.message : 'Voorbeeld mislukt');
    } finally {
      setBusy(false);
    }
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !canSend) return;
    if (!preview) {
      setErr('Bereken eerst een voorbeeld (knop “Voorbeeld”).');
      return;
    }
    if (!window.confirm(`Nu versturen naar max. ${preview.eligible} ontvangers (${channel})?`)) return;
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const body =
        channel === 'email'
          ? { ...buildPreviewPayload(), subject, htmlBody }
          : { ...buildPreviewPayload(), smsBody };
      const res = await adminFetch<{ sent: number; failed: number; skipped: number; total: number }>(
        '/admin/messaging/bulk/send',
        token,
        { method: 'POST', body: JSON.stringify(body) },
      );
      setOk(`Verzonden: ${res.sent}, overgeslagen (geen ${channel === 'email' ? 'e-mail' : 'GSM'}): ${res.skipped}, mislukt: ${res.failed} (accounts: ${res.total}).`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Versturen mislukt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Bulk mail &amp; SMS</h1>
        <p className="mt-1 text-sm text-muted">
          Kies één of meer <strong>rollen</strong> en/of een <strong>push-lijst</strong>. Ontvangers zijn de unie van
          beide (geen dubbels). Lijsten beheer je onder{' '}
          <Link href="/admin/push-lijsten" className="text-burgundy underline">
            Push-lijsten
          </Link>
          . Voor e-mail: SMTP onder Admin → E-mail. Voor SMS: BulkSMS onder{' '}
          <Link href="/admin/agenda/mail-preview" className="text-burgundy underline">
            Mail / SMS
          </Link>
          .
        </p>
      </div>

      <form onSubmit={onSend} className="space-y-5 rounded-md border border-line bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-medium text-ink">Kanaal</p>
          <div className="mt-1 flex gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="ch"
                checked={channel === 'email'}
                onChange={() => {
                  setChannel('email');
                  setPreview(null);
                }}
              />
              E-mail (HTML)
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="ch"
                checked={channel === 'sms'}
                onChange={() => {
                  setChannel('sms');
                  setPreview(null);
                }}
              />
              SMS (platte tekst)
            </label>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-ink">Rollen (optioneel, meerdere mogelijk)</p>
          <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded border border-line bg-panel p-2">
            {roles.map((r) => (
              <label key={r.slug} className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={rolePick.has(r.slug)}
                  onChange={() =>
                    setRolePick((prev) => {
                      const n = new Set(prev);
                      if (n.has(r.slug)) n.delete(r.slug);
                      else n.add(r.slug);
                      return n;
                    })
                  }
                />
                <span>
                  {r.label}{' '}
                  <span className="text-muted">({r._count.users})</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="block text-xs text-muted">
          Push-lijst (optioneel)
          <select
            className="mt-1 w-full rounded border border-line px-2 py-2 text-sm"
            value={recipientListId}
            onChange={(e) => {
              setRecipientListId(e.target.value);
              setPreview(null);
            }}
          >
            <option value="">— geen extra lijst —</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        {channel === 'email' ? (
          <>
            <label className="block text-xs text-muted">
              Onderwerp
              <input
                className="mt-1 w-full rounded border border-line px-2 py-2 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label className="block text-xs text-muted">
              HTML-inhoud
              <textarea
                className="mt-1 min-h-[200px] w-full rounded border border-line px-2 py-2 font-mono text-xs"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
              />
            </label>
          </>
        ) : (
          <label className="block text-xs text-muted">
            SMS-tekst (max. ca. 4×160 tekens aanbevolen)
            <textarea
              className="mt-1 min-h-[140px] w-full rounded border border-line px-2 py-2 font-mono text-xs"
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
            />
          </label>
        )}

        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        {ok ? <p className="text-sm text-emerald-800">{ok}</p> : null}

        {preview ? (
          <div className="rounded border border-line bg-zinc-50 p-3 text-xs">
            <p className="font-medium text-ink">Voorbeeld (demogegevens)</p>
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-muted">
              <li>Accounts na filter: {preview.totalAccounts}</li>
              <li>Met e-mail: {preview.withEmail}</li>
              <li>Met GSM: {preview.withPhone}</li>
              <li className="font-medium text-ink">
                Klaar voor dit kanaal: <strong>{preview.eligible}</strong>
              </li>
            </ul>
            {preview.sample.length ? (
              <p className="mt-2 text-muted">
                Voorbeeldnamen: {preview.sample.map((s) => s.name).join(', ')}
                {preview.totalAccounts > preview.sample.length ? ' …' : ''}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !token}
            onClick={() => void runPreview()}
            className="rounded border border-line bg-panel px-4 py-2 text-xs font-medium text-ink hover:bg-zinc-100 disabled:opacity-50"
          >
            Voorbeeld
          </button>
          <button
            type="submit"
            disabled={busy || !token || !canSend}
            className="rounded bg-[#000b2b] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {canSend ? 'Nu versturen' : 'Alleen lezen (geen verzendrecht)'}
          </button>
        </div>
      </form>
    </div>
  );
}
