'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { NieuwModelsGallery } from '@/components/nieuw/NieuwModelsGallery';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase } from '@/lib/api';
import { goToExternalCheckout, paymentReturnOrigin } from '@/lib/storage';
import { applyPostLoginRedirect } from '@/lib/redirect-after-auth';
import { uploadWithProgress } from '@/lib/upload-with-progress';
import {
  MODEL_PORTAL_TABS,
  parseModelPortalTab,
  type ModelPortalTabId,
} from '@/components/model-portal/model-portal-nav';
import { ModelPortalHomeContent } from '@/components/model-portal/ModelPortalHomeContent';
import { ModelPremiumTab } from '@/components/model-portal/ModelPremiumTab';
import { ModelPortalProfile, type ProfileMediaRow } from '@/components/model-portal/ModelPortalProfile';
import { ModelPortfolioTab } from '@/components/model-portal/ModelPortfolioTab';
import { ModelOpleidingTab } from '@/components/model-portal/ModelOpleidingTab';
import { ModelPortalHistoriekTab } from '@/components/model-portal/ModelPortalHistoriekTab';
import { ModelPortalPushTab } from '@/components/model-portal/ModelPortalPushTab';
import { ModelTryoutModeshowTab } from '@/components/model-portal/ModelTryoutModeshowTab';
import { ModelModeshowDownloadsTab } from '@/components/model-portal/ModelModeshowDownloadsTab';
import { ModelSetCardTab } from '@/components/model-portal/ModelSetCardTab';
import { ModelPortalReviewTab } from '@/components/model-portal/ModelPortalReviewTab';
import { ModelContactTab } from '@/components/model-portal/ModelContactTab';
import { PremiumUpsellPanel } from '@/components/model-portal/PremiumUpsellBanner';
import { ImpersonationBanner } from '@/components/model-portal/ImpersonationBanner';
import { ModelOpdrachtenTab } from '@/components/nieuw/ModelOpdrachtenTab';

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

function tabHref(id: ModelPortalTabId): string {
  return id === 'home' ? '/modellen' : `/modellen?tab=${id}`;
}

function ModuleUnavailable({ label }: { label: string }) {
  return (
    <div className="nieuw-panel" style={{ textAlign: 'center' }}>
      <p className="nieuw-lead" style={{ margin: '0 auto', textAlign: 'center' }}>
        Je hebt geen toegang tot {label} op dit account. Neem contact op met Class-Models als dit niet klopt.
      </p>
      <div style={{ marginTop: 28 }}>
        <Link className="nieuw-btn" href="/modellen">
          Terug naar overzicht
        </Link>
      </div>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Altijd onthouden tot uitloggen (lange JWT).
      const u = await login(identifier.trim(), password, { rememberMe: true });
      applyPostLoginRedirect(u, router, { next: searchParams.get('next') });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Inloggen mislukt.';
      if (/ongeldig|credentials|wachtwoord|unauthorized/i.test(msg)) {
        setError(
          'Inloggen mislukt. Gebruik het e-mailadres of telefoonnummer van uw modelaccount. Werkt het oude wachtwoord niet meer? Kies “Wachtwoord vergeten” hieronder.',
        );
      } else if (/database|server|mis/i.test(msg)) {
        setError(
          'Inloggen lukt niet: de server of database is even niet bereikbaar. Probeer later opnieuw of neem contact op met Class-Models.',
        );
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="nieuw-sectie">
      <div className="nieuw-wrap" style={{ maxWidth: 520 }}>
        <h1 className="nieuw-display" style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>
          Welkom <em>terug</em>
        </h1>
        <p className="nieuw-lead">
          Log in met uw modelaccount om het Modellenportaal te openen.
        </p>

        <div className="nieuw-panel" style={{ marginTop: 22, borderColor: 'var(--n-gold-hair)' }}>
          <span className="nieuw-label">Alleen voor contractmodellen</span>
          <p style={{ margin: '12px 0 0', color: 'var(--n-mut)', fontSize: 13, lineHeight: 1.65 }}>
            Het modellenaccount is alleen voor modellen die onder contract staan bij Class-Models.
            Geen overeenkomst? Ga dan naar het gastenportaal.
          </p>
          <div className="nieuw-login-actions" style={{ marginTop: 18 }}>
            <Link className="nieuw-btn" href="/?m=guest&info=model-worden">
              Naar gastenportaal
            </Link>
            <Link className="nieuw-btn nieuw-btn-ghost" href="/modellen/registreren">
              Modellenaccount maken
            </Link>
          </div>
        </div>

        <form className="nieuw-panel" style={{ marginTop: 18 }} onSubmit={onSubmit}>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span
              style={{
                display: 'block',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--n-dim)',
                marginBottom: 8,
              }}
            >
              E-mail of telefoonnummer
            </span>
            <input
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--n-bg)',
                border: '1px solid var(--n-hair)',
                color: 'var(--n-ink)',
                padding: '11px 12px',
                fontSize: 13,
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 20 }}>
            <span
              style={{
                display: 'block',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--n-dim)',
                marginBottom: 8,
              }}
            >
              Wachtwoord
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--n-bg)',
                border: '1px solid var(--n-hair)',
                color: 'var(--n-ink)',
                padding: '11px 12px',
                fontSize: 13,
              }}
            />
          </label>
          {error ? (
            <p style={{ color: '#e8a0a0', fontSize: 13, margin: '0 0 16px' }}>{error}</p>
          ) : null}
          <button className="nieuw-btn" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
            {busy ? 'Bezig…' : 'Inloggen'}
          </button>
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <Link className="nieuw-link" href="/modellen/wachtwoord-vergeten">
              Wachtwoord vergeten?
            </Link>
            <Link className="nieuw-link" href="/modellen/registreren">
              Modellenaccount maken
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}

function WrongRolePanel() {
  const { logout } = useAuth();

  return (
    <section className="nieuw-uc">
      <div className="nieuw-wrap" style={{ maxWidth: 560 }}>
        <h1 className="nieuw-h1">
          Alleen voor <em>modellen</em>
        </h1>
        <p className="nieuw-lead" style={{ margin: '18px auto 0', textAlign: 'center' }}>
          U bent ingelogd met een account zonder modelrol. Het Modellenportaal is alleen voor
          contractmodellen. Log uit en log in met uw modelaccount, of maak een account aan als u een
          overeenkomst heeft.
        </p>
        <div style={{ marginTop: 36, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="nieuw-btn"
            onClick={() => {
              logout();
            }}
          >
            Uitloggen en opnieuw inloggen
          </button>
          <Link className="nieuw-btn nieuw-btn-ghost" href="/modellen/registreren">
            Modellenaccount maken
          </Link>
          <Link className="nieuw-btn nieuw-btn-ghost" href="/?m=guest&info=model-worden">
            Naar gastenportaal
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function NieuwModellenPage() {
  const { user, loading, token, logout, refreshMe, can } = useAuth();
  const searchParams = useSearchParams();
  const tab = parseModelPortalTab(searchParams.get('tab'));
  const premiumReturn = searchParams.get('premium') === 'return';

  const [premiumInfo, setPremiumInfo] = useState<PremiumInfo | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [media, setMedia] = useState<ProfileMediaRow[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);

  const isModel = Boolean(user?.roles?.includes('model'));
  const isAdminUser = Boolean(
    user?.roles?.includes('admin') ||
      can('*') ||
      user?.permissions?.some((p) => p.startsWith('admin.')),
  );
  const canEnterPortal = isModel || isAdminUser;

  useEffect(() => {
    if (!isModel) return;
    apiFetch<PremiumInfo>('/payments/premium/info')
      .then(setPremiumInfo)
      .catch(() => setPremiumInfo(null));
  }, [isModel, tab]);

  const loadMedia = useCallback(async (): Promise<ProfileMediaRow[]> => {
    if (!token || !can('portal.model.media.read')) return [];
    try {
      const rows = await apiFetch<ProfileMediaRow[]>('/portal/model/media', { token });
      setMedia(rows);
      return rows;
    } catch {
      setMedia([]);
      return [];
    }
  }, [token, can]);

  useEffect(() => {
    if (!isModel) return;
    void loadMedia();
  }, [isModel, loadMedia]);

  useEffect(() => {
    if (tab !== 'profiel') setProfileEditing(false);
  }, [tab]);

  const startPremium = useCallback(async () => {
    if (!token) return;
    setCheckoutErr(null);
    setCheckoutBusy(true);
    try {
      const res = await apiFetch<CheckoutOk | CheckoutSkip>('/payments/premium/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({ returnOrigin: paymentReturnOrigin() }),
      });
      if ('skipCheckout' in res && res.skipCheckout) {
        setCheckoutErr(res.reason);
        return;
      }
      if ('checkoutUrl' in res && res.checkoutUrl) {
        goToExternalCheckout(res.checkoutUrl);
        return;
      }
      setCheckoutErr('Onverwacht antwoord van de server.');
    } catch (e) {
      setCheckoutErr(e instanceof Error ? e.message : 'Betaling starten mislukt.');
    } finally {
      setCheckoutBusy(false);
    }
  }, [token]);

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
      const text = await uploadWithProgress(
        `${getApiBase()}/portal/model/media/upload?folderSlug=${encodeURIComponent(folderSlug)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
          onProgress: () => undefined,
          onUploadBytesComplete: () => undefined,
        },
      );
      const row = JSON.parse(text) as { id?: string; error?: string };
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

  let body: ReactNode;

  if (loading) {
    body = (
      <section className="nieuw-uc" style={{ background: 'var(--n-bg)', minHeight: '50vh' }}>
        <p className="nieuw-lead">Laden…</p>
      </section>
    );
  } else if (!user) {
    body = <LoginForm />;
  } else if (!canEnterPortal) {
    body = <WrongRolePanel />;
  } else if (user && canEnterPortal) {
    const portalUser = user;
    const displayName = [portalUser.firstName, portalUser.lastName].filter(Boolean).join(' ').trim() || portalUser.email;
    const isPremium = Boolean(portalUser.isPremium || isAdminUser);
    const activeLabel = MODEL_PORTAL_TABS.find((t) => t.id === tab)?.label ?? 'Home';

    let main: ReactNode = null;

    if (tab === 'home') {
      main = (
        <div style={{ display: 'grid', gap: 28 }}>
          <ModelPortalHomeContent
            userEmail={portalUser.email}
            premiumReturn={premiumReturn}
            pushUnreadCount={portalUser.push?.unreadCount ?? 0}
            hrefForTab={(id) => tabHref(id as Parameters<typeof tabHref>[0])}
          />
        </div>
      );
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
    } else if (tab === 'opdrachten') {
      if (!can('portal.model.briefs.read')) {
        main = (
          <div className="nieuw-panel" style={{ textAlign: 'center' }}>
            <p className="nieuw-lead" style={{ margin: '0 auto', textAlign: 'center' }}>
              U heeft geen toegang tot opdrachten. Neem contact op met Class-Models als dit onverwacht is.
            </p>
          </div>
        );
      } else {
        main = (
          <ModelOpdrachtenTab
            token={token}
            modelUserId={portalUser.id}
            canRespond={can('portal.model.briefs.respond')}
            isPremium={isPremium}
            forceEligible={isAdminUser}
            premiumHref="/modellen?tab=premium"
          />
        );
      }
    } else if (tab === 'profiel') {
      if (!token) {
        main = <p className="nieuw-lead">Laden…</p>;
      } else {
        main = (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className={profileEditing ? 'nieuw-btn nieuw-btn-ghost' : 'nieuw-btn'}
                onClick={() => setProfileEditing((v) => !v)}
              >
                {profileEditing ? 'Terug naar overzicht' : 'Profiel bewerken'}
              </button>
            </div>
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
              premiumSection={null}
            />
          </div>
        );
      }
    } else if (tab === 'portfolio') {
      main = <ModelPortfolioTab />;
    } else if (tab === 'opleiding') {
      main = <ModelOpleidingTab />;
    } else if (tab === 'historiek') {
      if (!can('portal.model.history.read')) {
        main = <ModuleUnavailable label="Historiek" />;
      } else {
        main = (
          <ModelPortalHistoriekTab
            token={token}
            lastLoginAt={portalUser.lastLoginAt ?? null}
            blurDetails={!isPremium}
          />
        );
      }
    } else if (tab === 'push') {
      if (!isPremium) {
        main = (
          <PremiumUpsellPanel
            premiumHref="/modellen?tab=premium"
            title="Pushberichten zijn premium"
            body="Ontvang meldingen op je telefoon of computer zodra er een opdracht past bij jouw profiel — alleen beschikbaar met premium."
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
          />
        );
      }
    } else if (tab === 'tryout-modeshow') {
      main = can('portal.model.briefs.read') ? (
        <ModelTryoutModeshowTab />
      ) : (
        <ModuleUnavailable label="Try-out modeshow" />
      );
    } else if (tab === 'modeshow-28') {
      main = can('portal.model.media.read') ? (
        <ModelModeshowDownloadsTab />
      ) : (
        <ModuleUnavailable label="Download try-out" />
      );
    } else if (tab === 'setkaarten') {
      if (!can('portal.model.media.read')) {
        main = <ModuleUnavailable label="Setkaarten bestellen" />;
      } else {
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
      }
    } else if (tab === 'review-schrijven') {
      main = <ModelPortalReviewTab token={token} user={portalUser} />;
    } else if (tab === 'modellen') {
      main = (
        <NieuwModelsGallery title="Overzicht onze modellen" />
      );
    } else if (tab === 'bericht') {
      if (!isPremium) {
        main = (
          <PremiumUpsellPanel
            premiumHref="/modellen?tab=premium"
            title="Berichten sturen is premium"
            body="Stuur rechtstreeks een bericht naar Class-Models vanuit je portaal — alleen beschikbaar met premium."
          />
        );
      } else if (!token) {
        main = <ModuleUnavailable label="Bericht sturen" />;
      } else {
        const name = [portalUser.firstName, portalUser.lastName].filter(Boolean).join(' ') || 'Model';
        main = (
          <ModelContactTab
            token={token}
            name={name}
            email={portalUser.email}
            phone={portalUser.phone}
          />
        );
      }
    } else {
      main = <ModuleUnavailable label={activeLabel} />;
    }

    body = (
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <ImpersonationBanner />

          <div className="nieuw-panel nieuw-themed" style={{ padding: 22, minWidth: 0 }}>
            {main}
          </div>
        </div>
      </section>
    );
  } else {
    body = <LoginForm />;
  }

  return <NieuwShell portal="modellen">{body}</NieuwShell>;
}
