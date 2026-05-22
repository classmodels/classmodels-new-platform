'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { AgendaMailHtmlEditor } from '@/components/admin/AgendaMailTemplateEditor';

type RoleRow = { slug: string; label: string; _count: { users: number } };
type ContactList = { id: string; name: string; description?: string | null; _count: { entries: number } };

type RecipientRow = {
  key: string;
  include: boolean;
  displayName: string;
  email?: string;
  phone?: string;
  source: string;
  eligible: boolean;
};

type PreviewRes = {
  channel: 'email' | 'sms';
  recipients: RecipientRow[];
  total: number;
  eligible: number;
  included: number;
};

type AdhocRow = { email: string; phone: string; displayName: string };

export default function CommunicatieVerzendenPage() {
  const { token, can } = useAuth();
  const canSend = can('admin.push.send');

  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [rolePick, setRolePick] = useState<Set<string>>(() => new Set());
  const [contactListId, setContactListId] = useState('');
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [adhoc, setAdhoc] = useState<AdhocRow[]>([{ email: '', phone: '', displayName: '' }]);

  const [subject, setSubject] = useState('Bericht Class Models');
  const [htmlBody, setHtmlBody] = useState('<p></p>');
  const [smsBody, setSmsBody] = useState('');

  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [lastCampaignId, setLastCampaignId] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    if (!token) return;
    const [r, l] = await Promise.all([
      adminFetch<RoleRow[]>('/admin/comms/roles', token),
      adminFetch<ContactList[]>('/admin/comms/lists/options', token).catch(() => [] as ContactList[]),
    ]);
    setRoles(r);
    setLists(l);
  }, [token]);

  useEffect(() => {
    loadMeta().catch(() => setErr('Kon rollen of lijsten niet laden.'));
  }, [loadMeta]);

  const roleSlugs = useMemo(() => [...rolePick], [rolePick]);

  const adhocPayload = useMemo(
    () =>
      adhoc
        .map((a) => ({
          email: a.email.trim() || undefined,
          phone: a.phone.trim() || undefined,
          displayName: a.displayName.trim() || undefined,
        }))
        .filter((a) => a.email || a.phone),
    [adhoc],
  );

  const buildSendPayload = () => {
    const excludedKeys = recipients.filter((r) => r.eligible && !r.include).map((r) => r.key);
    return {
      channel,
      roleSlugs: roleSlugs.length ? roleSlugs : undefined,
      contactListId: contactListId.trim() || undefined,
      adhoc: adhocPayload.length ? adhocPayload : undefined,
      ...(excludedKeys.length ? { excludedKeys } : {}),
    };
  };

  const loadRecipients = async () => {
    if (!token) return;
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const p = await adminFetch<PreviewRes>('/admin/comms/preview', token, {
        method: 'POST',
        body: JSON.stringify({
          channel,
          roleSlugs: roleSlugs.length ? roleSlugs : undefined,
          contactListId: contactListId.trim() || undefined,
          adhoc: adhocPayload.length ? adhocPayload : undefined,
        }),
      });
      setRecipients(p.recipients);
      setOk(`${p.included} van ${p.eligible} ontvangers geselecteerd (${p.total} totaal).`);
    } catch (e: unknown) {
      setRecipients([]);
      setErr(e instanceof Error ? e.message : 'Ontvangers laden mislukt');
    } finally {
      setBusy(false);
    }
  };

  const toggleRecipient = (key: string, include: boolean) => {
    setRecipients((prev) => prev.map((r) => (r.key === key ? { ...r, include } : r)));
  };

  const setAllRecipients = (include: boolean) => {
    setRecipients((prev) => prev.map((r) => (r.eligible ? { ...r, include } : r)));
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !canSend) return;
    if (!recipients.length) {
      setErr('Laad eerst de ontvangers.');
      return;
    }
    const included = recipients.filter((r) => r.include && r.eligible).length;
    if (!included) {
      setErr('Geen ontvangers aangevinkt.');
      return;
    }
    if (!window.confirm(`Nu versturen naar ${included} ontvanger(s) (${channel})?`)) return;
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const base = buildSendPayload();
      const body =
        channel === 'email'
          ? { ...base, subject, htmlBody }
          : { ...base, smsBody };
      const res = await adminFetch<{
        campaignId: string;
        sent: number;
        failed: number;
        skipped: number;
        total?: number;
        background?: boolean;
        message?: string;
      }>('/admin/comms/send', token, { method: 'POST', body: JSON.stringify(body) });
      setLastCampaignId(res.campaignId ?? null);

      if (res.background && res.campaignId) {
        setOk(res.message ?? `Verzending gestart (${res.total ?? included} ontvangers)…`);
        const campaignId = res.campaignId;
        const poll = async () => {
          try {
            const c = await adminFetch<{
              sentCount: number;
              failedCount: number;
              skippedCount: number;
              stats: { sent: number; failed: number; total: number; planned?: number };
            }>(`/admin/comms/campaigns/${campaignId}`, token);
            const planned = c.stats?.planned ?? res.total ?? included;
            const done = (c.sentCount ?? 0) + (c.failedCount ?? 0) + (c.skippedCount ?? 0);
            if (done < planned) {
              setOk(
                `Bezig met verzenden: ${done} / ${planned} (verzonden: ${c.sentCount}, mislukt: ${c.failedCount})…`,
              );
              window.setTimeout(() => void poll(), 4000);
            } else {
              setOk(
                `Klaar: ${c.sentCount} verzonden, ${c.failedCount} mislukt, ${res.skipped ?? 0} overgeslagen.`,
              );
            }
          } catch {
            setOk('Verzending loopt op de server. Bekijk Communicatie → Geschiedenis.');
          }
        };
        window.setTimeout(() => void poll(), 3000);
      } else {
        setOk(`Verzonden: ${res.sent}, mislukt: ${res.failed}, overgeslagen: ${res.skipped}.`);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Versturen mislukt');
    } finally {
      setBusy(false);
    }
  };

  const includedCount = recipients.filter((r) => r.include && r.eligible).length;

  return (
    <form onSubmit={onSend} className="space-y-5">
      <p className="text-sm text-muted">
        Verzonden campagnes bekijkt u onder{' '}
        <Link href="/admin/communicatie/geschiedenis" className="text-burgundy underline">
          Communicatie → Geschiedenis
        </Link>
        . De aanhef <em>Beste [naam]</em> en de Class Models-footer worden automatisch toegevoegd bij e-mail (niet
        zichtbaar in de editor). SMTP en SMS-instellingen:{' '}
        <Link href="/admin/mail-instellingen" className="text-burgundy underline">
          E-mail
        </Link>
        ,{' '}
        <Link href="/admin/agenda/mail-preview" className="text-burgundy underline">
          Agenda mail/SMS
        </Link>
        .
      </p>

      <div className="rounded-md border border-line bg-white p-4 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-medium text-ink">Kanaal</p>
          <div className="mt-1 flex gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={channel === 'email'}
                onChange={() => {
                  setChannel('email');
                  setRecipients([]);
                }}
              />
              E-mail
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={channel === 'sms'}
                onChange={() => {
                  setChannel('sms');
                  setRecipients([]);
                }}
              />
              SMS
            </label>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-ink">Rollen</p>
          <div className="mt-2 max-h-40 overflow-y-auto rounded border border-line bg-panel p-2 space-y-1">
            {roles.map((r) => (
              <label key={r.slug} className="flex items-center gap-2 text-xs cursor-pointer">
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
                {r.label} <span className="text-muted">({r._count.users})</span>
              </label>
            ))}
          </div>
        </div>

        <label className="block text-xs text-muted">
          Contactlijst
          <select
            className="mt-1 w-full rounded border border-line px-2 py-2 text-sm"
            value={contactListId}
            onChange={(e) => setContactListId(e.target.value)}
          >
            <option value="">— geen —</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l._count.entries})
              </option>
            ))}
          </select>
          <span className="mt-1 block">
            <Link href="/admin/communicatie/lijsten" className="text-burgundy underline">
              Lijsten beheren
            </Link>
          </span>
        </label>

        <div>
          <p className="text-xs font-medium text-ink">Losse ontvanger(s)</p>
          <div className="mt-2 space-y-2">
            {adhoc.map((row, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-3">
                <input
                  placeholder="Naam (optioneel)"
                  className="rounded border border-line px-2 py-1.5 text-sm"
                  value={row.displayName}
                  onChange={(e) =>
                    setAdhoc((prev) => prev.map((x, j) => (j === i ? { ...x, displayName: e.target.value } : x)))
                  }
                />
                <input
                  placeholder="E-mail"
                  className="rounded border border-line px-2 py-1.5 text-sm"
                  value={row.email}
                  onChange={(e) =>
                    setAdhoc((prev) => prev.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))
                  }
                />
                <input
                  placeholder="GSM"
                  className="rounded border border-line px-2 py-1.5 text-sm"
                  value={row.phone}
                  onChange={(e) =>
                    setAdhoc((prev) => prev.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className="text-xs text-burgundy underline"
              onClick={() => setAdhoc((p) => [...p, { email: '', phone: '', displayName: '' }])}
            >
              + nog een ontvanger
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={busy || !token}
          onClick={() => void loadRecipients()}
          className="rounded border border-line bg-panel px-4 py-2 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50"
        >
          Ontvangers laden
        </button>
      </div>

      {recipients.length > 0 ? (
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs font-medium text-ink">
              Ontvangers ({includedCount} geselecteerd)
            </p>
            <div className="flex gap-2 text-xs">
              <button type="button" className="underline text-muted" onClick={() => setAllRecipients(true)}>
                Alles aan
              </button>
              <button type="button" className="underline text-muted" onClick={() => setAllRecipients(false)}>
                Alles uit
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto border border-line rounded">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 sticky top-0">
                <tr>
                  <th className="p-2 text-left w-8" />
                  <th className="p-2 text-left">Naam</th>
                  <th className="p-2 text-left">{channel === 'email' ? 'E-mail' : 'GSM'}</th>
                  <th className="p-2 text-left">Bron</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.key} className={!r.eligible ? 'opacity-40' : ''}>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        disabled={!r.eligible}
                        checked={r.include && r.eligible}
                        onChange={(e) => toggleRecipient(r.key, e.target.checked)}
                      />
                    </td>
                    <td className="p-2">{r.displayName}</td>
                    <td className="p-2 text-muted">{channel === 'email' ? r.email || '—' : r.phone || '—'}</td>
                    <td className="p-2 text-muted">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-line bg-white p-4 shadow-sm space-y-4">
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
            <div>
              <p className="text-xs text-muted mb-1">Inhoud (zonder aanhef en footer)</p>
              <AgendaMailHtmlEditor value={htmlBody} onChange={setHtmlBody} />
            </div>
          </>
        ) : (
          <label className="block text-xs text-muted">
            SMS-tekst
            <textarea
              className="mt-1 min-h-[120px] w-full rounded border border-line px-2 py-2 text-sm"
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
            />
          </label>
        )}
      </div>

      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      {ok ? (
        <p className="text-sm text-emerald-800">
          {ok}{' '}
          {lastCampaignId ? (
            <Link href={`/admin/communicatie/geschiedenis/${lastCampaignId}`} className="underline">
              Bekijk geschiedenis
            </Link>
          ) : null}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !canSend || !recipients.length}
        className="rounded bg-[#000b2b] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
      >
        {canSend ? 'Versturen' : 'Geen verzendrecht'}
      </button>
    </form>
  );
}
