'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '@/context/auth-context';
import { apiFetch, getApiBase } from '@/lib/api';

export type ProfileMediaRow = {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  thumbKey?: string | null;
  webpKey?: string | null;
  createdAt: string;
  /** Server: eerste bestaande bestand op schijf (thumb → webp → origineel). */
  publicKey?: string;
  detailKey?: string;
  /** Modelportaal: volledige resolutie tot eerste download als admin dat zo instelt. */
  portalDetailKey?: string;
};

function mediaThumbKey(a: ProfileMediaRow): string {
  return a.publicKey ?? a.thumbKey ?? a.webpKey ?? a.storageKey;
}

function mediaDetailKey(a: ProfileMediaRow): string {
  return a.detailKey ?? a.webpKey ?? a.storageKey ?? a.thumbKey ?? a.storageKey;
}

function mediaPortalDetailKey(a: ProfileMediaRow): string {
  return a.portalDetailKey ?? mediaDetailKey(a);
}

const BESCHIKBAAR_OPTS = [
  'Modeshows',
  'Foto opdrachten',
  'Reklame',
  'Host/hostess',
  'Lingerie/Bikini',
  'Artistiek naakt',
] as const;

const BESCHIKBAAR_LABEL: Record<string, string> = {
  'Foto opdrachten': 'Foto opdrachten',
  Reklame: 'Reclame',
  'Host/hostess': 'Host / Hostess',
  'Lingerie/Bikini': 'Bikini / Lingerie',
};

function str(v: unknown): string {
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

type SheetForm = {
  geboortedatum: string;
  nationaliteit: string;
  straat: string;
  postcode: string;
  gemeente: string;
  land: string;
  gsmModel: string;
  gsmMoeder: string;
  gsmVader: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  rekeningnummer: string;
  lengte: string;
  maat: string;
  schoenmaat: string;
  haarkleur: string;
  kleurOgen: string;
  bhMaat: string;
  borstomtrek: string;
  confectiemaat: string;
  heupomtrek: string;
  jeansmaat: string;
  taille: string;
  overMij: string;
  ervaringen: string;
  geslacht: string[];
  beschikbaar: string[];
};

const emptySheet = (): SheetForm => ({
  geboortedatum: '',
  nationaliteit: '',
  straat: '',
  postcode: '',
  gemeente: '',
  land: 'België',
  gsmModel: '',
  gsmMoeder: '',
  gsmVader: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  rekeningnummer: 'BE',
  lengte: '',
  maat: '',
  schoenmaat: '',
  haarkleur: '',
  kleurOgen: '',
  bhMaat: '',
  borstomtrek: '',
  confectiemaat: '',
  heupomtrek: '',
  jeansmaat: '',
  taille: '',
  overMij: '',
  ervaringen: '',
  geslacht: [],
  beschikbaar: [],
});

/** Verwijdert per ongeluk in usermeta geplakte PHP-snippers (import/WP). */
function stripCorruptedMetaLeak(s: string): string {
  const t = s.trim();
  if (!t) return '';
  if (
    t.includes('update_user_meta') ||
    t.includes('$ensure_role') ||
    t.includes('$remove_role') ||
    t.includes('<?php') ||
    (t.includes('$user_id') && t.includes('tryout'))
  ) {
    return '';
  }
  return s;
}

function sheetFromUser(ms: Record<string, unknown> | null | undefined, phoneFallback: string): SheetForm {
  const b = emptySheet();
  if (!ms) {
    b.gsmModel = phoneFallback;
    return b;
  }
  return {
    geboortedatum: str(ms.geboortedatum),
    nationaliteit: str(ms.nationaliteit),
    straat: str(ms.straat),
    postcode: str(ms.postcode),
    gemeente: str(ms.gemeente),
    land: str(ms.land) || 'België',
    gsmModel: str(ms.gsmModel) || phoneFallback,
    gsmMoeder: str(ms.gsmMoeder),
    gsmVader: str(ms.gsmVader),
    facebook: str(ms.facebook),
    instagram: str(ms.instagram),
    tiktok: str(ms.tiktok),
    rekeningnummer: str(ms.rekeningnummer) || 'BE',
    lengte: str(ms.lengte),
    maat: str(ms.maat),
    schoenmaat: str(ms.schoenmaat),
    haarkleur: str(ms.haarkleur),
    kleurOgen: str(ms.kleurOgen),
    bhMaat: str(ms.bhMaat),
    borstomtrek: str(ms.borstomtrek),
    confectiemaat: str(ms.confectiemaat),
    heupomtrek: str(ms.heupomtrek),
    jeansmaat: str(ms.jeansmaat),
    taille: str(ms.taille),
    overMij: stripCorruptedMetaLeak(str(ms.overMij)),
    ervaringen: stripCorruptedMetaLeak(str(ms.ervaringen)),
    geslacht: strArr(ms.geslacht),
    beschikbaar: strArr(ms.beschikbaar),
  };
}

function ageFromGeboorte(ymd: string): number | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const bd = new Date(y, m - 1, d);
  if (Number.isNaN(bd.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - bd.getFullYear();
  const md = t.getMonth() - bd.getMonth();
  if (md < 0 || (md === 0 && t.getDate() < bd.getDate())) a--;
  return a >= 0 ? a : null;
}

function ProfileSection({
  title,
  complete,
  children,
}: {
  title: string;
  complete?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b-2 border-burgundy bg-burgundy px-2.5 py-1.5 md:px-3">
        <h3 className="text-xs font-bold uppercase leading-none tracking-wide text-white">{title}</h3>
        {complete ? (
          <span className="text-xs font-bold text-white" aria-hidden>
            ✓
          </span>
        ) : null}
      </div>
      <div className="px-2 py-2 md:px-3 md:py-2.5">{children}</div>
    </div>
  );
}

function fieldClass() {
  return 'mt-0 w-full border border-line bg-white px-2 py-1.5 font-serif text-sm leading-snug text-ink outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy/25';
}

function labelClass() {
  return 'mb-0 block font-serif text-[11px] font-bold uppercase leading-tight tracking-wide text-burgundy';
}

export function ModelPortalProfile({
  user,
  token,
  refreshMe,
  editing,
  canReadMedia,
  canUploadMedia,
  media,
  mediaBusy,
  uploadMedia,
  setProfilePhotoFromAsset,
  premiumSection,
}: {
  user: AuthUser;
  token: string;
  refreshMe: (tokenOverride?: string | null) => Promise<AuthUser | null>;
  editing: boolean;
  canReadMedia: boolean;
  canUploadMedia: boolean;
  media: ProfileMediaRow[];
  mediaBusy: boolean;
  uploadMedia: (
    f: File | null,
    opts?: { setAsProfilePhoto?: boolean; folderSlug?: 'models' | 'tijdelijke-uploads' },
  ) => void | Promise<void>;
  setProfilePhotoFromAsset: (assetId: string) => void | Promise<void>;
  premiumSection: ReactNode;
}) {
  const [profile, setProfile] = useState({
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    phone: user.phone ?? '',
  });
  const [sheet, setSheet] = useState<SheetForm>(() => sheetFromUser(user.modelSheet ?? null, user.phone ?? ''));
  const [msg, setMsg] = useState('');
  const [galleryUploadFolder, setGalleryUploadFolder] = useState<'models' | 'tijdelijke-uploads'>('models');

  useEffect(() => {
    setProfile({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
    });
  }, [user.firstName, user.lastName, user.phone]);

  useEffect(() => {
    if (editing) {
      setSheet(sheetFromUser(user.modelSheet ?? null, user.phone ?? ''));
      setMsg('');
    }
  }, [editing, user.id, user.modelSheet, user.phone]);

  const images = useMemo(() => media.filter((a) => a.mimeType.startsWith('image/')), [media]);
  const galleryOnly = useMemo(
    () =>
      user.profilePhotoAssetId
        ? images.filter((a) => a.id !== user.profilePhotoAssetId)
        : images,
    [images, user.profilePhotoAssetId],
  );
  const profileAsset = useMemo(
    () =>
      user.profilePhotoAssetId
        ? images.find((a) => a.id === user.profilePhotoAssetId)
        : undefined,
    [images, user.profilePhotoAssetId],
  );

  const slides = useMemo(() => {
    const keys: string[] = [];
    const profileHeroKey = profileAsset
      ? mediaPortalDetailKey(profileAsset)
      : user.profileThumbKey?.trim() || null;
    if (profileHeroKey) keys.push(profileHeroKey);
    for (const a of galleryOnly) {
      const k = mediaPortalDetailKey(a);
      if (k && !keys.includes(k)) keys.push(k);
    }
    if (keys.length === 0 && images.length) {
      for (const a of images) keys.push(mediaPortalDetailKey(a));
    }
    return keys;
  }, [profileAsset, user.profileThumbKey, galleryOnly, images]);

  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    setSlideIndex(0);
  }, [slides.length, user.profilePhotoAssetId, user.id, editing]);

  useEffect(() => {
    if (slideIndex > 0 && slideIndex >= slides.length) {
      setSlideIndex(Math.max(0, slides.length - 1));
    }
  }, [slideIndex, slides.length]);
  const geslachtLabel =
    sheet.geslacht.length > 0 ? sheet.geslacht.map((g) => (g === 'vrouw' ? 'vrouw' : 'man')).join(', ') : '—';
  const leeftijd = ageFromGeboorte(sheet.geboortedatum);

  const sectionContactOk = !!(sheet.straat && sheet.postcode && sheet.gemeente && sheet.land && sheet.gsmModel);
  const sectionModelOk = !!(sheet.lengte && sheet.maat && sheet.schoenmaat);
  const sectionSocialOk = !!(sheet.instagram || sheet.facebook || sheet.tiktok);

  const ackPortfolioDownload = useCallback(
    async (assetId: string) => {
      try {
        await apiFetch('/portal/model/media/download-ack', {
          method: 'POST',
          token,
          body: JSON.stringify({ assetId }),
        });
      } catch {
        /* download kan al gestart zijn */
      }
    },
    [token],
  );

  const save = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setMsg('');
      try {
        await apiFetch('/users/me', {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: sheet.gsmModel || profile.phone,
            bio: null,
            modelSheet: {
              ...sheet,
              gsmModel: sheet.gsmModel || profile.phone,
            },
          }),
        });
        await refreshMe();
        setMsg('Profiel opgeslagen.');
      } catch {
        setMsg('Opslaan mislukt.');
      }
    },
    [token, profile, sheet, refreshMe],
  );

  const row = (label: string, value: string) => (
    <div className="flex flex-col gap-0 border-b border-line py-1.5 last:border-b-0 sm:grid sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-4 sm:py-1.5">
      <dt className="text-[11px] font-normal uppercase tracking-wide text-ink/80">{label}</dt>
      <dd className="min-w-0 text-right text-xs leading-snug text-ink">{value || '—'}</dd>
    </div>
  );

  const beschikbaarTekst = sheet.beschikbaar.length
    ? sheet.beschikbaar.map((x) => BESCHIKBAAR_LABEL[x] ?? x).join(' · ')
    : '';

  if (!editing) {
    const heroPublicKey = slides[slideIndex] ?? slides[0] ?? null;
    const photoBarTotal = slides.length;
    const showPhotoBar = !!heroPublicKey && photoBarTotal >= 1;
    const thumbNavDisabled = photoBarTotal <= 1;
    const photoBarIndex = photoBarTotal > 0 ? slideIndex + 1 : 0;

    return (
      <div className="space-y-5 font-serif text-sm">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-4">
            {canReadMedia ? (
              <div className="overflow-hidden border border-line bg-white shadow-sm">
                {heroPublicKey ? (
                  <>
                    <div className="flex w-full justify-center bg-zinc-100">
                      <img
                        src={`${getApiBase()}/media/public/${encodeURIComponent(heroPublicKey)}`}
                        alt=""
                        className="mx-auto block h-auto max-h-[min(92vh,960px)] w-auto max-w-full object-contain"
                      />
                    </div>
                    {showPhotoBar ? (
                      <div className="flex items-center justify-between gap-2 border-t border-burgundy bg-burgundy px-2 py-2 text-white sm:px-3">
                        <button
                          type="button"
                          disabled={thumbNavDisabled}
                          className={`min-w-[2.25rem] px-2 py-1 text-sm font-semibold sm:text-base ${
                            thumbNavDisabled ? 'cursor-default opacity-40' : 'hover:bg-white/10'
                          }`}
                          aria-label="Vorige foto"
                          onClick={() => {
                            if (thumbNavDisabled) return;
                            setSlideIndex((i) => (i <= 0 ? slides.length - 1 : i - 1));
                          }}
                        >
                          ‹
                        </button>
                        <span className="text-sm font-semibold tabular-nums sm:text-base">
                          {photoBarIndex} / {photoBarTotal}
                        </span>
                        <button
                          type="button"
                          disabled={thumbNavDisabled}
                          className={`min-w-[2.25rem] px-2 py-1 text-sm font-semibold sm:text-base ${
                            thumbNavDisabled ? 'cursor-default opacity-40' : 'hover:bg-white/10'
                          }`}
                          aria-label="Volgende foto"
                          onClick={() => {
                            if (thumbNavDisabled) return;
                            setSlideIndex((i) => (i >= slides.length - 1 ? 0 : i + 1));
                          }}
                        >
                          ›
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex min-h-[14rem] items-center justify-center border-b border-line bg-zinc-100 px-4 py-10 text-center text-xs text-muted">
                    Nog geen foto&apos;s in je media-bibliotheek
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[14rem] items-center justify-center border border-dashed border-line bg-zinc-100 text-center text-xs text-muted">
                Media niet beschikbaar voor dit account
              </div>
            )}
            {sheet.overMij.trim() || sheet.ervaringen.trim() ? (
              <div className="border border-line bg-white px-3 py-2.5 shadow-sm md:px-4 md:py-3">
                <h3 className="border-b border-burgundy pb-1.5 text-sm font-bold uppercase tracking-wide text-burgundy">
                  Over mij en ervaring
                </h3>
                {sheet.overMij.trim() ? (
                  <div className="mt-2">
                    <p className="text-[11px] font-normal uppercase tracking-wide text-ink/80">Over mij</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink">{sheet.overMij}</p>
                  </div>
                ) : null}
                {sheet.ervaringen.trim() ? (
                  <div className={sheet.overMij.trim() ? 'mt-3 border-t border-line pt-3' : 'mt-2'}>
                    <p className="text-[11px] font-normal uppercase tracking-wide text-ink/80">Ervaring</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink">{sheet.ervaringen}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 space-y-4 font-serif text-sm">
            <div className="border border-line bg-white px-3 py-2.5 shadow-sm md:px-4 md:py-3">
              <h3 className="border-b border-burgundy pb-1.5 text-sm font-bold uppercase tracking-wide text-burgundy">
                Overzicht
              </h3>
              <dl className="mt-1">{row('Naam', [user.firstName, user.lastName].filter(Boolean).join(' '))}</dl>
              <dl>{row('E-mail', user.email)}</dl>
              <dl>{row('Telefoon', sheet.gsmModel || user.phone || '')}</dl>
              <dl>{row('Gemeente', sheet.gemeente)}</dl>
              <dl>
                {row('Leeftijd', leeftijd != null ? `${leeftijd} jaar` : sheet.geboortedatum ? sheet.geboortedatum : '—')}
              </dl>
              <dl>{row('Geslacht', geslachtLabel)}</dl>
            </div>

            <div className="border border-line bg-white px-3 py-2.5 shadow-sm md:px-4 md:py-3">
              <h3 className="border-b border-burgundy pb-1.5 text-sm font-bold uppercase tracking-wide text-burgundy">
                Beschikbaar voor
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-ink">{beschikbaarTekst || '—'}</p>
            </div>

            <div className="border border-line bg-white px-3 py-2.5 shadow-sm md:px-4 md:py-3">
              <h3 className="border-b border-burgundy pb-1.5 text-sm font-bold uppercase tracking-wide text-burgundy">
                Model info
              </h3>
              <dl className="mt-1">{row('Lengte', sheet.lengte ? `${sheet.lengte} cm` : '')}</dl>
              <dl>{row('Maat', sheet.maat)}</dl>
              <dl>{row('Schoenmaat', sheet.schoenmaat)}</dl>
              <dl>{row('BH-maat', sheet.bhMaat)}</dl>
              <dl>{row('Borstomtrek', sheet.borstomtrek)}</dl>
              <dl>{row('Confectiemaat', sheet.confectiemaat)}</dl>
              <dl>{row('Heupomtrek', sheet.heupomtrek)}</dl>
              <dl>{row('Jeansmaat', sheet.jeansmaat)}</dl>
              <dl>{row('Taille', sheet.taille)}</dl>
              <dl>{row('Haarkleur', sheet.haarkleur)}</dl>
              <dl>{row('Kleur ogen', sheet.kleurOgen)}</dl>
              <dl>{row('Instagram', sheet.instagram)}</dl>
              <dl>{row('Facebook', sheet.facebook)}</dl>
              <dl>{row('TikTok', sheet.tiktok)}</dl>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-3 font-serif text-sm">
      {canReadMedia ? (
        <ProfileSection title="Foto's" complete={images.length > 0}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Hoofdfoto</p>
              {profileAsset ? (
                <img
                  src={`${getApiBase()}/media/public/${encodeURIComponent(mediaPortalDetailKey(profileAsset))}`}
                  alt=""
                  className="mx-auto block h-auto w-full max-w-[220px] border border-line bg-zinc-100 object-contain"
                />
              ) : user.profileThumbKey ? (
                <img
                  src={`${getApiBase()}/media/public/${encodeURIComponent(user.profileThumbKey)}`}
                  alt=""
                  className="mx-auto block h-auto w-full max-w-[220px] border border-line bg-zinc-100 object-contain"
                />
              ) : (
                <p className="text-xs text-muted">Nog geen hoofdfoto gekozen.</p>
              )}
              {canUploadMedia ? (
                <label className="inline-block cursor-pointer border border-ink bg-ink px-2.5 py-1 text-center text-[10px] font-bold uppercase leading-none text-white hover:bg-ink/90">
                  {mediaBusy ? 'Uploaden…' : 'Hoofdfoto uploaden'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => uploadMedia(e.target.files?.[0] ?? null, { setAsProfilePhoto: true })}
                  />
                </label>
              ) : null}
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Galerij</p>
              <p className="text-xs leading-snug text-muted">
                Extra portfoliofoto&apos;s: blader op je fiche met de pijltjes. Je hoofdfoto wordt getoond in het
                modellenoverzicht. Met <strong className="text-ink">Download</strong> open je de beste kwaliteit; als de
                beheerder een wis-termijn heeft ingesteld, start daarmee de teller om de bestanden later automatisch te
                verwijderen.
              </p>
              {canUploadMedia ? (
                <div className="flex flex-wrap gap-3 text-[11px] text-ink">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="gallery-upload-folder"
                      checked={galleryUploadFolder === 'models'}
                      onChange={() => setGalleryUploadFolder('models')}
                    />
                    Modellen (portfolio)
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="gallery-upload-folder"
                      checked={galleryUploadFolder === 'tijdelijke-uploads'}
                      onChange={() => setGalleryUploadFolder('tijdelijke-uploads')}
                    />
                    Tijdelijke uploads (afspraken)
                  </label>
                </div>
              ) : null}
              {canUploadMedia ? (
                <label className="inline-block cursor-pointer border border-line bg-white px-2.5 py-1 text-center text-[10px] font-bold uppercase leading-none text-ink hover:bg-panel">
                  {mediaBusy ? 'Uploaden…' : 'Galerijfoto toevoegen'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => uploadMedia(e.target.files?.[0] ?? null, { folderSlug: galleryUploadFolder })}
                  />
                </label>
              ) : null}
            </div>
          </div>
          {images.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-line pt-2">
              {images.map((a) => {
                const isMain = user.profilePhotoAssetId === a.id;
                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-2 border border-line bg-white px-2 py-1.5"
                  >
                    <img
                      src={`${getApiBase()}/media/public/${encodeURIComponent(mediaThumbKey(a))}`}
                      alt=""
                      className="h-14 w-11 shrink-0 border border-line bg-zinc-100 object-contain"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">{a.originalName}</span>
                    <a
                      href={`${getApiBase()}/media/public/${encodeURIComponent(mediaPortalDetailKey(a))}`}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-[10px] font-bold uppercase text-burgundy underline hover:text-burgundyDeep"
                      onMouseDown={() => void ackPortfolioDownload(a.id)}
                    >
                      Download
                    </a>
                    {isMain ? (
                      <span className="text-[10px] font-bold uppercase text-burgundy">Hoofdfoto</span>
                    ) : canUploadMedia ? (
                      <button
                        type="button"
                        disabled={mediaBusy}
                        onClick={() => void setProfilePhotoFromAsset(a.id)}
                        className="shrink-0 border border-burgundy bg-burgundy/10 px-2 py-0.5 text-[10px] font-bold uppercase text-burgundy hover:bg-burgundy/20 disabled:opacity-50"
                      >
                        Als hoofdfoto
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted">Nog geen foto&apos;s in je bibliotheek.</p>
          )}
        </ProfileSection>
      ) : null}

      <ProfileSection title="Persoonlijke info" complete={sectionContactOk}>
        <div className="grid gap-x-2 gap-y-1.5 sm:grid-cols-2">
          <div>
            <label className={labelClass()}>Voornaam</label>
            <input
              className={fieldClass()}
              value={profile.firstName}
              onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass()}>Achternaam</label>
            <input
              className={fieldClass()}
              value={profile.lastName}
              onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass()}>Geboortedatum</label>
            <input
              type="date"
              className={fieldClass()}
              value={sheet.geboortedatum}
              onChange={(e) => setSheet((s) => ({ ...s, geboortedatum: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass()}>Geslacht</label>
            <div className="mt-0.5 flex flex-wrap gap-3">
              {(['vrouw', 'man'] as const).map((g) => {
                const on = sheet.geslacht.includes(g);
                return (
                  <label key={g} className="flex items-center gap-1.5 text-xs leading-tight">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setSheet((s) => ({
                          ...s,
                          geslacht: on ? s.geslacht.filter((x) => x !== g) : [...s.geslacht, g],
                        }))
                      }
                    />
                    {g === 'vrouw' ? 'Vrouw' : 'Man'}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()}>Nationaliteit</label>
            <select
              className={fieldClass()}
              value={sheet.nationaliteit}
              onChange={(e) => setSheet((s) => ({ ...s, nationaliteit: e.target.value }))}
            >
              <option value="">Maak een keuze</option>
              <option value="België">België</option>
              <option value="Nederland">Nederland</option>
              <option value="Anders">Anders</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()}>Adres</label>
            <input
              className={fieldClass()}
              value={sheet.straat}
              onChange={(e) => setSheet((s) => ({ ...s, straat: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass()}>Postcode</label>
            <input
              className={fieldClass()}
              value={sheet.postcode}
              onChange={(e) => setSheet((s) => ({ ...s, postcode: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass()}>Gemeente</label>
            <input
              className={fieldClass()}
              value={sheet.gemeente}
              onChange={(e) => setSheet((s) => ({ ...s, gemeente: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()}>Land</label>
            <input
              className={fieldClass()}
              value={sheet.land}
              onChange={(e) => setSheet((s) => ({ ...s, land: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass()}>Telefoon (GSM model)</label>
            <input
              className={fieldClass()}
              value={sheet.gsmModel}
              onChange={(e) => {
                const v = e.target.value;
                setSheet((s) => ({ ...s, gsmModel: v }));
                setProfile((p) => ({ ...p, phone: v }));
              }}
            />
          </div>
          <div>
            <label className={labelClass()}>GSM moeder</label>
            <input
              className={fieldClass()}
              value={sheet.gsmMoeder}
              onChange={(e) => setSheet((s) => ({ ...s, gsmMoeder: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()}>GSM vader</label>
            <input
              className={fieldClass()}
              value={sheet.gsmVader}
              onChange={(e) => setSheet((s) => ({ ...s, gsmVader: e.target.value }))}
            />
          </div>
        </div>
      </ProfileSection>

      <ProfileSection title="Rekeningnummer" complete={!!sheet.rekeningnummer && sheet.rekeningnummer !== 'BE'}>
        <div>
          <label className={labelClass()}>IBAN</label>
          <input
            className={fieldClass()}
            value={sheet.rekeningnummer}
            onChange={(e) => setSheet((s) => ({ ...s, rekeningnummer: e.target.value }))}
          />
        </div>
      </ProfileSection>

      <ProfileSection title="Model info" complete={sectionModelOk}>
        <div className="grid gap-x-2 gap-y-1.5 sm:grid-cols-2">
          {(
            [
              ['lengte', 'Lengte (cm)'],
              ['maat', 'Maat'],
              ['schoenmaat', 'Schoenmaat'],
              ['bhMaat', 'BH-maat'],
              ['borstomtrek', 'Borstomtrek'],
              ['confectiemaat', 'Confectiemaat'],
              ['heupomtrek', 'Heupomtrek'],
              ['jeansmaat', 'Jeansmaat'],
              ['taille', 'Taille'],
              ['haarkleur', 'Haarkleur'],
              ['kleurOgen', 'Kleur ogen'],
            ] as const
          ).map(([key, lab]) => (
            <div key={key}>
              <label className={labelClass()}>{lab}</label>
              <input
                className={fieldClass()}
                value={sheet[key]}
                onChange={(e) => setSheet((s) => ({ ...s, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <div>
            <label className={labelClass()}>Over mij</label>
            <textarea
              className={`${fieldClass()} min-h-[64px]`}
              value={sheet.overMij}
              onChange={(e) => setSheet((s) => ({ ...s, overMij: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass()}>Ervaring</label>
            <textarea
              className={`${fieldClass()} min-h-[56px]`}
              value={sheet.ervaringen}
              onChange={(e) => setSheet((s) => ({ ...s, ervaringen: e.target.value }))}
            />
          </div>
        </div>
      </ProfileSection>

      <ProfileSection title="Social media" complete={sectionSocialOk}>
        <div className="grid gap-x-2 gap-y-1.5 sm:grid-cols-2">
          <div>
            <label className={labelClass()}>Instagram</label>
            <input
              className={fieldClass()}
              value={sheet.instagram}
              onChange={(e) => setSheet((s) => ({ ...s, instagram: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass()}>Facebook</label>
            <input
              className={fieldClass()}
              value={sheet.facebook}
              onChange={(e) => setSheet((s) => ({ ...s, facebook: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()}>TikTok</label>
            <input
              className={fieldClass()}
              value={sheet.tiktok}
              onChange={(e) => setSheet((s) => ({ ...s, tiktok: e.target.value }))}
            />
          </div>
        </div>
      </ProfileSection>

      <ProfileSection title="Beschikbaarheid" complete={sheet.beschikbaar.length > 0}>
        <div className="grid gap-1 sm:grid-cols-2">
          {BESCHIKBAAR_OPTS.map((opt) => {
            const on = sheet.beschikbaar.includes(opt);
            return (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-2 border px-2 py-1.5 text-xs leading-snug sm:px-2.5 ${
                  on ? 'border-burgundy bg-burgundy/10' : 'border-line bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setSheet((s) => ({
                      ...s,
                      beschikbaar: on ? s.beschikbaar.filter((x) => x !== opt) : [...s.beschikbaar, opt],
                    }))
                  }
                />
                {BESCHIKBAAR_LABEL[opt] ?? opt}
              </label>
            );
          })}
        </div>
      </ProfileSection>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="border border-ink bg-ink px-3 py-1 text-[10px] font-bold uppercase leading-none text-white hover:bg-ink/90"
        >
          Profiel opslaan
        </button>
      </div>
      {msg ? <p className="text-[11px] leading-tight text-muted">{msg}</p> : null}

      {premiumSection}
    </form>
  );
}
