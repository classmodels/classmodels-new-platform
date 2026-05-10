'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CmText } from '@/components/CmText';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase } from '@/lib/api';

type PremiumInfo = { currency: string; amount: string; premiumDurationDays: number };

type CheckoutOk = { checkoutUrl: string; paymentId: string; subscriptionId: string };

type CheckoutSkip = {
  skipCheckout: true;
  reason: string;
  isPremium?: boolean;
  premiumUntil?: string;
};

type OpenBrief = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  client: {
    id: string;
    email: string;
    companyName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  responses: { modelUserId: string; status: string }[];
};

type MediaRow = {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  thumbKey?: string | null;
  webpKey?: string | null;
  createdAt: string;
};

export default function ModelPortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Laden…</div>}>
      <ModelPortalPageInner />
    </Suspense>
  );
}

function ModelPortalPageInner() {
  const { user, loading, token, refreshMe, can } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [premiumInfo, setPremiumInfo] = useState<PremiumInfo | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
  });
  const [profileMsg, setProfileMsg] = useState('');

  const [briefs, setBriefs] = useState<OpenBrief[]>([]);
  const [briefNote, setBriefNote] = useState<Record<string, string>>({});
  const [briefErr, setBriefErr] = useState<string | null>(null);

  const [media, setMedia] = useState<MediaRow[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/');
    else if (
      !user.roles.includes('model') &&
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
      bio: user.bio ?? '',
    });
  }, [user]);

  useEffect(() => {
    apiFetch<PremiumInfo>('/payments/premium/info')
      .then(setPremiumInfo)
      .catch(() => setPremiumInfo(null));
  }, []);

  useEffect(() => {
    if (searchParams.get('premium') === 'return') {
      refreshMe().catch(() => undefined);
    }
  }, [searchParams, refreshMe]);

  const loadBriefs = useCallback(() => {
    if (!token || !can('portal.model.briefs.read')) return;
    apiFetch<OpenBrief[]>('/portal/model/briefs', { token })
      .then(setBriefs)
      .catch(() => setBriefs([]));
  }, [token, can]);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  const loadMedia = useCallback(() => {
    if (!token || !can('portal.model.media.read')) return;
    apiFetch<MediaRow[]>('/portal/model/media', { token })
      .then(setMedia)
      .catch(() => setMedia([]));
  }, [token, can]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const startPremium = useCallback(async () => {
    if (!token) return;
    setCheckoutErr(null);
    setCheckoutBusy(true);
    try {
      const res = await apiFetch<CheckoutOk | CheckoutSkip>('/payments/premium/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      });
      if ('skipCheckout' in res && res.skipCheckout) {
        setCheckoutErr(res.reason);
        return;
      }
      if ('checkoutUrl' in res && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setCheckoutErr('Onverwacht antwoord van de server.');
    } catch (e) {
      setCheckoutErr(e instanceof Error ? e.message : 'Betaling starten mislukt.');
    } finally {
      setCheckoutBusy(false);
    }
  }, [token]);

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
      setProfileMsg('Profiel opgeslagen.');
    } catch {
      setProfileMsg('Opslaan mislukt.');
    }
  };

  const submitInterest = async (briefId: string) => {
    if (!token) return;
    setBriefErr(null);
    const message = briefNote[briefId]?.trim() || '';
    if (message.length < 5) {
      setBriefErr('Motivatie minimaal 5 tekens.');
      return;
    }
    try {
      await apiFetch(`/portal/model/briefs/${briefId}/responses`, {
        method: 'POST',
        token,
        body: JSON.stringify({ message }),
      });
      setBriefNote((n) => ({ ...n, [briefId]: '' }));
      loadBriefs();
    } catch (e) {
      setBriefErr(e instanceof Error ? e.message : 'Versturen mislukt');
    }
  };

  const uploadMedia = async (file: File | null) => {
    if (!file || !token || !can('portal.model.media.upload')) return;
    setMediaBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${getApiBase()}/portal/model/media/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      await loadMedia();
    } finally {
      setMediaBusy(false);
    }
  };

  if (loading || !user) return <div className="p-8 text-sm text-muted">Laden…</div>;

  const premiumReturn = searchParams.get('premium') === 'return';
  const myId = user.id;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <section className="rounded-cm border border-burgundy/25 bg-gradient-to-br from-burgundy/10 to-panel px-5 py-5 shadow-sm">
        <h2 className="font-serif text-xl text-burgundy">Welkom in je modellenportaal</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/90">
          Dit is jouw thuisbasis op het platform: profiel, portfolio en opdrachten. Ontbrekende gegevens vul je
          gericht aan in het profielblok hieronder.
        </p>
      </section>
      <CmText
        contentKey="portal.model.title"
        as="h1"
        className="font-serif text-2xl text-burgundy"
      />
      <CmText
        contentKey="portal.model.intro"
        as="p"
        className="text-sm leading-relaxed text-muted"
      />
      <CmText
        contentKey="portal.model.section2"
        as="p"
        className="text-sm leading-relaxed text-ink/90"
      />
      <p className="text-xs text-muted">Ingelogd als {user.email}.</p>

      <section className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
        <h2 className="font-medium text-ink">Profiel</h2>
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
            className="rounded border border-line px-2 py-1 sm:col-span-2"
            placeholder="Telefoon"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <textarea
            className="min-h-[88px] rounded border border-line px-2 py-1 sm:col-span-2"
            placeholder="Korte bio / ervaring"
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
          <button
            type="submit"
            className="rounded bg-burgundy px-3 py-1.5 text-white hover:bg-burgundyDeep sm:col-span-2"
          >
            Profiel opslaan
          </button>
        </form>
        {profileMsg ? <p className="mt-2 text-xs text-muted">{profileMsg}</p> : null}
      </section>

      {can('portal.model.briefs.read') ? (
        <section className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
          <h2 className="font-medium text-ink">Open casting-aanvragen</h2>
          <p className="mt-1 text-xs text-muted">
            Reageer met een korte motivatie; de klant ziet je profielgegevens bij je reactie.
          </p>
          {briefErr ? <p className="mt-2 text-xs text-red-700">{briefErr}</p> : null}
          <ul className="mt-3 space-y-4">
            {briefs.map((b) => {
              const mine = b.responses.find((r) => r.modelUserId === myId);
              const clientLabel =
                b.client.companyName ||
                [b.client.firstName, b.client.lastName].filter(Boolean).join(' ') ||
                b.client.email;
              return (
                <li key={b.id} className="rounded border border-line bg-panel/40 p-3">
                  <p className="font-medium text-ink">{b.title}</p>
                  <p className="text-xs text-muted">Klant: {clientLabel}</p>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink/90">{b.body}</p>
                  {mine ? (
                    <p className="mt-2 text-xs text-muted">
                      Jouw status: <strong className="text-ink">{mine.status}</strong>
                    </p>
                  ) : null}
                  {can('portal.model.briefs.respond') && b.status === 'open' ? (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <textarea
                        className="min-h-[64px] flex-1 rounded border border-line px-2 py-1 text-xs"
                        placeholder="Waarom ben je geschikt?"
                        value={briefNote[b.id] ?? ''}
                        onChange={(e) =>
                          setBriefNote((n) => ({ ...n, [b.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => submitInterest(b.id)}
                        className="rounded bg-burgundy px-3 py-1.5 text-xs text-white hover:bg-burgundyDeep"
                      >
                        Interesse melden
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {briefs.length === 0 ? (
            <p className="mt-3 text-xs text-muted">Geen open aanvragen.</p>
          ) : null}
        </section>
      ) : null}

      {can('portal.model.media.read') ? (
        <section className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
          <h2 className="font-medium text-ink">Mijn media</h2>
          {can('portal.model.media.upload') ? (
            <label className="mt-2 inline-block cursor-pointer rounded border border-line bg-panel px-3 py-1.5 text-xs hover:bg-panel/80">
              {mediaBusy ? 'Uploaden…' : 'Bestand uploaden'}
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => uploadMedia(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : null}
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {media.map((a) => (
              <li key={a.id} className="overflow-hidden rounded border border-line text-xs">
                {a.mimeType.startsWith('image/') ? (
                  <img
                    src={`${getApiBase()}/media/public/${a.thumbKey || a.webpKey || a.storageKey}`}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-panel p-2 text-center">
                    {a.originalName}
                  </div>
                )}
                <p className="truncate p-1 text-[10px] text-muted">{a.originalName}</p>
              </li>
            ))}
          </ul>
          {media.length === 0 ? (
            <p className="mt-2 text-xs text-muted">Nog geen uploads.</p>
          ) : null}
        </section>
      ) : null}

      {premiumReturn ? (
        <p className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm">
          Je bent terug van Mollie. Premium wordt geactiveerd zodra de betaling is bevestigd; status hieronder
          wordt ververst.
        </p>
      ) : null}

      {can('payments.checkout') ? (
        <section className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
          <CmText
            contentKey="portal.model.premium.title"
            as="h2"
            className="font-medium text-ink"
          />
          <CmText
            contentKey="portal.model.premium.intro"
            as="p"
            className="mt-2 text-muted leading-relaxed"
          />
          <p className="mt-2 text-xs text-muted">
            Status:{' '}
            <strong className="text-ink">{user.isPremium ? 'Premium actief' : 'Geen premium'}</strong>
            {premiumInfo ? (
              <>
                {' '}
                — eenmalig €{premiumInfo.amount} ({premiumInfo.premiumDurationDays} dagen toegang na betaling).
              </>
            ) : null}
          </p>
          {checkoutErr ? <p className="mt-2 text-xs text-red-700">{checkoutErr}</p> : null}
          <button
            type="button"
            disabled={checkoutBusy || user.isPremium}
            onClick={() => startPremium()}
            className="mt-3 rounded bg-burgundy px-3 py-1.5 text-white hover:bg-burgundyDeep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkoutBusy ? 'Bezig…' : user.isPremium ? 'Premium actief' : 'Premium afrekenen (Mollie)'}
          </button>
        </section>
      ) : null}

      <Link href="/" className="inline-block text-sm text-burgundy hover:underline">
        ← Naar home
      </Link>
    </div>
  );
}
