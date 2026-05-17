'use client';

import { AGENDA_DEFAULT_BOOKING_EMAIL_HTML } from '@cm/shared';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { getApiBase } from '@/lib/api';

type Template = {
  id: string;
  channel: string;
  name: string;
  enabled: boolean;
  trigger: string;
  offsetMinutes: number;
  subject: string | null;
  body: string;
  calendarSlugs: unknown;
  sortOrder: number;
};

const PLACEHOLDERS = [
  ['client_name', 'Naam klant'],
  ['calendar_title', 'Titel agenda'],
  ['appointment_date', 'Datum (tekst)'],
  ['appointment_time', 'Uur (tekst)'],
  ['cancel_url', 'Annuleer-URL (ge-escaped; gebruik in href of tekst)'],
  ['confirm_url', 'Bevestig-URL (ge-escaped)'],
  ['cancel_link_html', 'HTML-link annuleren'],
  ['confirm_link_html', 'HTML-link komst bevestigen'],
  ['cancel_button_html', 'Knop “Afspraak annuleren” (tabel + stijl)'],
  ['confirm_button_html', 'Knop “Ik bevestig mijn komst” (tabel + stijl)'],
] as const;

function offsetMinutesToHoursInput(m: number): string {
  const x = m / 60;
  if (Number.isInteger(x)) return String(x);
  const r = Math.round(x * 1000) / 1000;
  return String(r);
}

const TRIGGERS = [
  ['booking_created', 'Bij nieuwe boeking'],
  ['booking_cancelled', 'Bij annulatie'],
  ['booking_confirmed', 'Bij komst bevestigd'],
  ['reminder', 'Herinnering (offset in uren; negatief = vóór start)'],
  ['followup', 'Opvolging (offset in uren; positief = na start)'],
] as const;

export default function AdminAgendaMailSmsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'preview' | 'templates' | 'sms'>('preview');
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [calendars, setCalendars] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [editing, setEditing] = useState<null | Partial<Template> & { id?: string }>(null);
  const [slugPick, setSlugPick] = useState<Set<string>>(() => new Set());

  const [bulksmsUser, setBulksmsUser] = useState('');
  const [bulksmsPass, setBulksmsPass] = useState('');
  const [hasPass, setHasPass] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!token) return;
    setErr(null);
    setOk(null);
    try {
      const res = await fetch(`${getApiBase()}/admin/agenda/notifications/preview/booking-confirmation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const t = await res.text();
      if (!res.ok) throw new Error(t || res.statusText);
      setHtml(t);
      setOk('Voorbeeld geladen.');
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setHtml(null);
    }
  }, [token, router]);

  const loadTemplates = useCallback(async () => {
    if (!token) return;
    const rows = await adminFetch<Template[]>('/admin/agenda/notification-templates', token);
    setTemplates(rows);
  }, [token]);

  const loadCals = useCallback(async () => {
    if (!token) return;
    const rows = await adminFetch<{ id: string; slug: string; title: string }[]>('/admin/agenda/calendars', token);
    setCalendars(rows);
  }, [token]);

  const loadSmsSettings = useCallback(async () => {
    if (!token) return;
    const s = await adminFetch<{ bulksmsUsername: string | null; hasBulksmsPassword: boolean }>(
      '/admin/agenda/messaging-settings',
      token,
    );
    setBulksmsUser(s.bulksmsUsername ?? '');
    setHasPass(s.hasBulksmsPassword);
    setBulksmsPass('');
  }, [token]);

  useEffect(() => {
    loadPreview().catch(() => {});
  }, [loadPreview]);

  useEffect(() => {
    if (tab === 'templates') {
      loadTemplates().catch(() => {});
      loadCals().catch(() => {});
    }
    if (tab === 'sms') loadSmsSettings().catch(() => {});
  }, [tab, loadTemplates, loadCals, loadSmsSettings]);

  const openNew = () => {
    setEditing({
      channel: 'email',
      name: 'Nieuw sjabloon',
      enabled: true,
      trigger: 'booking_created',
      offsetMinutes: 0,
      subject: 'Bevestiging: {{calendar_title}} — Class Models',
      body: AGENDA_DEFAULT_BOOKING_EMAIL_HTML,
      sortOrder: 100,
    });
    setSlugPick(new Set());
  };

  const openEdit = (t: Template) => {
    setEditing({ ...t });
    const slugs = Array.isArray(t.calendarSlugs) ? (t.calendarSlugs as string[]) : [];
    setSlugPick(new Set(slugs));
  };

  const saveTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editing?.name || !editing.body) return;
    setErr(null);
    try {
      const payload = {
        channel: editing.channel ?? 'email',
        name: editing.name,
        enabled: editing.enabled ?? true,
        trigger: editing.trigger ?? 'booking_created',
        offsetMinutes: editing.offsetMinutes ?? 0,
        subject: editing.subject ?? undefined,
        body: editing.body,
        calendarSlugs: [...slugPick],
        sortOrder: editing.sortOrder ?? 100,
      };
      if (editing.id) {
        await adminFetch(`/admin/agenda/notification-templates/${editing.id}`, token, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await adminFetch('/admin/agenda/notification-templates', token, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      setOk('Opgeslagen.');
      await loadTemplates();
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Opslaan mislukt');
    }
  };

  const duplicate = async (id: string) => {
    if (!token) return;
    await adminFetch(`/admin/agenda/notification-templates/${id}/duplicate`, token, { method: 'POST' });
    await loadTemplates();
  };

  const remove = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Sjabloon verwijderen?')) return;
    await adminFetch(`/admin/agenda/notification-templates/${id}`, token, { method: 'DELETE' });
    await loadTemplates();
  };

  const saveBulksms = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    try {
      await adminFetch('/admin/agenda/messaging-settings', token, {
        method: 'PATCH',
        body: JSON.stringify({
          bulksmsUsername: bulksmsUser.trim() || null,
          bulksmsPassword: bulksmsPass.trim() ? bulksmsPass : undefined,
        }),
      });
      setOk('BulkSMS-instellingen opgeslagen.');
      await loadSmsSettings();
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Opslaan mislukt');
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-line pb-2">
        {(
          [
            ['preview', 'Voorbeeld'],
            ['templates', 'E-mail / SMS sjablonen'],
            ['sms', 'BulkSMS account'],
          ] as const
        ).map(([k, lab]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k);
              setErr(null);
              setOk(null);
            }}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              tab === k ? 'bg-zinc-900 text-white' : 'border border-line bg-white text-ink'
            }`}
          >
            {lab}
          </button>
        ))}
      </div>

      {ok ? <p className="text-xs font-medium text-emerald-800">{ok}</p> : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      {tab === 'preview' ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Standaardbevestigingsmail (zonder sjabloon in de database). Zonder <code className="rounded bg-zinc-100 px-1">SMTP_HOST</code>{' '}
            wordt er geen echte mail verstuurd.
          </p>
          <button
            type="button"
            onClick={() => void loadPreview()}
            className="rounded border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink"
          >
            Vernieuwen
          </button>
          {html ? (
            <div
              className="max-h-[80vh] overflow-auto rounded-lg border border-line bg-white p-2 shadow-sm"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'templates' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              Sjablonen met <strong>trigger</strong> en <strong>offset in uren</strong> (0 = meteen). Bij herinnering/opvolging:
              negatieve uren = vóór de start van de afspraak, positieve = erna. Waarde wordt als minuten opgeslagen; offset ≠ 0
              volgt later via een planner.
            </p>
            <button type="button" className="rounded bg-[#000b2b] px-3 py-1.5 text-xs font-medium text-white" onClick={openNew}>
              + Nieuw sjabloon
            </button>
          </div>
          <div className="rounded-md border border-line bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-panel text-muted">
                <tr>
                  <th className="p-2">Naam</th>
                  <th className="p-2">Kanaal</th>
                  <th className="p-2">Trigger</th>
                  <th className="p-2">Offset (uur)</th>
                  <th className="p-2">Actief</th>
                  <th className="p-2">Acties</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-line/70">
                    <td className="p-2 font-medium text-ink">{t.name}</td>
                    <td className="p-2">{t.channel}</td>
                    <td className="p-2">{t.trigger}</td>
                    <td className="p-2">{offsetMinutesToHoursInput(t.offsetMinutes)}</td>
                    <td className="p-2">{t.enabled ? 'ja' : 'nee'}</td>
                    <td className="p-2">
                      <button type="button" className="mr-2 text-burgundy underline" onClick={() => openEdit(t)}>
                        Bewerken
                      </button>
                      <button type="button" className="mr-2 text-ink underline" onClick={() => void duplicate(t.id)}>
                        Dupliceren
                      </button>
                      <button type="button" className="text-red-700 underline" onClick={() => void remove(t.id)}>
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!templates.length ? <p className="p-4 text-xs text-muted">Nog geen sjablonen — voeg er een toe of gebruik de standaardmail.</p> : null}
          </div>

          <div className="rounded-md border border-line bg-panel p-4">
            <h3 className="text-sm font-semibold text-ink">Codes (in onderwerp en inhoud)</h3>
            <ul className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
              {PLACEHOLDERS.map(([code, lab]) => (
                <li key={code}>
                  <code className="rounded bg-white px-1">{`{{${code}}}`}</code> — {lab}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              Tip: voor knoppen gebruik je <code className="rounded bg-white px-1">{'{{confirm_button_html}}'}</code> en{' '}
              <code className="rounded bg-white px-1">{'{{cancel_button_html}}'}</code>. Zelf een knop maken:{' '}
              <code className="rounded bg-white px-1">&lt;a href=&quot;{'{{confirm_url}}'}&quot;&gt;…&lt;/a&gt;</code> (URL is al
              ge-escaped).
            </p>
          </div>

          {editing ? (
            <form onSubmit={saveTemplate} className="space-y-3 rounded-md border border-line bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-ink">{editing.id ? 'Sjabloon bewerken' : 'Nieuw sjabloon'}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted">
                  Naam
                  <input
                    className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                    value={editing.name ?? ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    required
                  />
                </label>
                <label className="text-xs text-muted">
                  Kanaal
                  <select
                    className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                    value={editing.channel ?? 'email'}
                    onChange={(e) => setEditing({ ...editing, channel: e.target.value })}
                  >
                    <option value="email">E-mail (HTML)</option>
                    <option value="sms">SMS (platte tekst)</option>
                  </select>
                </label>
                <label className="text-xs text-muted">
                  Trigger
                  <select
                    className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                    value={editing.trigger ?? 'booking_created'}
                    onChange={(e) => setEditing({ ...editing, trigger: e.target.value })}
                  >
                    {TRIGGERS.map(([v, lab]) => (
                      <option key={v} value={v}>
                        {lab}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-muted">
                  Offset (uren)
                  <input
                    type="number"
                    step={0.25}
                    className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                    value={(editing.offsetMinutes ?? 0) / 60}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      setEditing({ ...editing, offsetMinutes: Number.isFinite(v) ? Math.round(v * 60) : 0 });
                    }}
                  />
                </label>
                {editing.channel !== 'sms' ? (
                  <label className="text-xs text-muted sm:col-span-2">
                    Onderwerp (e-mail)
                    <input
                      className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                      value={editing.subject ?? ''}
                      onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                    />
                  </label>
                ) : null}
              </div>
              <label className="text-xs text-muted">
                Inhoud (HTML of SMS-tekst)
                <textarea
                  className="mt-1 min-h-[220px] w-full rounded border border-line px-2 py-2 font-mono text-xs leading-relaxed"
                  value={editing.body ?? ''}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  required
                />
              </label>
              {editing.channel === 'email' ? (
                <button
                  type="button"
                  className="rounded border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-zinc-100"
                  onClick={() =>
                    setEditing((prev) =>
                      prev ? { ...prev, body: AGENDA_DEFAULT_BOOKING_EMAIL_HTML } : prev,
                    )
                  }
                >
                  Standaard HTML (Class Models) invoegen
                </button>
              ) : null}
              <div>
                <p className="text-xs font-medium text-ink">Geldt voor agenda&apos;s (leeg = alle)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {calendars.map((c) => (
                    <label key={c.id} className="flex items-center gap-1 text-[11px]">
                      <input
                        type="checkbox"
                        checked={slugPick.has(c.slug)}
                        onChange={() =>
                          setSlugPick((prev) => {
                            const n = new Set(prev);
                            if (n.has(c.slug)) n.delete(c.slug);
                            else n.add(c.slug);
                            return n;
                          })
                        }
                      />
                      {c.title}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="rounded bg-[#000b2b] px-4 py-2 text-xs font-medium text-white">
                  Opslaan
                </button>
                <button type="button" className="rounded border border-line px-4 py-2 text-xs" onClick={() => setEditing(null)}>
                  Annuleren
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {tab === 'sms' ? (
        <form onSubmit={saveBulksms} className="max-w-lg space-y-4 rounded-md border border-line bg-white p-4 shadow-sm">
          <p className="text-sm text-muted">
            Belgische nummers worden automatisch als +32… naar BulkSMS gestuurd. Je kunt ook{' '}
            <code className="rounded bg-zinc-100 px-1">BULKSMS_USERNAME</code> /{' '}
            <code className="rounded bg-zinc-100 px-1">BULKSMS_PASSWORD</code> in de server-env zetten.
          </p>
          <label className="block text-xs text-muted">
            BulkSMS gebruikersnaam
            <input
              className="mt-1 w-full rounded border border-line px-2 py-2 text-sm"
              value={bulksmsUser}
              onChange={(e) => setBulksmsUser(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="block text-xs text-muted">
            BulkSMS wachtwoord {hasPass ? <span className="text-emerald-700">(reeds ingesteld)</span> : null}
            <input
              type="password"
              className="mt-1 w-full rounded border border-line px-2 py-2 text-sm"
              value={bulksmsPass}
              onChange={(e) => setBulksmsPass(e.target.value)}
              placeholder={hasPass ? 'Laat leeg om niet te wijzigen' : ''}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="rounded bg-[#000b2b] px-4 py-2 text-xs font-medium text-white">
            Opslaan
          </button>
        </form>
      ) : null}
    </div>
  );
}
