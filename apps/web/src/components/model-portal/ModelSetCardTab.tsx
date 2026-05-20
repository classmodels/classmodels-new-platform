'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, getApiBase, publicMediaUrl } from '@/lib/api';
import type { ProfileMediaRow } from '@/components/model-portal/ModelPortalProfile';

const VERSO_COUNT = 4;

type SetCardDraft = {
  frontHeroAssetId: string | null;
  versoPhotoAssetIds: (string | null)[];
  status: string;
  noteFromModel: string | null;
  submittedAt: string | null;
  profile: { displayName: string; ageYears: number | null; stats: string[] };
};

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
    return 'De server deed te lang over de PDF (time-out). Probeer «PDF voorzijde» of «PDF achterzijde» apart, of minder grote foto’s.';
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

const AGENCY_PREVIEW = [
  'Class-Models',
  'Provinciebaan 3, 2235 Hulshout',
  'www.class-models.be',
  'info@class-models.be',
  'gsm +32 (0) 485 322 307',
];

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
  const [versoSlots, setVersoSlots] = useState<(string | null)[]>(Array.from({ length: VERSO_COUNT }, () => null));
  const [note, setNote] = useState('');

  const assetById = useMemo(() => new Map(media.map((m) => [m.id, m])), [media]);

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

  const validationHint = useMemo(() => {
    if (!heroId) return 'Klik een foto in het raster om je hoofdfoto te kiezen.';
    if (versoSlots.some((x) => !x)) return `Upload ${VERSO_COUNT} foto’s voor de achterzijde (in één keer).`;
    return null;
  }, [heroId, versoSlots]);

  const persistDraft = useCallback(async (): Promise<boolean> => {
    if (!token || !canUpload) return false;
    if (!heroId) {
      setBanner({ tone: 'err', text: 'Kies eerst een hoofdfoto (klik een foto hieronder).' });
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

  const pickHero = (assetId: string) => {
    setHeroId(assetId);
    setBanner({ tone: 'ok', text: 'Hoofdfoto gekozen — zie voorbeeld links.' });
  };

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
      setBanner({ tone: 'ok', text: 'ZIP gedownload (voorzijde staand + achterzijde liggend).' });
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
          : 'Ingediend opgeslagen; de e-mail naar het bureau kon niet worden verstuurd (controleer SMTP).',
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

  const onUploadVersoBatch = async (files: FileList | null) => {
    if (!files?.length || !canUpload) return;
    setBusy(true);
    setBanner(null);
    const picked = Array.from(files).slice(0, VERSO_COUNT);
    if (files.length > VERSO_COUNT) {
      setBanner({ tone: 'ok', text: `Alleen de eerste ${VERSO_COUNT} foto’s worden gebruikt.` });
    }
    try {
      const ids: (string | null)[] = Array.from({ length: VERSO_COUNT }, () => null);
      for (let i = 0; i < picked.length; i++) {
        const row = await uploadMedia(picked[i], { folderSlug: 'setkaarten' });
        if (row?.id) ids[i] = row.id;
      }
      setVersoSlots(ids);
      await reloadMedia();
      if (ids.every(Boolean)) {
        setBanner({ tone: 'ok', text: `${VERSO_COUNT} achterzijde-foto’s geüpload. Klik Opslaan concept.` });
      } else {
        setBanner({ tone: 'err', text: 'Niet alle foto’s konden worden geüpload.' });
      }
    } finally {
      setBusy(false);
    }
  };

  if (!token || !canRead) {
    return (
      <p className="text-sm text-muted">
        Je hebt geen toegang tot setkaarten of bent niet ingelogd. Vraag zo nodig{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.media.read</code> aan je beheerder.
      </p>
    );
  }

  const profileName = draft?.profile.displayName ?? 'NAAM MODEL';
  const profileNameUpper = profileName.trim().toUpperCase() || 'NAAM MODEL';
  const statEntries = draft?.profile.stats ?? [];
  const submitted = draft?.status === 'submitted';

  const heroAsset = heroId ? assetById.get(heroId) : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-cm border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm leading-relaxed text-zinc-800">
        <p className="font-semibold text-burgundy">Setkaart (composit)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-zinc-700">
          <li>Klik een foto voor de <strong>voorzijde</strong> (hoofdfoto).</li>
          <li>
            Upload <strong>{VERSO_COUNT} foto’s tegelijk</strong> voor de achterzijde.
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
          Laatste versie staat als <strong>ingediend</strong>
          {draft?.submittedAt ? ` (${new Date(draft.submittedAt).toLocaleString('nl-BE')})` : ''}. Bewaar opnieuw om een nieuw concept te starten.
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
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50">
          <span>Upload {VERSO_COUNT} foto&apos;s (achterzijde)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={!canUpload || mediaBusy || busy}
            onChange={(e) => {
              void onUploadVersoBatch(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void downloadRecto()}
          className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          PDF voorzijde
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void downloadVerso()}
          className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          PDF achterzijde
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void downloadZip()}
          className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Voorzijde (A5 staand)</p>
            <div className="mx-auto mt-2 w-full max-w-[280px] overflow-hidden rounded border border-zinc-200 bg-white shadow-sm">
              <div className="flex aspect-[148/210] flex-col">
                <p className="shrink-0 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-burgundy">
                  {profileNameUpper}
                </p>
                <div className="relative min-h-0 flex-1 bg-zinc-100">
                  {heroAsset ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbSrc(heroAsset)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-[200px] items-center justify-center px-4 text-center text-[10px] text-zinc-400">
                      Kies een hoofdfoto in het raster →
                    </div>
                  )}
                </div>
                <div className="shrink-0 space-y-0.5 px-3 py-3 text-center text-[7px] leading-snug text-zinc-600">
                  {AGENCY_PREVIEW.map((line, i) => (
                    <p key={line} className={i === 0 ? 'font-bold text-zinc-800' : ''}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Achterzijde (A5 liggend)</p>
            <div className="mt-2 overflow-hidden rounded border border-zinc-200 bg-white shadow-sm">
              <div className="flex aspect-[210/148]">
                <div className="grid min-w-0 flex-[1.15] grid-cols-2 grid-rows-2 gap-1 p-2">
                  {versoSlots.map((id, i) => (
                    <div key={i} className="overflow-hidden rounded bg-zinc-100">
                      {id && assetById.get(id) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbSrc(assetById.get(id)!)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[3/4] items-center justify-center text-[9px] text-zinc-400">
                          {i + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex w-[38%] shrink-0 flex-col justify-start border-l border-zinc-100 px-2 py-2 text-[8px] leading-snug text-zinc-800">
                  <p className="text-[9px] font-bold uppercase">NAAM: {profileNameUpper}</p>
                  <ul className="mt-2 space-y-0.5">
                    {statEntries.slice(0, 8).map((line, li) => (
                      <li key={li}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Bericht voor het bureau</label>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs"
              placeholder="Optioneel: opmerking bij je setkaart"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!canUpload}
            />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Kies hoofdfoto</p>
          <p className="mt-1 text-xs text-muted">Klik een foto — die verschijnt meteen op de voorzijde hiernaast.</p>
          <div className="mt-2 max-h-[480px] overflow-y-auto overscroll-contain rounded-lg border border-zinc-100 bg-zinc-50/50 p-2">
            <div className="flex flex-wrap gap-2">
              {media.slice(0, 80).map((a) => {
                const isHero = heroId === a.id;
                const onVerso = versoSlots.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`relative h-[118px] w-[88px] shrink-0 overflow-hidden rounded border-2 bg-white transition hover:border-burgundy/50 ${
                      isHero ? 'border-burgundy ring-2 ring-burgundy/30' : onVerso ? 'border-zinc-400' : 'border-zinc-200'
                    }`}
                    onClick={() => pickHero(a.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbSrc(a)} alt="" className="block h-full w-full object-cover" />
                    {isHero ? (
                      <span className="absolute bottom-0 left-0 right-0 bg-burgundy py-0.5 text-center text-[8px] font-bold uppercase text-white">
                        Hoofdfoto
                      </span>
                    ) : null}
                    {onVerso ? (
                      <span className="absolute left-0 top-0 rounded-br bg-zinc-700/85 px-1 text-[7px] font-bold text-white">
                        Achter
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          {media.length === 0 ? (
            <p className="mt-2 text-xs text-muted">
              Nog geen foto&apos;s in je profiel — upload {VERSO_COUNT} foto&apos;s via de knop hierboven.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
