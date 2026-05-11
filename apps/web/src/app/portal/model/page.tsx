'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CmText } from '@/components/CmText';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase } from '@/lib/api';
import { ModelPortalShell } from '@/components/model-portal/ModelPortalShell';
import { ModelPortalHomeContent } from '@/components/model-portal/ModelPortalHomeContent';
import { ModelPortalProfile } from '@/components/model-portal/ModelPortalProfile';
import {
  parseModelPortalTab,
  MODEL_PORTAL_TABS,
  type ModelPortalTabId,
} from '@/components/model-portal/model-portal-nav';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';
import { ModelOpleidingTab } from '@/components/model-portal/ModelOpleidingTab';
import { ModelPortfolioTab } from '@/components/model-portal/ModelPortfolioTab';
import { GUEST_CONTACT_INFO } from '@/components/guest-portal/guest-portal-data';

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
  extraInfo?: string | null;
  eventDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  wantedMen?: number | null;
  wantedWomen?: number | null;
  wantedChildren?: number | null;
  ageManFrom?: number | null;
  ageManTo?: number | null;
  ageWomanFrom?: number | null;
  ageWomanTo?: number | null;
  ageChildFrom?: number | null;
  ageChildTo?: number | null;
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

type BriefFilter = 'all' | 'available' | 'subscribed';

function tabLabel(id: ModelPortalTabId): string {
  return MODEL_PORTAL_TABS.find((t) => t.id === id)?.label ?? 'Home';
}

function formatBriefSubtitle(b: OpenBrief): string {
  if (!b.eventDate) return '';
  const d = new Date(b.eventDate);
  const dateStr = new Intl.DateTimeFormat('nl-BE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const st = b.startTime?.trim() || '';
  const en = b.endTime?.trim() || '';
  if (st && en) return `${dateStr} • ${st} - ${en}`;
  if (st) return `${dateStr} • ${st}`;
  return dateStr;
}

function ageSuffix(from?: number | null, to?: number | null): string {
  if (from == null && to == null) return '';
  const a = from ?? '—';
  const b = to ?? '—';
  return ` (${a}–${b} jaar)`;
}

function GezochtLines({ b }: { b: OpenBrief }) {
  const lines: { key: string; text: string }[] = [];
  const wm = b.wantedMen ?? 0;
  const ww = b.wantedWomen ?? 0;
  const wk = b.wantedChildren ?? 0;
  if (wm > 0) lines.push({ key: 'm', text: `Mannen: ${wm}${ageSuffix(b.ageManFrom, b.ageManTo)}` });
  if (ww > 0) lines.push({ key: 'w', text: `Vrouwen: ${ww}${ageSuffix(b.ageWomanFrom, b.ageWomanTo)}` });
  if (wk > 0) lines.push({ key: 'k', text: `Kinderen: ${wk}${ageSuffix(b.ageChildFrom, b.ageChildTo)}` });
  if (!lines.length) {
    return <p className="text-sm text-zinc-600">Zie de omschrijving voor het gevraagde profiel.</p>;
  }
  return (
    <ul className="space-y-1.5 text-sm text-zinc-800">
      {lines.map((l) => (
        <li key={l.key}>{l.text}</li>
      ))}
    </ul>
  );
}

function responseBadge(mine: { status: string } | undefined): { label: string; className: string } {
  if (!mine) return { label: 'Open', className: 'bg-zinc-500' };
  switch (mine.status) {
    case 'declined':
      return { label: 'Niet in aanmerking', className: 'bg-red-600' };
    case 'accepted':
      return { label: 'Geselecteerd', className: 'bg-emerald-600' };
    case 'submitted':
      return { label: 'Ingeschreven', className: 'bg-amber-600' };
    case 'withdrawn':
      return { label: 'Teruggetrokken', className: 'bg-zinc-500' };
    default:
      return { label: mine.status, className: 'bg-zinc-600' };
  }
}

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseModelPortalTab(searchParams.get('tab'));

  const setTab = useCallback(
    (id: ModelPortalTabId) => {
      const q = new URLSearchParams(searchParams.toString());
      if (id === 'home') q.delete('tab');
      else q.set('tab', id);
      const s = q.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [premiumInfo, setPremiumInfo] = useState<PremiumInfo | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  const [profileEditing, setProfileEditing] = useState(false);
  const [showNewModelProfielHint, setShowNewModelProfielHint] = useState(false);

  const [briefs, setBriefs] = useState<OpenBrief[]>([]);
  const [briefNote, setBriefNote] = useState<Record<string, string>>({});
  const [briefErr, setBriefErr] = useState<string | null>(null);
  const [briefFilter, setBriefFilter] = useState<BriefFilter>('all');

  const [media, setMedia] = useState<MediaRow[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);

  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [opleidingHeaderRight, setOpleidingHeaderRight] = useState<ReactNode | null>(null);
  const [portfolioHeaderRight, setPortfolioHeaderRight] = useState<ReactNode | null>(null);

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
    if (tab !== 'profiel') setProfileEditing(false);
  }, [tab]);

  useEffect(() => {
    if (searchParams.get('welcome') !== '1') return;
    setShowNewModelProfielHint(true);
    if (tab === 'profiel') setProfileEditing(true);
    const q = new URLSearchParams(searchParams.toString());
    q.delete('welcome');
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, tab]);

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

  const myId = user?.id ?? '';

  const briefCounts = useMemo(() => {
    const available = briefs.filter((b) => !b.responses.some((r) => r.modelUserId === myId));
    const subscribed = briefs.filter((b) => b.responses.some((r) => r.modelUserId === myId));
    return { all: briefs.length, available: available.length, subscribed: subscribed.length };
  }, [briefs, myId]);

  const filteredBriefs = useMemo(() => {
    if (briefFilter === 'all') return briefs;
    if (briefFilter === 'available')
      return briefs.filter((b) => !b.responses.some((r) => r.modelUserId === myId));
    return briefs.filter((b) => b.responses.some((r) => r.modelUserId === myId));
  }, [briefs, briefFilter, myId]);

  const sendMessageMailto = () => {
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Model';
    const footer = `\n\n---\nNaam: ${name}\nE-mail: ${user?.email ?? ''}\nGSM: ${user?.phone ?? '—'}\nProfiel: ${typeof window !== 'undefined' ? window.location.origin : ''}/portal/model?tab=profiel`;
    const subj = messageSubject.trim() || 'Bericht via modellenportaal';
    const body = (messageBody.trim() || '') + footer;
    window.location.href = `mailto:${GUEST_CONTACT_INFO.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  };

  if (loading || !user) return <div className="p-8 text-sm text-muted">Laden…</div>;

  const premiumReturn = searchParams.get('premium') === 'return';
  const firstName = user.firstName?.trim() || '';

  const premiumButton =
    can('payments.checkout') && !user.isPremium ? (
      <button
        type="button"
        disabled={checkoutBusy}
        onClick={() => startPremium()}
        className="rounded-lg bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 px-5 py-2.5 text-sm font-bold tracking-wide text-zinc-900 shadow-md hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {checkoutBusy ? 'Bezig…' : 'WORD PREMIUM'}
      </button>
    ) : null;

  let sectionTitle = tabLabel(tab);
  let sectionHeaderRight: ReactNode = undefined;
  let main: ReactNode = null;

  if (tab === 'home') {
    main = <ModelPortalHomeContent userEmail={user.email} premiumReturn={premiumReturn} />;
  } else if (tab === 'opdrachten' && can('portal.model.briefs.read')) {
    sectionHeaderRight = (
      <div className="flex flex-wrap justify-end gap-1.5">
        {(
          [
            ['all', `Alle opdrachten (${briefCounts.all})`],
            ['available', `Voor mij (${briefCounts.available})`],
            ['subscribed', `Ingeschreven voor (${briefCounts.subscribed})`],
          ] as const
        ).map(([id, label]) => {
          const active = briefFilter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setBriefFilter(id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                active
                  ? 'border-white bg-white text-zinc-900 shadow-sm'
                  : 'border-white/40 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
    main = (
      <div className="space-y-4">
        <p className="text-xs text-muted">
          Reageer met een korte motivatie; de klant ziet je profielgegevens bij je reactie.
        </p>
        {briefErr ? <p className="text-xs text-red-700">{briefErr}</p> : null}
        <ul className="space-y-4">
          {filteredBriefs.map((b) => {
            const mine = b.responses.find((r) => r.modelUserId === myId);
            const badge = responseBadge(mine);
            const clientLabel =
              b.client.companyName ||
              [b.client.firstName, b.client.lastName].filter(Boolean).join(' ') ||
              b.client.email;
            const sub = formatBriefSubtitle(b);
            const canRespond = can('portal.model.briefs.respond') && b.status === 'open' && !mine;
            const blocked = mine?.status === 'declined';

            return (
              <li key={b.id} className="overflow-hidden rounded-cm border border-line bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2 bg-slate-700 px-4 py-3 text-white">
                  <div>
                    <p className="font-serif text-base font-semibold">{b.title}</p>
                    <p className="mt-0.5 text-xs text-white/85">{sub || '—'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="grid gap-4 p-4 md:grid-cols-2">
                  <div className="rounded-cm border border-zinc-200 bg-zinc-50/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">Omschrijving</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{b.body}</p>
                    {b.extraInfo ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{b.extraInfo}</p>
                    ) : null}
                    <p className="mt-3 text-xs text-muted">Klant: {clientLabel}</p>
                  </div>
                  <div className="rounded-cm border border-zinc-200 bg-zinc-50/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">Gezocht</p>
                    <div className="mt-2">
                      <GezochtLines b={b} />
                    </div>
                  </div>
                </div>
                <div className="border-t border-zinc-100 bg-zinc-50/80 px-4 py-3">
                  {blocked ? (
                    <span className="inline-block rounded-full bg-zinc-400 px-4 py-2 text-xs font-medium text-white">
                      Niet beschikbaar voor uw profiel
                    </span>
                  ) : canRespond ? (
                    <div className="flex flex-col gap-2 sm:mx-auto sm:max-w-lg sm:flex-row sm:items-end">
                      <textarea
                        className="min-h-[72px] flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs"
                        placeholder="Waarom ben je geschikt?"
                        value={briefNote[b.id] ?? ''}
                        onChange={(e) => setBriefNote((n) => ({ ...n, [b.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => submitInterest(b.id)}
                        className="rounded-full bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-900"
                      >
                        Interesse melden
                      </button>
                    </div>
                  ) : mine ? (
                    <p className="text-xs text-muted">
                      Jouw status: <strong className="text-ink">{mine.status}</strong>
                    </p>
                  ) : (
                    <span className="text-xs text-muted">Deze opdracht is niet meer open voor reacties.</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {filteredBriefs.length === 0 ? (
          <p className="text-sm text-muted">Geen opdrachten in deze weergave.</p>
        ) : null}
      </div>
    );
  } else if (tab === 'opdrachten') {
    main = <p className="text-sm text-muted">Je hebt geen toegang tot opdrachten.</p>;
  } else if (tab === 'profiel') {
    if (!token) {
      main = <p className="text-sm text-muted">Laden…</p>;
    } else {
      sectionHeaderRight = (
        <button
          type="button"
          onClick={() => setProfileEditing((v) => !v)}
          className={
            profileEditing
              ? 'border border-white/40 bg-white/15 px-2 py-1 text-[10px] font-bold uppercase text-white hover:bg-white/25'
              : 'border-2 border-white bg-burgundy px-2 py-1 text-[10px] font-bold uppercase text-white hover:bg-burgundyDeep'
          }
        >
          {profileEditing ? 'Terug naar overzicht' : 'Profiel bewerken'}
        </button>
      );
      main = (
        <>
          {showNewModelProfielHint ? (
            <p className="mb-2 border-l-4 border-burgundy bg-burgundy/10 px-2 py-1.5 text-[11px] leading-snug text-ink">
              <strong>Welkom.</strong> U heeft zich geregistreerd met uw basisgegevens op de beginpagina. Vul hier uw
              modellenfiche verder aan en upload foto&apos;s; het bureau gebruikt dit bij opdrachten.
            </p>
          ) : null}
          <ModelPortalProfile
          user={user}
          token={token}
          refreshMe={refreshMe}
          editing={profileEditing}
          canReadMedia={can('portal.model.media.read')}
          canUploadMedia={can('portal.model.media.upload')}
          media={media}
          mediaBusy={mediaBusy}
          uploadMedia={uploadMedia}
          premiumSection={
            can('payments.checkout') ? (
              <div className="rounded-cm border border-line bg-zinc-50/80 p-4">
                <CmText contentKey="portal.model.premium.title" as="h3" className="text-sm font-semibold text-ink" />
                <CmText contentKey="portal.model.premium.intro" as="p" className="mt-2 text-xs leading-relaxed text-muted" />
                <p className="mt-2 text-xs text-muted">
                  Status:{' '}
                  <strong className="text-ink">{user.isPremium ? 'Premium actief' : 'Geen premium'}</strong>
                  {premiumInfo ? (
                    <>
                      {' '}
                      — eenmalig €{premiumInfo.amount} ({premiumInfo.premiumDurationDays} dagen).
                    </>
                  ) : null}
                </p>
                {checkoutErr ? <p className="mt-2 text-xs text-red-700">{checkoutErr}</p> : null}
                <button
                  type="button"
                  disabled={checkoutBusy || user.isPremium}
                  onClick={() => startPremium()}
                  className="mt-3 rounded-cm bg-burgundy px-3 py-2 text-xs font-medium text-white hover:bg-burgundyDeep disabled:opacity-50"
                >
                  {checkoutBusy ? 'Bezig…' : user.isPremium ? 'Premium actief' : 'Premium afrekenen (Mollie)'}
                </button>
              </div>
            ) : null
          }
        />
        </>
      );
    }
  } else if (tab === 'portfolio') {
    sectionHeaderRight = portfolioHeaderRight ?? undefined;
    main = <ModelPortfolioTab onHeaderRightChange={setPortfolioHeaderRight} />;
  } else if (tab === 'opleiding') {
    sectionHeaderRight = opleidingHeaderRight ?? undefined;
    main = <ModelOpleidingTab onHeaderRightChange={setOpleidingHeaderRight} />;
  } else if (tab === 'historiek') {
    main = (
      <div className="space-y-2 text-sm text-muted">
        <p>
          Hier verschijnt binnenkort je historiek: opdrachten, inschrijvingen en afspraken. De gegevens worden
          gekoppeld aan je account zodra deze module in het beheer beschikbaar is.
        </p>
      </div>
    );
  } else if (tab === 'push') {
    main = (
      <p className="text-sm text-muted">
        Er zijn nog geen pushberichten voor jouw account. Deze functie wordt verder uitgewerkt.
      </p>
    );
  } else if (tab === 'bericht') {
    main = (
      <div className="space-y-4 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="w-28 shrink-0 text-xs font-semibold text-zinc-700">Betreft</label>
          <input
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Titel / onderwerp"
            value={messageSubject}
            onChange={(e) => setMessageSubject(e.target.value)}
          />
        </div>
        <textarea
          className="min-h-[160px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          placeholder="Schrijf hier uw bericht aan Class-Models…"
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
        />
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold text-zinc-800">Uw gegevens worden mee verstuurd</p>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted">Naam</dt>
              <dd className="font-medium text-ink">
                {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">E-mail</dt>
              <dd className="font-medium text-ink">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted">GSM</dt>
              <dd className="font-medium text-ink">{user.phone || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Profiel model</dt>
              <dd className="text-ink">Wordt als link opgenomen in het bericht.</dd>
            </div>
          </dl>
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={sendMessageMailto}
            className="rounded-full bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-900"
          >
            Bericht versturen
          </button>
        </div>
      </div>
    );
  }

  return (
    <ModelPortalShell
      activeTab={tab}
      onTabChange={setTab}
      sectionTitle={sectionTitle}
      sectionHeaderRight={sectionHeaderRight}
      userFirstName={firstName}
      premiumButton={premiumButton}
    >
      {main}
      <div className="mt-8 border-t border-zinc-100 pt-4">
        <Link href="/" className="text-sm text-burgundy hover:underline">
          ← Naar home
        </Link>
      </div>
    </ModelPortalShell>
  );
}
