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
};

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
    overMij: str(ms.overMij),
    ervaringen: str(ms.ervaringen),
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
    <div className="border border-zinc-300 bg-white">
      <div className="flex items-center justify-between border-b-2 border-burgundy bg-burgundy px-2 py-0.5">
        <h3 className="text-[10px] font-bold uppercase leading-none tracking-wide text-white">{title}</h3>
        {complete ? (
          <span className="text-[10px] font-bold text-white" aria-hidden>
            ✓
          </span>
        ) : null}
      </div>
      <div className="px-2 py-1.5 md:px-2.5 md:py-2">{children}</div>
    </div>
  );
}

function fieldClass() {
  return 'mt-0 w-full border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px] leading-tight text-ink outline-none focus:border-burgundy focus:ring-0';
}

function labelClass() {
  return 'mb-0 block text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-600';
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
  premiumSection,
}: {
  user: AuthUser;
  token: string;
  refreshMe: () => Promise<void>;
  editing: boolean;
  canReadMedia: boolean;
  canUploadMedia: boolean;
  media: ProfileMediaRow[];
  mediaBusy: boolean;
  uploadMedia: (f: File | null) => void;
  premiumSection: ReactNode;
}) {
  const [profile, setProfile] = useState({
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    phone: user.phone ?? '',
    bio: user.bio ?? '',
  });
  const [sheet, setSheet] = useState<SheetForm>(() => sheetFromUser(user.modelSheet ?? null, user.phone ?? ''));
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setProfile({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      bio: user.bio ?? '',
    });
  }, [user.firstName, user.lastName, user.phone, user.bio]);

  useEffect(() => {
    if (editing) {
      setSheet(sheetFromUser(user.modelSheet ?? null, user.phone ?? ''));
      setMsg('');
    }
  }, [editing, user.id, user.modelSheet, user.phone]);

  const images = useMemo(() => media.filter((a) => a.mimeType.startsWith('image/')), [media]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    setGalleryIndex(0);
  }, [images.length, user.id]);

  const mainImg = images[galleryIndex] ?? images[0];
  const geslachtLabel =
    sheet.geslacht.length > 0 ? sheet.geslacht.map((g) => (g === 'vrouw' ? 'vrouw' : 'man')).join(', ') : '—';
  const leeftijd = ageFromGeboorte(sheet.geboortedatum);

  const sectionContactOk = !!(sheet.straat && sheet.postcode && sheet.gemeente && sheet.land && sheet.gsmModel);
  const sectionModelOk = !!(sheet.lengte && sheet.maat && sheet.schoenmaat);
  const sectionSocialOk = !!(sheet.instagram || sheet.facebook || sheet.tiktok || sheet.overMij);

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
            bio: profile.bio,
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
    <div className="flex flex-col gap-0 border-b border-line py-1 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,120px)_1fr] sm:items-baseline sm:gap-2 sm:py-0.5">
      <dt className="text-[10px] font-semibold leading-tight text-muted">{label}</dt>
      <dd className="text-[11px] leading-tight text-ink">{value || '—'}</dd>
    </div>
  );

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start">
          {canReadMedia ? (
            <div className="space-y-2">
              {mainImg ? (
                <div className="border border-zinc-300 bg-white">
                  <img
                    src={`${getApiBase()}/media/public/${mainImg.thumbKey || mainImg.webpKey || mainImg.storageKey}`}
                    alt=""
                    className="aspect-[3/4] w-full object-cover"
                  />
                  {images.length > 1 ? (
                    <div className="flex items-center justify-between gap-1.5 border-t border-burgundy bg-burgundy px-1.5 py-0.5 text-white">
                      <button
                        type="button"
                        className="px-2 py-0.5 text-[11px] hover:bg-white/10"
                        aria-label="Vorige foto"
                        onClick={() => setGalleryIndex((i) => (i <= 0 ? images.length - 1 : i - 1))}
                      >
                        ‹
                      </button>
                      <span className="text-xs tabular-nums">
                        {galleryIndex + 1} / {images.length}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-0.5 text-[11px] hover:bg-white/10"
                        aria-label="Volgende foto"
                        onClick={() => setGalleryIndex((i) => (i >= images.length - 1 ? 0 : i + 1))}
                      >
                        ›
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center border border-dashed border-zinc-300 bg-zinc-50 text-center text-[11px] text-muted">
                  Nog geen foto&apos;s in je media-bibliotheek
                </div>
              )}
            </div>
          ) : null}

          <div className="min-w-0 space-y-2">
            <div className="border border-zinc-300 bg-white px-2 py-1.5">
              <h3 className="border-b border-burgundy pb-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-burgundy">
                Overzicht
              </h3>
              <dl className="mt-0.5">{row('Naam', [user.firstName, user.lastName].filter(Boolean).join(' '))}</dl>
              <dl>{row('E-mail', user.email)}</dl>
              <dl>{row('Telefoon', sheet.gsmModel || user.phone || '')}</dl>
              <dl>{row('Gemeente', sheet.gemeente)}</dl>
              <dl>
                {row('Leeftijd', leeftijd != null ? `${leeftijd} jaar` : sheet.geboortedatum ? sheet.geboortedatum : '—')}
              </dl>
              <dl>{row('Geslacht', geslachtLabel)}</dl>
            </div>

            <div className="border border-zinc-300 bg-white px-2 py-1.5">
              <h3 className="border-b border-burgundy pb-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-burgundy">
                Model info
              </h3>
              <dl className="mt-0.5">{row('Lengte', sheet.lengte ? `${sheet.lengte} cm` : '')}</dl>
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

        {canReadMedia && images.length > 0 ? (
          <div className="border border-zinc-300 bg-white px-2 py-1.5">
            <h3 className="border-b border-burgundy pb-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-burgundy">
              Galerij
            </h3>
            <p className="mt-0.5 text-[10px] leading-tight text-muted">{images.length} foto&apos;s</p>
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
              {images.map((a) => (
                <img
                  key={a.id}
                  src={`${getApiBase()}/media/public/${a.thumbKey || a.webpKey || a.storageKey}`}
                  alt=""
                  className="h-24 w-20 shrink-0 border border-zinc-300 object-cover"
                />
              ))}
            </div>
          </div>
        ) : null}

        {premiumSection}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-3">
      {canReadMedia ? (
        <ProfileSection title="Foto's" complete={images.length > 0}>
          <div className="flex flex-wrap gap-1.5">
            {canUploadMedia ? (
              <label className="cursor-pointer border border-ink bg-ink px-2.5 py-1 text-center text-[10px] font-bold uppercase leading-none text-white hover:bg-ink/90">
                {mediaBusy ? 'Uploaden…' : 'Bestand toevoegen'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => uploadMedia(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : null}
          </div>
          <p className="mt-1 text-[10px] leading-snug text-muted">
            Upload je portfoliofoto&apos;s hier. De eerste in de lijst kun je als hoofdbeeld gebruiken in je overzicht.
          </p>
          {images.length > 0 ? (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
              {images.map((a) => (
                <div key={a.id} className="w-28 shrink-0">
                  <img
                    src={`${getApiBase()}/media/public/${a.thumbKey || a.webpKey || a.storageKey}`}
                    alt=""
                    className="aspect-[3/4] w-full border border-zinc-300 object-cover"
                  />
                  <p className="mt-0.5 truncate text-[9px] leading-tight text-muted">{a.originalName}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 text-[11px] leading-tight text-muted">Nog geen foto&apos;s.</p>
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
          <div className="sm:col-span-2">
            <label className={labelClass()}>Geslacht</label>
            <div className="mt-0.5 flex flex-wrap gap-3">
              {(['vrouw', 'man'] as const).map((g) => {
                const on = sheet.geslacht.includes(g);
                return (
                  <label key={g} className="flex items-center gap-1.5 text-[11px] leading-tight">
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
          <div>
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
          <div>
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
      </ProfileSection>

      <ProfileSection title="Social media + ervaring" complete={sectionSocialOk}>
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
          <div className="sm:col-span-2">
            <label className={labelClass()}>Ervaring</label>
            <textarea
              className={`${fieldClass()} min-h-[56px]`}
              value={sheet.ervaringen}
              onChange={(e) => setSheet((s) => ({ ...s, ervaringen: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()}>Over mij</label>
            <textarea
              className={`${fieldClass()} min-h-[64px]`}
              value={sheet.overMij}
              onChange={(e) => setSheet((s) => ({ ...s, overMij: e.target.value }))}
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
                className={`flex cursor-pointer items-center gap-1.5 border px-1.5 py-0.5 text-[10px] leading-tight ${
                  on ? 'border-burgundy bg-burgundy/10' : 'border-zinc-300 bg-white'
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

      <div className="border border-zinc-300 bg-zinc-50 px-2 py-1.5">
        <label className={labelClass()}>Bio (kort, platform)</label>
        <textarea
          className={`${fieldClass()} min-h-[52px]`}
          value={profile.bio}
          onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
          placeholder="Korte bio voor opdrachten (optioneel)"
        />
      </div>

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
