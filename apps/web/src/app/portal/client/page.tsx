'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CmText } from '@/components/CmText';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';

type BriefRow = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  _count: { responses: number };
};

type BriefDetail = BriefRow & {
  responses: {
    id: string;
    message: string;
    status: string;
    createdAt: string;
    model: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      bio?: string | null;
    };
  }[];
};

export default function ClientPortalPage() {
  const { user, loading, token, refreshMe, can } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
  });
  const [profileMsg, setProfileMsg] = useState('');
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [selected, setSelected] = useState<BriefDetail | null>(null);
  const [form, setForm] = useState({ title: '', body: '' });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/');
    else if (
      !user.roles.includes('client') &&
      !user.permissions?.includes('*') &&
      !user.permissions?.some((x) => x.startsWith('admin.'))
    )
      router.replace('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setProfile({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      companyName: user.companyName ?? '',
    });
  }, [user]);

  const load = useCallback(() => {
    if (!token || !can('portal.client.briefs.read')) return;
    apiFetch<BriefRow[]>('/portal/client/briefs', { token })
      .then(setBriefs)
      .catch(() => setBriefs([]));
  }, [token, can]);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setProfileMsg('');
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify(profile),
      });
      await refreshMe();
      setProfileMsg('Gegevens opgeslagen.');
    } catch {
      setProfileMsg('Opslaan mislukt.');
    }
  };

  const createBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!token || !can('portal.client.briefs.write')) return;
    try {
      await apiFetch('/portal/client/briefs', {
        method: 'POST',
        token,
        body: JSON.stringify({ title: form.title, body: form.body }),
      });
      setForm({ title: '', body: '' });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Aanmaken mislukt');
    }
  };

  const openDetail = async (id: string) => {
    if (!token) return;
    const d = await apiFetch<BriefDetail>(`/portal/client/briefs/${id}`, { token });
    setSelected(d);
  };

  const closeBrief = async (id: string) => {
    if (!token || !confirm('Aanvraag sluiten?')) return;
    await apiFetch(`/portal/client/briefs/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status: 'closed' }),
    });
    setSelected(null);
    load();
  };

  if (loading || !user) return <div className="p-8 text-sm text-muted">Laden…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <section className="rounded-cm border border-burgundy/25 bg-gradient-to-br from-slate-50 to-panel px-5 py-5 shadow-sm">
        <h2 className="font-serif text-xl text-burgundy">Welkom in je klantenportaal</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/90">
          Vanuit dit portaal beheer je casting-aanvragen en je bedrijfsgegevens. Vul je profiel hieronder aan
          waar nodig.
        </p>
      </section>
      <CmText
        contentKey="portal.client.title"
        as="h1"
        className="font-serif text-2xl text-burgundy"
      />
      <CmText
        contentKey="portal.client.intro"
        as="p"
        className="text-sm leading-relaxed text-muted"
      />
      <CmText
        contentKey="portal.client.section2"
        as="p"
        className="text-sm leading-relaxed text-ink/90"
      />
      <p className="text-xs text-muted">Ingelogd als {user.email}.</p>

      <section className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
        <h2 className="font-medium text-ink">Bedrijf & contact</h2>
        <form onSubmit={saveProfile} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className="rounded border border-line px-2 py-1"
            placeholder="Voornaam"
            value={profile.firstName}
            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
          />
          <input
            className="rounded border border-line px-2 py-1"
            placeholder="Achternaam"
            value={profile.lastName}
            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
          />
          <input
            className="rounded border border-line px-2 py-1"
            placeholder="Telefoon"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <input
            className="rounded border border-line px-2 py-1"
            placeholder="Bedrijfsnaam"
            value={profile.companyName}
            onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
          />
          <button
            type="submit"
            className="rounded bg-burgundy px-3 py-1.5 text-white hover:bg-burgundyDeep sm:col-span-2"
          >
            Opslaan
          </button>
        </form>
        {profileMsg ? <p className="mt-2 text-xs text-muted">{profileMsg}</p> : null}
      </section>

      {can('portal.client.briefs.write') ? (
        <section className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
          <h2 className="font-medium text-ink">Nieuwe casting-aanvraag</h2>
          <form onSubmit={createBrief} className="mt-3 space-y-2">
            <input
              className="w-full rounded border border-line px-2 py-1"
              placeholder="Titel"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              minLength={2}
            />
            <textarea
              className="min-h-[120px] w-full rounded border border-line px-2 py-1"
              placeholder="Beschrijf je opdracht, gewenste profielen, data, locatie…"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
              minLength={10}
            />
            {err ? <p className="text-xs text-red-700">{err}</p> : null}
            <button
              type="submit"
              className="rounded bg-burgundy px-3 py-1.5 text-white hover:bg-burgundyDeep"
            >
              Indienen
            </button>
          </form>
        </section>
      ) : null}

      {can('portal.client.briefs.read') ? (
        <section className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
          <h2 className="font-medium text-ink">Mijn aanvragen</h2>
          <ul className="mt-3 divide-y divide-line">
            {briefs.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium text-ink">{b.title}</p>
                  <p className="text-xs text-muted">
                    {b.status} · {b._count.responses} reactie(s)
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-burgundy hover:underline"
                  onClick={() => openDetail(b.id)}
                >
                  Details
                </button>
              </li>
            ))}
          </ul>
          {briefs.length === 0 ? (
            <p className="mt-2 text-xs text-muted">Nog geen aanvragen.</p>
          ) : null}
        </section>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-white p-4 text-sm shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-ink">{selected.title}</h3>
              <button
                type="button"
                className="text-muted hover:text-ink"
                onClick={() => setSelected(null)}
                aria-label="Sluiten"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">Status: {selected.status}</p>
            <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed">{selected.body}</p>
            <p className="mt-4 font-medium text-ink">Reacties van modellen</p>
            <ul className="mt-2 space-y-2">
              {selected.responses.map((r) => (
                <li key={r.id} className="rounded border border-line bg-panel/50 p-2 text-xs">
                  <p className="text-muted">
                    {(r.model.firstName || '') + ' ' + (r.model.lastName || '')} ({r.model.email}) —{' '}
                    {r.status}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{r.message}</p>
                </li>
              ))}
            </ul>
            {selected.status === 'open' && can('portal.client.briefs.write') ? (
              <button
                type="button"
                className="mt-4 text-xs text-burgundy hover:underline"
                onClick={() => closeBrief(selected.id)}
              >
                Aanvraag sluiten
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Link href="/" className="inline-block text-sm text-burgundy hover:underline">
        ← Naar home
      </Link>
    </div>
  );
}
