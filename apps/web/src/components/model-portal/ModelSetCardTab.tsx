'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, getApiBase, publicMediaUrl } from '@/lib/api';
import type { ProfileMediaRow } from '@/components/model-portal/ModelPortalProfile';

const VERSO_COUNT = 4;

const FOOTER_PREVIEW = [
  'Class-Models  ·  Provinciebaan 3, 2235 Hulshout  ·  www.class-models.be',
  'info@class-models.be  ·  gsm +32 (0) 485 322 307',
];

type StatEntry = { label: string; value: string };

type SetCardDraft = {
  frontHeroAssetId: string | null;
  versoPhotoAssetIds: (string | null)[];
  status: string;
  noteFromModel: string | null;
  submittedAt: string | null;
  profile: {
    displayName: string;
    ageYears: number | null;
    birthYear: string | null;
    beschikbaarLine: string;
    stats: string[];
    statEntries: StatEntry[];
  };
};

const VERSO_SLOT_LABELS = ['Klein links 1', 'Klein links 2', 'Klein links 3', 'Groot rechts'];

function thumbSrc(a: ProfileMediaRow): string {
  const key = a.publicKey ?? a.thumbKey ?? a.webpKey ?? a.storageKey;
  return publicMediaUrl(key);
}

function slotsFromDraft(ids: (string | null)[]): (string | null)[] {
  return Array.from({ length: VERSO_COUNT }, (_, i) => ids[i] ?? null);
}

function parseApiErrorMessage(raw: string): string {
  const t = raw.trim();
  if (t.includes('504') || t.includes('Gateway Time-out') || t.includes('Temporary failure')) {
    return 'De server deed te lang over de PDF (time-out). Probeer «PDF voorzijde» of «PDF achterzijde» apart.';
  }
  if (t.includes('<!DOCTYPE') || t.includes('<html')) {
    return 'Serverfout (geen API-antwoord). Wacht op deploy of probeer later opnieuw.';
  }
  if (!t.startsWith('{')) return t || 'Er ging iets mis.';
  try {
    const j = JSON.parse(t) as { message?: string | string[] };
    const m = j.message;
    if (Array.isArray(m)) return m.join(' ');
    if (typeof m === 'string') return m;
  } catch {
    /* fall through */
  }
  return t;
}

async function downloadPdf(token: string, path: string, filename: string): Promise<void> {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(parseApiErrorMessage(t || res.statusText));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ModelSetCardTab({
  token,
  canRead,
  canUpload,
  media,
  mediaBusy,
  reloadMedia,
  uploadMedia,
}: {
  token: string | null;
  canRead: boolean;
  canUpload: boolean;
  media: ProfileMediaRow[];
  mediaBusy: boolean;
  reloadMedia: () => void;
  uploadMedia: (
    file: File | null,
    opts?: { folderSlug?: 'models' | 'tijdelijke-uploads' | 'setkaarten'; setAsProfilePhoto?: boolean },
  ) => Promise<{ id: string } | null>;
}) {
  const [draft, setDraft] = useState<SetCardDraft | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const [heroId, setHeroId] = useState<string | null>(null);
  const [heroLocalUrl, setHeroLocalUrl] = useState<string | null>(null);
  const [versoSlots, setVersoSlots] = useState<(string | null)[]>(Array.from({ length: VERSO_COUNT }, () => null));
  const [versoLocalUrls, setVersoLocalUrls] = useState<(string | null)[]>(
    Array.from({ length: VERSO_COUNT }, () => null),
  );
  const [note, setNote] = useState('');

  const heroLocalRef = useRef<string | null>(null);

  const assetById = useMemo(() => new Map(media.map((m) => [m.id, m])), [media]);

  const revokeHeroLocal = useCallback(() => {
    if (heroLocalRef.current) {
      URL.revokeObjectURL(heroLocalRef.current);
      heroLocalRef.current = null;
    }
    setHeroLocalUrl(null);
  }, []);

  const load = useCallback(async () => {
    if (!token || !canRead) return;
    setLoadErr(null);
    try {
      const d = await apiFetch<SetCardDraft>('/portal/model/set-card', { token });
      setDraft(d);
      setHeroId(d.frontHeroAssetId);
      setVersoSlots(slotsFromDraft(d.versoPhotoAssetIds));
      setNote(d.noteFromModel ?? '');
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Kon setkaart niet laden.');
    }
  }, [token, canRead]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => revokeHeroLocal(), [revokeHeroLocal]);

  const validationHint = useMemo(() => {
    if (!heroId) return 'Upload een hoofdfoto van je computer (staande foto).';
    if (versoSlots.some((x) => !x)) return `Upload ${VERSO_COUNT} foto’s voor de achterzijde (los van de hoofdfoto).`;
    return null;
  }, [heroId, versoSlots]);

  const persistDraft = useCallback(async (): Promise<boolean> => {
    if (!token || !canUpload) return false;
    if (!heroId) {
      setBanner({ tone: 'err', text: 'Upload eerst een hoofdfoto.' });
      return false;
    }
    if (versoSlots.some((x) => !x)) {
      setBanner({ tone: 'err', text: `Upload ${VERSO_COUNT} foto’s voor de achterzijde.` });
      return false;
    }
    try {
      await apiFetch('/portal/model/set-card', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          frontHeroAssetId: heroId,
          versoPhotoAssetIds: versoSlots,
          noteFromModel: note.trim() || null,
        }),
      });
      await load();
      await reloadMedia();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Opslaan mislukt.';
      setBanner({ tone: 'err', text: parseApiErrorMessage(msg) });
      return false;
    }
  }, [token, canUpload, heroId, versoSlots, note, load, reloadMedia]);

  const saveLocalToServer = async () => {
    if (!token || !canUpload) return;
    setBusy(true);
    setBanner(null);
    try {
      const ok = await persistDraft();
      if (ok) setBanner({ tone: 'ok', text: 'Concept opgeslagen.' });
    } finally {
      setBusy(false);
    }
  };

  const downloadZip = async () => {
    if (!token || !canRead) return;
    setBusy(true);
    setBanner(null);
    try {
      const ok = await persistDraft();
      if (!ok) return;
      await downloadPdf(token, '/portal/model/set-card/preview.zip', 'setkaart-preview.zip');
      setBanner({ tone: 'ok', text: 'ZIP gedownload.' });
    } catch (e) {
      setBanner({ tone: 'err', text: e instanceof Error ? e.message : 'Download mislukt.' });
    } finally {
      setBusy(false);
    }
  };

  const downloadRecto = async () => {
    if (!token || !canRead) return;
    setBusy(true);
    setBanner(null);
    try {
      const ok = await persistDraft();
      if (!ok) return;
      await downloadPdf(token, '/portal/model/set-card/preview-recto.pdf', 'setkaart-voorzijde.pdf');
      setBanner({ tone: 'ok', text: 'Voorzijde gedownload (A5 staand).' });
    } catch (e) {
      setBanner({ tone: 'err', text: e instanceof Error ? e.message : 'Download mislukt.' });
    } finally {
      setBusy(false);
    }
  };

  const downloadVerso = async () => {
    if (!token || !canRead) return;
    setBusy(true);
    setBanner(null);
    try {
      const ok = await persistDraft();
      if (!ok) return;
      await downloadPdf(token, '/portal/model/set-card/preview-verso.pdf', 'setkaart-achterzijde.pdf');
      setBanner({ tone: 'ok', text: 'Achterzijde gedownload (A5 liggend).' });
    } catch (e) {
      setBanner({ tone: 'err', text: e instanceof Error ? e.message : 'Download mislukt.' });
    } finally {
      setBusy(false);
    }
  };

  const submitToBureau = async () => {
    if (!token || !canUpload) return;
    if (
      !window.confirm(
        'Setkaart naar het bureau versturen? Het bureau ontvangt een e-mail met je PDF (als SMTP actief is).',
      )
    )
      return;
    setBusy(true);
    setBanner(null);
    try {
      const ok = await persistDraft();
      if (!ok) return;
      const r = await apiFetch<{ ok: true; mailed: boolean }>('/portal/model/set-card/submit', {
        method: 'POST',
        token,
      });
      await load();
      setBanner({
        tone: 'ok',
        text: r.mailed
          ? 'Ingediend — het bureau heeft een e-mail met je PDF ontvangen.'
          : 'Ingediend opgeslagen; e-mail naar bureau mislukt (SMTP).',
      });
    } catch (e) {
      setBanner({
        tone: 'err',
        text: e instanceof Error ? parseApiErrorMessage(e.message) : 'Versturen mislukt.',
      });
    } finally {
      setBusy(false);
    }
  };

  const onUploadHero = async (file: File | null) => {
    if (!file || !canUpload) return;
    setBusy(true);
    setBanner(null);
    revokeHeroLocal();
    const local = URL.createObjectURL(file);
    heroLocalRef.current = local;
    setHeroLocalUrl(local);
    try {
      const row = await uploadMedia(file, { folderSlug: 'setkaarten' });
      if (row?.id) {
        setHeroId(row.id);
        setBanner({ tone: 'ok', text: 'Hoofdfoto geüpload. Klik Opslaan concept om te bewaren.' });
      } else {
        setHeroId(null);
        setBanner({ tone: 'err', text: 'Hoofdfoto uploaden mislukt.' });
      }
      await reloadMedia();
    } finally {
      setBusy(false);
    }
  };

  const onUploadVersoSlot = async (slotIndex: number, file: File | null) => {
    if (!file || !canUpload) return;
    setBusy(true);
    setBanner(null);
    const local = URL.createObjectURL(file);
    setVersoLocalUrls((prev) => {
      const next = [...prev];
      if (next[slotIndex]) URL.revokeObjectURL(next[slotIndex]!);
      next[slotIndex] = local;
      return next;
    });
    try {
      const row = await uploadMedia(file, { folderSlug: 'setkaarten' });
      if (row?.id) {
        setVersoSlots((prev) => {
          const next = [...prev];
          next[slotIndex] = row.id;
          return next;
        });
        setBanner({ tone: 'ok', text: `Foto ${slotIndex + 1} geüpload.` });
      }
      await reloadMedia();
    } finally {
      setBusy(false);
    }
  };

  const onUploadVersoBatch = async (files: FileList | null) => {
    if (!files?.length || !canUpload) return;
    setBusy(true);
    setBanner(null);
    const picked = Array.from(files).slice(0, VERSO_COUNT);
    try {
      for (let i = 0; i < picked.length; i++) {
        const file = picked[i];
        const local = URL.createObjectURL(file);
        setVersoLocalUrls((prev) => {
          const next = [...prev];
          if (next[i]) URL.revokeObjectURL(next[i]!);
          next[i] = local;
          return next;
        });
        const row = await uploadMedia(file, { folderSlug: 'setkaarten' });
        if (row?.id) {
          setVersoSlots((prev) => {
            const next = [...prev];
            next[i] = row.id;
            return next;
          });
        }
      }
      await reloadMedia();
      setBanner({
        tone: 'ok',
        text:
          files.length > VERSO_COUNT
            ? `${VERSO_COUNT} foto’s geüpload (extra genegeerd). Klik Opslaan concept.`
            : `${picked.length} achterzijde-foto’s geüpload.`,
      });
    } finally {
      setBusy(false);
    }
  };

  const clearVersoSlot = (idx: number) => {
    setVersoSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    setVersoLocalUrls((prev) => {
      const next = [...prev];
      if (next[idx]) URL.revokeObjectURL(next[idx]!);
      next[idx] = null;
      return next;
    });
  };

  const clearHero = () => {
    setHeroId(null);
    revokeHeroLocal();
  };

  if (!token || !canRead) {
    return (
      <p className="text-sm text-muted">
        Je hebt geen toegang tot setkaarten. Vraag zo nodig{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.media.read</code> aan je beheerder.
      </p>
    );
  }

  const profileNameUpper = (draft?.profile.displayName ?? 'NAAM MODEL').trim().toUpperCase() || 'NAAM MODEL';
  const statEntries = draft?.profile.statEntries ?? [];
  const birthYear = draft?.profile.birthYear ?? null;
  const beschikbaarLine = draft?.profile.beschikbaarLine ?? 'Kleding - Lingerie - modeshows -';
  const submitted = draft?.status === 'submitted';

  const heroAsset = heroId ? assetById.get(heroId) : undefined;
  const heroPreviewSrc = heroLocalUrl ?? (heroAsset ? thumbSrc(heroAsset) : null);

  const versoPreviewSrc = (idx: number): string | null => {
    if (versoLocalUrls[idx]) return versoLocalUrls[idx];
    const id = versoSlots[idx];
    if (!id) return null;
    const a = assetById.get(id);
    return a ? thumbSrc(a) : null;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-cm border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm leading-relaxed text-zinc-800">
        <p className="font-semibold text-burgundy">Setkaart (composit)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-zinc-700">
          <li>
            <strong>Hoofdfoto</strong> van je computer (staande foto, niets afgekapt op de PDF).
          </li>
          <li>
            <strong>4 foto&apos;s achterzijde:</strong> 3 klein links + 1 groot rechts (apart van hoofdfoto).
          </li>
          <li>
            <strong>Opslaan concept</strong>, daarna PDF downloaden of versturen.
          </li>
        </ol>
      </div>

      {loadErr ? <p className="text-sm text-red-700">{loadErr}</p> : null}
      {banner ? (
        <p className={`text-sm ${banner.tone === 'ok' ? 'text-emerald-800' : 'text-red-700'}`}>{banner.text}</p>
      ) : null}
      {validationHint && !banner ? (
        <p className="text-xs text-amber-800">{validationHint}</p>
      ) : null}

      {submitted ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          Laatste versie <strong>ingediend</strong>
          {draft?.submittedAt ? ` (${new Date(draft.submittedAt).toLocaleString('nl-BE')})` : ''}. Opslaan start een nieuw concept.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canUpload || busy}
          onClick={() => void saveLocalToServer()}
          className="rounded-full bg-burgundy px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-burgundyDeep disabled:opacity-50"
        >
          Opslaan concept
        </button>
        <button type="button" disabled={busy} onClick={() => void downloadRecto()} className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50">
          PDF voorzijde
        </button>
        <button type="button" disabled={busy} onClick={() => void downloadVerso()} className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50">
          PDF achterzijde
        </button>
        <button type="button" disabled={busy} onClick={() => void downloadZip()} className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50">
          ZIP (beide)
        </button>
        <button
          type="button"
          disabled={!canUpload || busy}
          onClick={() => void submitToBureau()}
          className="rounded-full border border-burgundy bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-burgundy hover:bg-burgundy/10 disabled:opacity-50"
        >
          Verstuur naar bureau
        </button>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Voorzijde */}
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Voorzijde (A5 staand)</p>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-full border border-burgundy bg-burgundy px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-burgundyDeep">
              Hoofdfoto van computer
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!canUpload || busy || mediaBusy}
                onChange={(e) => {
                  void onUploadHero(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </label>
            {heroId ? (
              <button
                type="button"
                className="rounded-full border border-zinc-300 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
                onClick={clearHero}
              >
                Wis hoofdfoto
              </button>
            ) : null}
          </div>

          <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded border border-zinc-200 bg-white shadow-sm">
            <div className="flex aspect-[148/210] flex-col">
              <p className="shrink-0 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-burgundy">
                {profileNameUpper}
              </p>
              <div className="relative flex min-h-0 flex-1 items-center justify-center bg-zinc-50 px-3 py-2">
                <div className="relative flex h-full w-full max-h-full max-w-full items-center justify-center border border-zinc-800 p-1">
                  <span className="pointer-events-none absolute left-0 top-0 h-2.5 w-2.5 border-l-2 border-t-2 border-zinc-800" />
                  <span className="pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 border-r-2 border-t-2 border-zinc-800" />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b-2 border-l-2 border-zinc-800" />
                  <span className="pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 border-b-2 border-r-2 border-zinc-800" />
                  {heroPreviewSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroPreviewSrc} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <p className="px-2 text-center text-[10px] text-zinc-400">Upload hoofdfoto</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 border-t border-zinc-100 px-2 py-2.5 text-center text-[6.5px] leading-snug text-zinc-600">
                <p className="font-bold text-zinc-800">{FOOTER_PREVIEW[0]}</p>
                <p className="mt-0.5">{FOOTER_PREVIEW[1]}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Achterzijde */}
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Achterzijde (A5 liggend)</p>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50">
              Upload 4 foto&apos;s tegelijk
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={!canUpload || busy || mediaBusy}
                onChange={(e) => {
                  void onUploadVersoBatch(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {Array.from({ length: VERSO_COUNT }, (_, i) => (
              <div key={i} className="space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50/80 p-2">
                <p className="text-[10px] font-bold text-zinc-500">{VERSO_SLOT_LABELS[i]}</p>
                <div className={`overflow-hidden rounded bg-white ${i === 3 ? 'aspect-[3/4]' : 'aspect-[3/4]'}`}>
                  {versoPreviewSrc(i) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={versoPreviewSrc(i)!} alt="" className="h-full w-full object-contain bg-zinc-100" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-zinc-300">—</div>
                  )}
                </div>
                <label className="flex cursor-pointer justify-center rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100">
                  Vervangen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!canUpload || busy || mediaBusy}
                    onChange={(e) => {
                      void onUploadVersoSlot(i, e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                  />
                </label>
                {versoSlots[i] ? (
                  <button
                    type="button"
                    className="w-full text-center text-[10px] text-red-700 underline"
                    onClick={() => clearVersoSlot(i)}
                  >
                    Wis
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded border border-zinc-200 bg-white shadow-sm">
            <div className="flex aspect-[210/148] flex-col">
              <div className="flex min-h-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-col border-r border-zinc-100 p-2">
                  <div className="relative border-x-2 border-burgundy/70 px-2 py-1.5">
                    <ul className="space-y-0.5 text-[7px] leading-tight text-zinc-900">
                      {statEntries.length > 0 ? (
                        statEntries.map((e) => (
                          <li key={e.label} className="flex justify-between gap-2">
                            <span>{e.label}</span>
                            <span className="font-medium">{e.value}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-zinc-400">Vul maten in je profiel in</li>
                      )}
                    </ul>
                  </div>
                  <div className="mt-auto grid grid-cols-3 gap-1 pt-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="aspect-[3/4] overflow-hidden rounded bg-zinc-100">
                        {versoPreviewSrc(i) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={versoPreviewSrc(i)!} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[8px] text-zinc-300">{i + 1}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex w-[48%] shrink-0 flex-col px-2 py-2">
                  <div className="relative min-h-0 flex-1 overflow-hidden rounded bg-zinc-100">
                    {versoPreviewSrc(3) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={versoPreviewSrc(3)!} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full min-h-[120px] items-center justify-center text-[9px] text-zinc-400">
                        Grote foto
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex justify-between text-[7px] text-zinc-600">
                    <span>geboortejaar</span>
                    <span className="font-medium text-zinc-900">{birthYear ?? '—'}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 border-t border-zinc-200 px-2 py-1.5 text-[6.5px] leading-snug text-zinc-800">
                <p>Beschikbaar voor</p>
                <hr className="my-0.5 border-zinc-300" />
                <p>{beschikbaarLine}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Bericht voor het bureau</label>
        <textarea
          className="mt-1 min-h-[72px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs"
          placeholder="Optioneel"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={!canUpload}
        />
      </div>
    </div>
  );
}
