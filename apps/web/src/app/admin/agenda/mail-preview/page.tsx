'use client';

import { AGENDA_DEFAULT_BOOKING_EMAIL_HTML } from '@cm/shared';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AgendaMailHtmlEditor, AgendaMailTemplatePreview } from '@/components/admin/AgendaMailTemplateEditor';
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
  enrollmentFilter?: string | null;
  sortOrder: number;
};

const ENROLLMENT_FILTER_OPTS = [
  ['all', 'Iedereen (ingeschreven én niet)'],
  ['enrolled', 'Alleen ingeschreven (status Ingeschreven)'],
  ['not_enrolled', 'Alleen niet ingeschreven'],
] as const;

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
  ['office_address', 'Adres kantoor (Provinciebaan 3, Hulshout)'],
  ['distance_label', 'Afstand tot kantoor (bv. ca. 12 km)'],
  ['maps_directions_url', 'Link route Google Maps'],
  ['maps_directions_link_html', 'Klikbare route-link (HTML)'],
  [
    'maps_route_block_html',
    'Kantoor + afstand + kaartafbeelding + Google Maps-link (volledig blok; leeg zonder adres)',
  ],
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

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [templates],
  );

  const moveTemplate = async (id: string, direction: 'up' | 'down') => {
    if (!token) return;
    const idx = sortedTemplates.findIndex((t) => t.id === id);
    const j = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || j < 0 || j >= sortedTemplates.length) return;
    const next = [...sortedTemplates];
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    setErr(null);
    try {
      await adminFetch('/admin/agenda/notification-templates/reorder', token, {
        method: 'POST',
        body: JSON.stringify({ orderedIds: next.map((t) => t.id) }),
      });
      setOk('Volgorde opgeslagen.');
      await loadTemplates();
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Volgorde wijzigen mislukt');
    }
  };

  const toggleTemplateEnabled = async (t: Template) => {
    if (!token) return;
    setErr(null);
    try {
      await adminFetch(`/admin/agenda/notification-templates/${t.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !t.enabled }),
      });
      await loadTemplates();
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Opslaan mislukt');
    }
  };

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

  const openNew = async () => {
    if (!token) return;
    setErr(null);
    try {
      const rows = await adminFetch<{ id: string; slug: string; title: string }[]>('/admin/agenda/calendars', token);
      setCalendars(rows);
      setSlugPick(new Set(rows.map((c) => c.slug)));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Agenda’s laden mislukt');
      setSlugPick(new Set());
    }
    setEditing({
      channel: 'email',
      name: 'Nieuw sjabloon',
      enabled: false,
      trigger: 'booking_created',
      offsetMinutes: 0,
      subject: 'Bevestiging: {{calendar_title}} — Class Models',
      body: AGENDA_DEFAULT_BOOKING_EMAIL_HTML,
      sortOrder: 100,
    });
  };

  const openEdit = (t: Template) => {
    setEditing({ ...t });
    const slugs = Array.isArray(t.calendarSlugs) ? (t.calendarSlugs as string[]) : [];
    setSlugPick(new Set(slugs));
  };

  const saveTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editing?.name || !editing.body) return;
    if (slugPick.size === 0) {
      setErr('Vink minstens één agenda aan (alleen aangevinkte agenda’s krijgen mail of SMS).');
      return;
    }
    setErr(null);
    try {
      const payload = {
        channel: editing.channel ?? 'email',
        name: editing.name,
        enabled: editing.enabled ?? false,
        trigger: editing.trigger ?? 'booking_created',
        offsetMinutes: editing.offsetMinutes ?? 0,
        subject: editing.subject ?? undefined,
        body: editing.body,
        calendarSlugs: [...slugPick],
        enrollmentFilter:
          editing.trigger === 'followup' || editing.trigger === 'reminder'
            ? (editing.enrollmentFilter ?? 'all')
            : undefined,
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
            HTML-voorbeeld van de <strong>standaard</strong> lay-out (zonder databank-sjabloon). Dit wordt{' '}
            <strong>niet automatisch</strong> verstuurd: schakel een <strong>actief</strong> e-mailsjabloon in onder
            &quot;E-mail / SMS sjablonen&quot; en zet SMTP (Admin → E-mail) klaar om echte bevestigingsmails te sturen.
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
            <p className="max-w-3xl text-sm text-muted">
              Alleen <strong>actieve</strong> sjablonen versturen mail of SMS. Mail/SMS gaat <strong>alleen</strong> naar
              de <strong>aangevinkte agenda&apos;s</strong> hieronder (niets aangevinkt = nergens). Zonder passend
              sjabloon (zelfde
              trigger, gekozen agenda, offset 0) gebeurt er <strong>niets automatisch</strong>. BulkSMS alleen bij een
              actief SMS-sjabloon. <strong>Sorteervolgorde</strong>: lager getal = eerder verstuurd bij dezelfde trigger.
            </p>
            <button
              type="button"
              className="rounded bg-[#000b2b] px-3 py-1.5 text-xs font-medium text-white"
              onClick={() => void openNew()}
            >
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
                  <th className="p-2">Sort</th>
                  <th className="p-2">Actief</th>
                  <th className="p-2">Volgorde</th>
                  <th className="p-2">Acties</th>
                </tr>
              </thead>
              <tbody>
                {sortedTemplates.map((t, ti) => (
                  <tr key={t.id} className="border-b border-line/70">
                    <td className="p-2 font-medium text-ink">{t.name}</td>
                    <td className="p-2">{t.channel}</td>
                    <td className="p-2">{t.trigger}</td>
                    <td className="p-2">{offsetMinutesToHoursInput(t.offsetMinutes)}</td>
                    <td className="p-2 tabular-nums text-muted">{t.sortOrder}</td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={t.enabled}
                        onChange={() => void toggleTemplateEnabled(t)}
                        aria-label={`Actief: ${t.name}`}
                        className="h-4 w-4 rounded border-line"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title="Omhoog"
                          disabled={ti === 0}
                          className="rounded border border-line bg-white px-2 py-0.5 text-xs disabled:opacity-35"
                          onClick={() => void moveTemplate(t.id, 'up')}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          title="Omlaag"
                          disabled={ti === sortedTemplates.length - 1}
                          className="rounded border border-line bg-white px-2 py-0.5 text-xs disabled:opacity-35"
                          onClick={() => void moveTemplate(t.id, 'down')}
                        >
                          ↓
                        </button>
                      </div>
                    </td>
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
            {!templates.length ? (
              <p className="p-4 text-xs text-muted">
                Nog geen sjablonen — voeg er een toe en zet <strong>Actief</strong> aan om mail of SMS te versturen.
              </p>
            ) : null}
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
                <label className="flex items-center gap-2 text-xs text-muted sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={!!editing.enabled}
                    onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                  />
                  Actief — dit sjabloon mag e-mail of SMS versturen (uit = nooit automatisch)
                </label>
                <label className="text-xs text-muted">
                  Sorteervolgorde (lager = eerder bij dezelfde trigger)
                  <input
                    type="number"
                    className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                    value={editing.sortOrder ?? 100}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setEditing({ ...editing, sortOrder: Number.isFinite(v) ? v : 100 });
                    }}
                  />
                </label>
                {editing.trigger === 'followup' || editing.trigger === 'reminder' ? (
                  <label className="text-xs text-muted sm:col-span-2">
                    Doelgroep (inschrijving)
                    <select
                      className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                      value={editing.enrollmentFilter ?? 'all'}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          enrollmentFilter: e.target.value as 'all' | 'enrolled' | 'not_enrolled',
                        })
                      }
                    >
                      {ENROLLMENT_FILTER_OPTS.map(([v, lab]) => (
                        <option key={v} value={v}>
                          {lab}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
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
              {editing.channel === 'email' ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted">Hoofdtekst</p>
                  <AgendaMailHtmlEditor
                    value={editing.body ?? ''}
                    onChange={(body) => setEditing({ ...editing, body })}
                  />
                </div>
              ) : (
                <label className="text-xs text-muted">
                  Inhoud (SMS)
                  <textarea
                    className="mt-1 min-h-[220px] w-full rounded border border-line px-2 py-2 font-mono text-xs leading-relaxed"
                    value={editing.body ?? ''}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                    required
                  />
                </label>
              )}
              <AgendaMailTemplatePreview
                channel={editing.channel ?? 'email'}
                body={editing.body ?? ''}
                subject={editing.subject ?? ''}
              />
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
                <p className="text-xs font-medium text-ink">Geldt voor agenda&apos;s</p>
                <p className="mb-2 text-[11px] text-muted">
                  Vink de agenda&apos;s aan waarvoor dit bericht automatisch verstuurd wordt. Bij een{' '}
                  <strong>nieuw</strong> sjabloon staan alle agenda&apos;s standaard aan.
                </p>
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
            Belgische nummers worden automatisch als +32… naar BulkSMS gestuurd. SMS wordt <strong>alleen</strong> verstuurd
            als er een <strong>actief SMS-sjabloon</strong> is (tab &quot;E-mail / SMS sjablonen&quot;). U kunt ook{' '}
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
