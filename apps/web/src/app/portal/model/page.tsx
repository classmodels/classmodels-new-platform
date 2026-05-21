'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GUEST_MODEL_PORTAL_PREVIEW_USER,
  isGuestModelPortalPreviewEnabled,
} from '@/lib/guest-model-portal-preview';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CmText } from '@/components/CmText';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase } from '@/lib/api';
import { ModelPortalShell } from '@/components/model-portal/ModelPortalShell';
import { ModelPortalHomeContent } from '@/components/model-portal/ModelPortalHomeContent';
import { ModelPortalProfile, type ProfileMediaRow } from '@/components/model-portal/ModelPortalProfile';
import {
  parseModelPortalTab,
  MODEL_PORTAL_TABS,
  type ModelPortalTabId,
} from '@/components/model-portal/model-portal-nav';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';
import { ModelOpleidingTab } from '@/components/model-portal/ModelOpleidingTab';
import { ModelPortfolioTab } from '@/components/model-portal/ModelPortfolioTab';
import { ModelPortalHistoriekTab } from '@/components/model-portal/ModelPortalHistoriekTab';
import { ModelPortalPushTab } from '@/components/model-portal/ModelPortalPushTab';
import { ModelPremiumTab } from '@/components/model-portal/ModelPremiumTab';
import { ModelTryoutModeshowTab } from '@/components/model-portal/ModelTryoutModeshowTab';
import { ModelModeshowDownloadsTab } from '@/components/model-portal/ModelModeshowDownloadsTab';
import { ModelSetCardTab } from '@/components/model-portal/ModelSetCardTab';
import { MODEL_BTN_GOLD } from '@/components/model-portal/model-portal-buttons';
import { GUEST_CONTACT_INFO } from '@/components/guest-portal/guest-portal-data';
import { ModelsCatalogGrid } from '@/components/models-catalog/ModelsCatalogGrid';
import { portalTitlebarPillClass } from '@/components/model-portal/portal-titlebar-pill';
import { useModelPortalTabLabels } from '@/i18n/portal-labels';
import { PremiumUpsellBanner, PremiumUpsellPanel } from '@/components/model-portal/PremiumUpsellBanner';
import { ModelPortalReviewTab } from '@/components/model-portal/ModelPortalReviewTab';

type PremiumInfo = {
  currency: string;
  amount: string;
  premiumDurationDays: number;
  promoActive?: boolean;
  promoEndsAt?: string;
  promoPrice?: string;
  yearlyPrice?: string;
  billingLabel?: string;
};

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
  wantedTeenagers?: number | null;
  ageManFrom?: number | null;
  ageManTo?: number | null;
  ageWomanFrom?: number | null;
  ageWomanTo?: number | null;
  ageChildFrom?: number | null;
  ageChildTo?: number | null;
  ageTeenFrom?: number | null;
  ageTeenTo?: number | null;
  details?: Record<string, unknown> | null;
  portalDisplay?: { hideGezochtCriteria?: boolean };
  status: string;
  createdAt: string;
  eligibility?: { eligible: boolean; reason: string };
  client: {
    id: string;
    email: string;
    companyName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  responses: { modelUserId: string; status: string }[];
};

type BriefFilter = 'all' | 'eligible' | 'available' | 'subscribed';

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
  if (b.portalDisplay?.hideGezochtCriteria) {
    return (
      <p className="text-sm text-zinc-600">
        De criteria voor deze opdracht worden door het bureau niet publiek getoond. Zie de omschrijving of neem contact
        met Class-Models.
      </p>
    );
  }
  const lines: { key: string; text: string }[] = [];
  const wm = b.wantedMen ?? 0;
  const ww = b.wantedWomen ?? 0;
  const wk = b.wantedChildren ?? 0;
  const wt = b.wantedTeenagers ?? 0;
  if (wm > 0) lines.push({ key: 'm', text: `Mannen: ${wm}${ageSuffix(b.ageManFrom, b.ageManTo)}` });
  if (ww > 0) lines.push({ key: 'w', text: `Vrouwen: ${ww}${ageSuffix(b.ageWomanFrom, b.ageWomanTo)}` });
  if (wk > 0) lines.push({ key: 'k', text: `Kinderen: ${wk}${ageSuffix(b.ageChildFrom, b.ageChildTo)}` });
  if (wt > 0) lines.push({ key: 't', text: `Tieners: ${wt}${ageSuffix(b.ageTeenFrom, b.ageTeenTo)}` });
  if (!lines.length) {
    return <p className="text-sm text-zinc-600">Geen specifieke profielen ingesteld — iedereen komt in aanmerking.</p>;
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
  const guestPreview = isGuestModelPortalPreviewEnabled();
  const portalUser = useMemo(() => {
    if (user) return user;
    if (guestPreview && !loading) return GUEST_MODEL_PORTAL_PREVIEW_USER;
    return null;
  }, [user, guestPreview, loading]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseModelPortalTab(searchParams.get('tab'));
  const allPortalTabs = useModelPortalTabLabels();

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

  const [media, setMedia] = useState<ProfileMediaRow[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);

  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [opleidingHeaderRight, setOpleidingHeaderRight] = useState<ReactNode | null>(null);
  const [portfolioHeaderRight, setPortfolioHeaderRight] = useState<ReactNode | null>(null);
  const [modellenTitlebar, setModellenTitlebar] = useState<ReactNode | null>(null);
  const [historiekHeaderSlot, setHistoriekHeaderSlot] = useState<ReactNode | null>(null);
  const [pushTitleSlot, setPushTitleSlot] = useState<ReactNode | null>(null);
  const [tryoutHeaderRight, setTryoutHeaderRight] = useState<ReactNode | null>(null);

  const setModellenTitlebarSlot = useCallback((node: ReactNode | null) => {
    setModellenTitlebar(node);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (!guestPreview) router.replace('/');
      return;
    }
    if (
      !user.roles.includes('model') &&
      !user.permissions?.includes('*') &&
      !user.permissions?.some((x) => x.startsWith('admin.'))
    )
      router.replace('/');
  }, [user, loading, router, guestPreview]);

  useEffect(() => {
    if (tab !== 'profiel') setProfileEditing(false);
  }, [tab]);

  useEffect(() => {
    if (tab !== 'modellen') setModellenTitlebar(null);
  }, [tab]);

  useEffect(() => {
    if (tab !== 'historiek') setHistoriekHeaderSlot(null);
  }, [tab]);

  useEffect(() => {
    if (tab !== 'push') setPushTitleSlot(null);
  }, [tab]);

  useEffect(() => {
    if (tab !== 'tryout-modeshow') setTryoutHeaderRight(null);
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
  }, [tab]);

  useEffect(() => {
    if (searchParams.get('premium') === 'return') {
      router.replace('/portal/model/betaling/bedankt?soort=premium');
      return;
    }
    if (searchParams.get('tryout') === 'return') {
      router.replace('/portal/model/betaling/bedankt?soort=tryout');
      return;
    }
    if (searchParams.get('setkaart') === 'return') {
      router.replace('/portal/model/betaling/bedankt?soort=setkaart');
    }
  }, [searchParams, router]);

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
    apiFetch<ProfileMediaRow[]>('/portal/model/media', { token })
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

  const withdrawInterest = async (briefId: string) => {
    if (!token) return;
    setBriefErr(null);
    try {
      await apiFetch(`/portal/model/briefs/${briefId}/responses/withdraw`, {
        method: 'POST',
        token,
      });
      loadBriefs();
    } catch (e) {
      setBriefErr(e instanceof Error ? e.message : 'Uitschrijven mislukt');
    }
  };

  const uploadMedia = async (
    file: File | null,
    opts?: { setAsProfilePhoto?: boolean; folderSlug?: 'models' | 'tijdelijke-uploads' | 'setkaarten' },
  ): Promise<{ id: string } | null> => {
    if (!file || !token || !can('portal.model.media.upload')) return null;
    setMediaBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const folderSlug = opts?.setAsProfilePhoto ? 'models' : (opts?.folderSlug ?? 'models');
      const res = await fetch(`${getApiBase()}/portal/model/media/upload?folderSlug=${encodeURIComponent(folderSlug)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const row = (await res.json()) as { id?: string; error?: string };
      if (row?.error) throw new Error(row.error);
      await loadMedia();
      if (opts?.setAsProfilePhoto && row?.id) {
        await apiFetch('/users/me', {
          method: 'PATCH',
          token,
          body: JSON.stringify({ profilePhotoAssetId: row.id }),
        });
        await refreshMe();
      }
      return row?.id ? { id: row.id } : null;
    } finally {
      setMediaBusy(false);
    }
  };

  const setProfilePhotoFromAsset = async (assetId: string) => {
    if (!token) return;
    setMediaBusy(true);
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ profilePhotoAssetId: assetId }),
      });
      await refreshMe();
    } finally {
      setMediaBusy(false);
    }
  };

  const myId = user?.id ?? '';

  const briefCounts = useMemo(() => {
    const eligible = briefs.filter((b) => b.eligibility?.eligible);
    const available = briefs.filter((b) => !b.responses.some((r) => r.modelUserId === myId));
    const subscribed = briefs.filter((b) => b.responses.some((r) => r.modelUserId === myId));
    return {
      all: briefs.length,
      eligible: eligible.length,
      available: available.length,
      subscribed: subscribed.length,
    };
  }, [briefs, myId]);

  const filteredBriefs = useMemo(() => {
    if (briefFilter === 'all') return briefs;
    if (briefFilter === 'eligible') return briefs.filter((b) => b.eligibility?.eligible);
    if (briefFilter === 'available')
      return briefs.filter((b) => !b.responses.some((r) => r.modelUserId === myId));
    return briefs.filter((b) => b.responses.some((r) => r.modelUserId === myId));
  }, [briefs, briefFilter, myId]);

  const isPremium = portalUser?.isPremium ?? false;
  const menuTabs = allPortalTabs;

  const sendMessageMailto = async () => {
    const name = [portalUser?.firstName, portalUser?.lastName].filter(Boolean).join(' ') || 'Model';
    const footer = `\n\n---\nNaam: ${name}\nE-mail: ${portalUser?.email ?? ''}\nGSM: ${portalUser?.phone ?? '—'}\nProfiel: ${typeof window !== 'undefined' ? window.location.origin : ''}/portal/model?tab=profiel`;
    const subj = messageSubject.trim() || 'Bericht Class-Models (model)';
    const body = (messageBody.trim() || '') + footer;
    if (token) {
      try {
        await apiFetch('/portal/model/history/message-intent', {
          method: 'POST',
          token,
          body: JSON.stringify({
            subject: subj,
            bodyChars: body.length,
          }),
        });
      } catch {
        /* toch mailto */
      }
    }
    window.location.href = `mailto:${GUEST_CONTACT_INFO.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  };

  if (loading || !portalUser) return <div className="p-8 text-sm text-muted">Laden…</div>;

  const premiumReturn = searchParams.get('premium') === 'return';
  const firstName = portalUser.firstName?.trim() || '';

  const premiumButton =
    can('payments.checkout') && !portalUser.isPremium ? (
      <Link href="/portal/model?tab=premium" className={MODEL_BTN_GOLD}>
        Premium worden
      </Link>
    ) : null;

  let sectionTitle = tabLabel(tab);
  let sectionHeaderRight: ReactNode = undefined;
  let main: ReactNode = null;

  if (tab === 'home') {
    main = <ModelPortalHomeContent userEmail={portalUser.email} premiumReturn={premiumReturn} />;
  } else if (tab === 'premium') {
    main = (
      <ModelPremiumTab
        user={portalUser}
        premiumInfo={premiumInfo}
        checkoutBusy={checkoutBusy}
        checkoutErr={checkoutErr}
        premiumReturn={premiumReturn}
        canCheckout={can('payments.checkout')}
        onStartCheckout={() => void startPremium()}
      />
    );
  } else if (tab === 'opdrachten' && can('portal.model.briefs.read')) {
    sectionHeaderRight = (
      <div className="flex flex-wrap justify-end gap-1.5">
        {(
          [
            ['all', `Alle (${briefCounts.all})`],
            ['eligible', `In aanmerking (${briefCounts.eligible})`],
            ['available', `Nog niet ingeschreven (${briefCounts.available})`],
            ['subscribed', `Mijn inschrijvingen (${briefCounts.subscribed})`],
          ] as const
        ).map(([id, label]) => {
          const active = briefFilter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setBriefFilter(id)}
              className={portalTitlebarPillClass(active)}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
    main = (
      <div className="space-y-4">
        {!isPremium ? (
          <PremiumUpsellBanner>
            Met premium krijg je <strong>pushmeldingen</strong> zodra er een opdracht binnenkomt die bij jouw profiel past
            (leeftijd, geslacht, …), plus historiek, berichten sturen en alle portaalmodules — zo mis je geen kans.
          </PremiumUpsellBanner>
        ) : null}
        <p className="text-xs text-muted">
          Opdrachten staan op datum gesorteerd (eerstvolgende bovenaan). Vul je modellenfiche aan (geboortedatum als
          JJJJ-MM-DD, geslacht) voor een correcte &quot;in aanmerking&quot;-match.
        </p>
        {briefErr ? <p className="text-xs text-red-700">{briefErr}</p> : null}
        <ul className="space-y-5">
          {filteredBriefs.map((b) => {
            const mine = b.responses.find((r) => r.modelUserId === myId);
            const badge = responseBadge(mine);
            const clientLabel =
              b.client.companyName ||
              [b.client.firstName, b.client.lastName].filter(Boolean).join(' ') ||
              b.client.email ||
              'Class-Models';
            const sub = formatBriefSubtitle(b);
            const elig = b.eligibility;
            const inAanmerking = elig?.eligible === true;
            const canRespond =
              can('portal.model.briefs.respond') && b.status === 'open' && !mine && inAanmerking;
            const blocked = mine?.status === 'declined';
            const det =
              b.details && typeof b.details === 'object' && !Array.isArray(b.details)
                ? (b.details as Record<string, unknown>)
                : {};
            const mainA =
              det.mainAddress && typeof det.mainAddress === 'object' && !Array.isArray(det.mainAddress)
                ? (det.mainAddress as Record<string, string>)
                : {};
            const onA =
              det.onLocationAddress &&
              typeof det.onLocationAddress === 'object' &&
              !Array.isArray(det.onLocationAddress)
                ? (det.onLocationAddress as Record<string, string>)
                : {};
            const fmtAddr = (a: Record<string, string>) =>
              [a.organization, a.street, a.number].filter(Boolean).join(' ') +
              (a.postcode || a.municipality ? `\n${[a.postcode, a.municipality].filter(Boolean).join(' ')}` : '');

            return (
              <li
                key={b.id}
                className="overflow-hidden rounded-cm border border-burgundy/25 bg-white shadow-md ring-1 ring-burgundy/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-burgundy/30 bg-burgundy px-4 py-3 text-white">
                  <div>
                    <p className="font-serif text-lg font-semibold tracking-tight">{b.title}</p>
                    <p className="mt-0.5 text-xs text-white/90">{sub || '—'}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div
                  className={`border-b px-4 py-2 text-center text-xs font-semibold ${
                    inAanmerking ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'
                  }`}
                >
                  {inAanmerking ? 'U komt in aanmerking voor deze opdracht.' : 'U komt niet in aanmerking voor deze opdracht.'}
                  {elig?.reason ? <span className="mt-1 block font-normal opacity-90">{elig.reason}</span> : null}
                </div>

                <div className="grid gap-4 p-4 md:grid-cols-2">
                  <div className="rounded-cm border border-zinc-200 bg-zinc-50/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Omschrijving</p>
                    {b.body?.trim() ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{b.body}</p>
                    ) : (
                      <p className="mt-2 text-sm italic text-zinc-500">Omschrijving niet zichtbaar voor dit profiel.</p>
                    )}
                    {b.extraInfo?.trim() ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{b.extraInfo}</p>
                    ) : null}
                    <p className="mt-3 text-xs text-muted">Klant: {clientLabel}</p>
                  </div>
                  <div className="rounded-cm border border-zinc-200 bg-zinc-50/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Gezocht</p>
                    <div className="mt-2">
                      <GezochtLines b={b} />
                    </div>
                    {typeof det.makeup === 'string' && det.makeup ? (
                      <p className="mt-3 text-xs text-zinc-700">
                        <strong>Make-up:</strong>{' '}
                        {det.makeup === 'self' ? 'zelf te doen' : det.makeup === 'provided' ? 'make-up aanwezig' : det.makeup}
                      </p>
                    ) : null}
                    {typeof det.hair === 'string' && det.hair ? (
                      <p className="mt-1 text-xs text-zinc-700">
                        <strong>Kapsel:</strong>{' '}
                        {det.hair === 'self' ? 'zelf te doen' : det.hair === 'provided' ? 'kapper aanwezig' : det.hair}
                      </p>
                    ) : null}
                    {typeof det.provisionsText === 'string' && det.provisionsText ? (
                      <p className="mt-3 whitespace-pre-wrap text-xs text-zinc-800">
                        <strong className="text-burgundy">Wat te voorzien:</strong> {det.provisionsText}
                      </p>
                    ) : null}
                    {typeof det.earningsText === 'string' && det.earningsText ? (
                      <p className="mt-2 text-xs text-zinc-800">
                        <strong className="text-burgundy">Verdiensten:</strong> {det.earningsText}
                      </p>
                    ) : null}
                    {typeof det.remarksText === 'string' && det.remarksText ? (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-muted">{det.remarksText}</p>
                    ) : null}
                  </div>
                </div>

                {(Object.keys(mainA).length && fmtAddr(mainA).trim()) ? (
                  <div className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-800">
                    <p className="font-bold uppercase tracking-wide text-burgundy">Adres</p>
                    <p className="mt-1 whitespace-pre-line">{fmtAddr(mainA)}</p>
                  </div>
                ) : null}
                {(Object.keys(onA).length && fmtAddr(onA).trim()) ? (
                  <div className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-800">
                    <p className="font-bold uppercase tracking-wide text-burgundy">Opdracht gaat door op</p>
                    <p className="mt-1 whitespace-pre-line">{fmtAddr(onA)}</p>
                  </div>
                ) : null}

                <div className="border-t border-zinc-100 bg-zinc-50/90 px-4 py-3">
                  {blocked ? (
                    <span className="inline-block rounded-full bg-zinc-500 px-4 py-2 text-xs font-medium text-white">
                      U bent niet gekozen voor deze opdracht
                    </span>
                  ) : mine?.status === 'submitted' ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted">
                        Ingeschreven. Status: <strong className="text-ink">{mine.status}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => withdrawInterest(b.id)}
                        className="rounded-full border border-red-700 bg-white px-4 py-2 text-xs font-semibold text-red-800 hover:bg-red-50"
                      >
                        Uitschrijven
                      </button>
                    </div>
                  ) : mine?.status === 'accepted' ? (
                    <p className="text-sm font-semibold text-emerald-800">
                      Gefeliciteerd — u bent gekozen. Neem contact op met Class-Models.
                    </p>
                  ) : mine ? (
                    <p className="text-xs text-muted">
                      Status: <strong className="text-ink">{mine.status}</strong>
                    </p>
                  ) : canRespond ? (
                    <div className="flex flex-col gap-2 sm:mx-auto sm:max-w-lg sm:flex-row sm:items-end">
                      <textarea
                        className="min-h-[72px] flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs"
                        placeholder="Korte motivatie (min. 5 tekens)"
                        value={briefNote[b.id] ?? ''}
                        onChange={(e) => setBriefNote((n) => ({ ...n, [b.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => submitInterest(b.id)}
                        className="rounded-full bg-burgundy px-4 py-2 text-xs font-semibold text-white hover:bg-burgundyDeep"
                      >
                        Inschrijven
                      </button>
                    </div>
                  ) : b.status === 'open' && !inAanmerking ? (
                    <p className="text-xs text-red-800">
                      Inschrijven is niet beschikbaar: uw profiel komt niet in aanmerking volgens de criteria.
                    </p>
                  ) : (
                    <span className="text-xs text-muted">Deze opdracht is niet meer open voor nieuwe inschrijvingen.</span>
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
  } else if (tab === 'modeshow-28' && can('portal.model.media.read')) {
    main = <ModelModeshowDownloadsTab />;
  } else if (tab === 'modeshow-28') {
    main = (
      <p className="text-sm text-muted">
        Je account heeft geen rechten voor downloads. Vraag het bureau om{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.media.read</code>.
      </p>
    );
  } else if (tab === 'tryout-modeshow' && can('portal.model.briefs.read')) {
    sectionHeaderRight = tryoutHeaderRight ?? undefined;
    main = <ModelTryoutModeshowTab onHeaderRightChange={setTryoutHeaderRight} />;
  } else if (tab === 'tryout-modeshow') {
    main = (
      <p className="text-sm text-muted">
        Je account heeft geen rechten voor deze pagina. Vraag een beheerder om de permissie{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.briefs.read</code> op de modelrol te zetten.
      </p>
    );
  } else if (tab === 'profiel') {
    if (!token) {
      main =
        guestPreview && !user ? (
          <p className="text-sm leading-relaxed text-muted">
            In de voorbeeldmodus zonder account is je modellenfiche niet beschikbaar. Log in om gegevens en foto’s te
            beheren.
          </p>
        ) : (
          <p className="text-sm text-muted">Laden…</p>
        );
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
          user={portalUser}
          token={token}
          refreshMe={refreshMe}
          editing={profileEditing}
          canReadMedia={can('portal.model.media.read')}
          canUploadMedia={can('portal.model.media.upload')}
          media={media}
          mediaBusy={mediaBusy}
          uploadMedia={uploadMedia}
          setProfilePhotoFromAsset={setProfilePhotoFromAsset}
          reloadMedia={loadMedia}
          premiumSection={
            profileEditing && can('payments.checkout') ? (
              <div className="rounded-cm border border-line bg-zinc-50/80 p-4">
                <CmText contentKey="portal.model.premium.title" as="h3" className="text-sm font-semibold text-ink" />
                <CmText contentKey="portal.model.premium.intro" as="p" className="mt-2 text-xs leading-relaxed text-muted" />
                <p className="mt-2 text-xs text-muted">
                  Status:{' '}
                  <strong className="text-ink">{portalUser.isPremium ? 'Premium actief' : 'Geen premium'}</strong>
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
                  disabled={checkoutBusy || portalUser.isPremium}
                  onClick={() => startPremium()}
                  className={`mt-3 ${MODEL_BTN_GOLD} text-xs`}
                >
                  {checkoutBusy ? 'Bezig…' : portalUser.isPremium ? 'Premium actief' : 'Premium worden'}
                </button>
                <p className="mt-3 text-xs">
                  <Link href="/portal/model?tab=premium" className="font-semibold text-burgundy underline hover:text-burgundyDeep">
                    Uitgebreide Premium-pagina
                  </Link>{' '}
                  — prijs, voordelen en uitleg.
                </p>
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
  } else if (tab === 'setkaarten' && can('portal.model.media.read')) {
    main = (
      <ModelSetCardTab
        token={token}
        canRead={can('portal.model.media.read')}
        canUpload={can('portal.model.media.upload')}
        media={media}
        mediaBusy={mediaBusy}
        reloadMedia={loadMedia}
        uploadMedia={uploadMedia}
      />
    );
  } else if (tab === 'setkaarten') {
    main = (
      <p className="text-sm text-muted">
        Je account heeft geen rechten voor setkaarten. Vraag het bureau om{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.media.read</code>.
      </p>
    );
  } else if (tab === 'opleiding') {
    sectionHeaderRight = opleidingHeaderRight ?? undefined;
    main = <ModelOpleidingTab onHeaderRightChange={setOpleidingHeaderRight} />;
  } else if (tab === 'modellen') {
    sectionHeaderRight = modellenTitlebar ?? undefined;
    main = (
      <div className="min-w-0 space-y-3">
        <p className="text-sm leading-relaxed text-muted">
          Modellenoverzicht voor iedereen met een modelaccount. Zelfde menu als de rest van je account.
        </p>
        <ModelsCatalogGrid toolbarPlacement="titlebar" onTitlebarContent={setModellenTitlebarSlot} />
      </div>
    );
  } else if (tab === 'historiek' && can('portal.model.history.read')) {
    sectionTitle = 'Historiek';
    sectionHeaderRight = isPremium ? historiekHeaderSlot ?? undefined : undefined;
    main = (
      <ModelPortalHistoriekTab
        token={token}
        lastLoginAt={portalUser.lastLoginAt ?? null}
        onHeaderExtras={isPremium ? setHistoriekHeaderSlot : undefined}
        blurDetails={!isPremium}
      />
    );
  } else if (tab === 'historiek') {
    sectionTitle = 'Historiek';
    main = (
      <p className="text-sm text-muted">
        Je account heeft geen rechten voor historiek. Vraag het bureau om{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.history.read</code>.
      </p>
    );
  } else if (tab === 'push') {
    sectionTitle = 'Pushberichten';
    if (!isPremium) {
      main = (
        <PremiumUpsellPanel
          title="Pushberichten zijn premium"
          body="Ontvang meldingen op je telefoon of computer zodra er een opdracht past bij jouw profiel, plus herinneringen van het bureau — zonder steeds het portaal te verversen."
        />
      );
    } else {
      main = (
        <ModelPortalPushTab
          token={token}
          refreshMe={refreshMe}
          canRead={can('portal.model.push.read')}
          canSubscribe={can('portal.model.push.subscribe')}
          pushSummary={portalUser.push}
          onTitleBar={setPushTitleSlot}
        />
      );
    }
  } else if (tab === 'review-schrijven') {
    sectionTitle = 'Review schrijven';
    main = <ModelPortalReviewTab token={token} user={portalUser} />;
  } else if (tab === 'bericht') {
    sectionTitle = 'Bericht sturen';
    if (!isPremium) {
      main = (
        <PremiumUpsellPanel
          title="Berichten sturen is premium"
          body="Stuur rechtstreeks een bericht naar Class-Models vanuit je portaal — alleen beschikbaar met premium."
        />
      );
    } else {
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
                  {[portalUser.firstName, portalUser.lastName].filter(Boolean).join(' ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">E-mail</dt>
                <dd className="font-medium text-ink">{portalUser.email}</dd>
              </div>
              <div>
                <dt className="text-muted">GSM</dt>
                <dd className="font-medium text-ink">{portalUser.phone || '—'}</dd>
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
  }

  const pushRead = can('portal.model.push.read');
  const pushToolbar = pushRead && isPremium;

  return (
    <ModelPortalShell
      activeTab={tab}
      onTabChange={setTab}
      menuTabs={menuTabs}
      sectionTitle={sectionTitle}
      replaceSectionTitleBar={tab === 'push' && pushToolbar}
      sectionTitleSlot={tab === 'push' && pushToolbar ? pushTitleSlot : undefined}
      sectionHeaderRight={tab === 'push' && pushToolbar ? undefined : sectionHeaderRight}
      sectionTitleBarClassName={tab === 'push' && pushToolbar ? '!h-auto min-h-[44px] py-2' : undefined}
      sectionTitleBarInnerClassName={undefined}
      pushUnreadCount={portalUser.push?.unreadCount ?? 0}
      isPremium={isPremium}
      userFirstName={firstName}
      premiumButton={premiumButton}
    >
      {guestPreview && !user ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
          <strong>Voorbeeld zonder account.</strong> Je ziet de opbouw van het modellenportaal. Onder tab{' '}
          <strong>Modellen</strong> laadt het rooster via de publieke catalogus (API). Voor opdrachten, je fiche en
          uploads heb je een echte login nodig.
        </div>
      ) : null}
      {main}
      <div className="mt-8 border-t border-zinc-100 pt-4">
        <Link href="/portal/model?tab=home" className="text-sm text-burgundy hover:underline">
          ← Naar home
        </Link>
      </div>
    </ModelPortalShell>
  );
}
