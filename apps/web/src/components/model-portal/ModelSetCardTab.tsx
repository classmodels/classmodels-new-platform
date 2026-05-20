'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, getApiBase, publicMediaUrl } from '@/lib/api';
import type { ProfileMediaRow } from '@/components/model-portal/ModelPortalProfile';

type SetCardDraft = {
  frontHeroAssetId: string | null;
  versoPhotoAssetIds: (string | null)[];
  status: string;
  noteFromModel: string | null;
  submittedAt: string | null;
  profile: { displayName: string; ageYears: number | null; stats: string[] };
};

type PhotoTarget = 'hero' | 'verso';

function thumbSrc(a: ProfileMediaRow): string {
  const key = a.publicKey ?? a.thumbKey ?? a.webpKey ?? a.storageKey;
  return publicMediaUrl(key);
}

function slotsFromDraft(ids: (string | null)[]): (string | null)[] {
  return [0, 1, 2, 3, 4].map((i) => ids[i] ?? null);
}

function parseApiErrorMessage(raw: string): string {
  const t = raw.trim();
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
  const [versoSlots, setVersoSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [note, setNote] = useState('');
  const [activeVersoSlot, setActiveVersoSlot] = useState(0);
  const [photoTarget, setPhotoTarget] = useState<PhotoTarget>('hero');

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
    if (!heroId) return 'Kies een hoofdfoto: zet de schakelaar op «Voorzijde» en klik een foto hieronder.';
    if (versoSlots.some((x) => !x)) return 'Vul alle 5 vakken op de achterzijde in.';
    return null;
  }, [heroId, versoSlots]);

  const persistDraft = useCallback(async (): Promise<boolean> => {
    if (!token || !canUpload) return false;
    if (!heroId) {
      setBanner({ tone: 'err', text: 'Kies eerst een hoofdfoto (schakelaar «Voorzijde», dan een foto). Klik daarna Opslaan concept.' });
      setPhotoTarget('hero');
      return false;
    }
    if (versoSlots.some((x) => !x)) {
      setBanner({ tone: 'err', text: 'Vul alle 5 foto-vakken op de achterzijde in.' });
      setPhotoTarget('verso');
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

  const assignPhoto = (assetId: string) => {
    if (photoTarget === 'hero') {
      setHeroId(assetId);
      setBanner({ tone: 'ok', text: 'Hoofdfoto gekozen. Klik Opslaan concept om te bewaren.' });
      return;
    }
    setVersoSlots((prev) => {
      const next = [...prev];
      next[activeVersoSlot] = assetId;
      return next;
    });
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

  const openPreviewPdf = async () => {
    if (!token || !canRead) return;
    setBusy(true);
    setBanner(null);
    try {
      const ok = await persistDraft();
      if (!ok) return;
      const res = await fetch(`${getApiBase()}/portal/model/set-card/preview.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(parseApiErrorMessage(t || res.statusText));
      }
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
    } catch (e) {
      setBanner({
        tone: 'err',
        text: e instanceof Error ? e.message : 'PDF kon niet worden geladen.',
      });
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

  const onUploadSetkaart = async (file: File | null) => {
    if (!file) return;
    const row = await uploadMedia(file, { folderSlug: 'setkaarten' });
    if (row?.id) {
      if (!heroId) {
        setHeroId(row.id);
        setBanner({ tone: 'ok', text: 'Foto geüpload en als hoofdfoto gezet. Klik Opslaan concept.' });
      } else {
        assignPhoto(row.id);
      }
    }
  };

  const clearVersoSlot = (idx: number) => {
    setVersoSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const moveSlot = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j > 4) return;
    setVersoSlots((prev) => {
      const next = [...prev];
      const t = next[idx];
      next[idx] = next[j];
      next[j] = t;
      return next;
    });
    setActiveVersoSlot(j);
  };

  if (!token || !canRead) {
    return (
      <p className="text-sm text-muted">
        Je hebt geen toegang tot setkaarten of bent niet ingelogd. Vraag zo nodig{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.media.read</code> aan je beheerder.
      </p>
    );
  }

  const profileName = draft?.profile.displayName ?? '…';
  const profileAge = draft?.profile.ageYears != null ? `${draft.profile.ageYears} jaar` : '—';
  const submitted = draft?.status === 'submitted';

  return (
    <div className="space-y-6">
      <div className="rounded-cm border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm leading-relaxed text-zinc-800">
        <p className="font-semibold text-burgundy">Setkaart (composit)</p>
        <p className="mt-1 text-xs text-zinc-700">
          <strong>Stap 1:</strong> kies een hoofdfoto (voorzijde). <strong>Stap 2:</strong> vul 5 vakken op de achterzijde.
          <strong> Stap 3:</strong> Opslaan concept, daarna PDF bekijken of versturen.
        </p>
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
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50">
          <span>Foto uploaden (setkaarten)</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={!canUpload || mediaBusy || busy}
            onChange={(e) => void onUploadSetkaart(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="button"
          disabled={!canUpload || busy}
          onClick={() => void saveLocalToServer()}
          className="rounded-full bg-burgundy px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-burgundyDeep disabled:opacity-50"
        >
          Opslaan concept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void openPreviewPdf()}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          PDF bekijken
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

      <div
        className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-0.5 text-xs font-semibold"
        role="group"
        aria-label="Waar foto's naartoe gaan"
      >
        <button
          type="button"
          onClick={() => setPhotoTarget('hero')}
          className={`rounded-full px-4 py-1.5 transition ${
            photoTarget === 'hero' ? 'bg-burgundy text-white shadow-sm' : 'text-zinc-700 hover:bg-white'
          }`}
        >
          Voorzijde (hoofdfoto)
        </button>
        <button
          type="button"
          onClick={() => setPhotoTarget('verso')}
          className={`rounded-full px-4 py-1.5 transition ${
            photoTarget === 'verso' ? 'bg-burgundy text-white shadow-sm' : 'text-zinc-700 hover:bg-white'
          }`}
        >
          Achterzijde vak {activeVersoSlot + 1}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Hoofdfoto (voorzijde)</p>
            {heroId ? (
              <button
                type="button"
                onClick={() => setHeroId(null)}
                className="mt-1 text-[11px] text-zinc-500 underline hover:text-zinc-800"
              >
                Wis hoofdfoto
              </button>
            ) : (
              <p className="mt-1 text-[11px] text-amber-800">
                Zet de schakelaar op «Voorzijde» en klik een foto in het raster hieronder.
              </p>
            )}
            <button
              type="button"
              onClick={() => setPhotoTarget('hero')}
              className={`mt-2 block w-full max-w-md overflow-hidden rounded-cm border-2 bg-zinc-100 text-left transition ${
                photoTarget === 'hero' ? 'border-burgundy ring-2 ring-burgundy/25' : 'border-zinc-200 hover:border-burgundy/40'
              }`}
            >
              <div className="aspect-[210/148] max-h-56 w-full">
                {heroId && assetById.get(heroId) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbSrc(assetById.get(heroId)!)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center text-xs text-muted">
                    <span className="font-semibold text-burgundy">Nog geen hoofdfoto</span>
                    <span>Klik hieronder een foto (modus Voorzijde)</span>
                  </div>
                )}
              </div>
            </button>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Vijf foto&apos;s (achterzijde)</p>
            <p className="mt-1 text-xs text-muted">
              Zet de schakelaar op «Achterzijde», klik een vak (1–5), daarna een foto in het raster.
            </p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {versoSlots.map((id, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveVersoSlot(idx);
                      setPhotoTarget('verso');
                    }}
                    className={`relative aspect-[3/4] w-full overflow-hidden rounded border-2 bg-zinc-50 ${
                      photoTarget === 'verso' && activeVersoSlot === idx
                        ? 'border-burgundy ring-2 ring-burgundy/30'
                        : 'border-zinc-200'
                    }`}
                  >
                    {id && assetById.get(id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbSrc(assetById.get(id)!)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-zinc-400">
                        {idx + 1}
                      </span>
                    )}
                  </button>
                  <div className="flex justify-center gap-0.5">
                    <button
                      type="button"
                      className="rounded bg-zinc-200 px-1 text-[10px] font-bold text-zinc-700 disabled:opacity-30"
                      disabled={idx === 0}
                      onClick={() => moveSlot(idx, -1)}
                      aria-label="Naar links"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="rounded bg-zinc-200 px-1 text-[10px] font-bold text-zinc-700 disabled:opacity-30"
                      onClick={() => moveSlot(idx, 1)}
                      disabled={idx === 4}
                      aria-label="Naar rechts"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      className="rounded bg-red-100 px-1 text-[10px] font-bold text-red-800"
                      onClick={() => clearVersoSlot(idx)}
                      aria-label="Wissen"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
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

        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Voorbeeld (schets)</p>
            <p className="mt-1 text-xs text-muted">
              Dit benadert de lay-out; de echte PDF gebruikt scherpere typografie en marges.
            </p>
            <div className="mt-3 space-y-3 rounded-cm border border-zinc-200 bg-white p-3 shadow-sm">
              <div className="aspect-[210/148] overflow-hidden rounded border border-zinc-100 bg-zinc-50">
                <div className="flex h-full gap-2 p-2">
                  <div className="relative min-w-0 flex-[1.1] overflow-hidden rounded bg-zinc-200">
                    {heroId && assetById.get(heroId) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbSrc(assetById.get(heroId)!)} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex w-[28%] shrink-0 flex-col justify-between py-1 text-[9px] leading-tight">
                    <div>
                      <p className="font-bold uppercase tracking-wide text-burgundy">{profileName}</p>
                      <p className="mt-1 text-zinc-600">{profileAge}</p>
                    </div>
                    <div className="border-t border-zinc-200 pt-1 text-[8px] text-zinc-500">
                      Class-Models · Provinciebaan 3 · class-models.be
                    </div>
                  </div>
                </div>
              </div>
              <div className="aspect-[210/148] overflow-hidden rounded border border-zinc-100 bg-zinc-50 p-2">
                <div className="grid h-full grid-cols-[1fr_1fr_1fr_26%] grid-rows-2 gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="overflow-hidden rounded bg-zinc-200">
                      {versoSlots[i] && assetById.get(versoSlots[i]!) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbSrc(assetById.get(versoSlots[i]!)!)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  ))}
                  <div className="row-span-2 overflow-hidden rounded bg-zinc-200">
                    {versoSlots[3] && assetById.get(versoSlots[3]!) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbSrc(assetById.get(versoSlots[3]!)!)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="overflow-hidden rounded bg-zinc-200">
                    {versoSlots[4] && assetById.get(versoSlots[4]!) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbSrc(assetById.get(versoSlots[4]!)!)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-col justify-start rounded border border-zinc-100 bg-white p-1.5 text-[8px] leading-snug text-zinc-800">
                    <p className="font-bold uppercase text-burgundy">{profileName}</p>
                    <ul className="mt-1 space-y-0.5">
                      {(draft?.profile.stats ?? []).slice(0, 8).map((line, li) => (
                        <li key={li}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-burgundy">Jouw foto&apos;s</p>
            <p className="mt-1 text-xs text-muted">
              {photoTarget === 'hero' ? (
                <span className="font-medium text-burgundy">Modus voorzijde:</span>
              ) : (
                <span className="font-medium text-burgundy">Modus achterzijde vak {activeVersoSlot + 1}:</span>
              )}{' '}
              klik een foto om die toe te wijzen.
            </p>
            <div className="mt-2 grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {media.map((a) => {
                const isHero = heroId === a.id;
                const inVerso = versoSlots.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`relative aspect-[3/4] overflow-hidden rounded border-2 bg-zinc-50 transition hover:border-burgundy/50 ${
                      isHero ? 'border-burgundy' : inVerso ? 'border-zinc-400' : 'border-zinc-200'
                    }`}
                    onClick={() => assignPhoto(a.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbSrc(a)} alt="" className="h-full w-full object-cover" />
                    {isHero ? (
                      <span className="absolute bottom-0 left-0 right-0 bg-burgundy/90 py-0.5 text-center text-[8px] font-bold uppercase text-white">
                        Voorzijde
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {media.length === 0 ? <p className="mt-2 text-xs text-muted">Nog geen foto&apos;s — upload hierboven.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
