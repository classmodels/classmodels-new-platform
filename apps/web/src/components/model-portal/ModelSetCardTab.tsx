'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminDownloadFile, adminFetch } from '@/lib/admin-api';
import { apiFetch, publicMediaUrl } from '@/lib/api';
import { goToExternalCheckout, paymentReturnOrigin } from '@/lib/storage';
import { getImpersonationAdminToken } from '@/lib/impersonation';
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
  setCardFreeOrder?: boolean;
  setCardPaid?: boolean;
  canSubmitWithoutPayment?: boolean;
  paymentRequired?: boolean;
  alreadySubmitted?: boolean;
  setCardAllowReorder?: boolean;
  profile: {
    displayName: string;
    ageYears: number | null;
    birthYear: string | null;
    beschikbaarLine: string;
    stats: string[];
    statEntries: StatEntry[];
    versoStatEntries: StatEntry[];
  };
};

const VERSO_SLOT_LABELS = ['Klein 1', 'Klein 2', 'Klein 3', 'Groot rechts'];

function draftSnapshot(heroId: string | null, verso: (string | null)[], note: string): string {
  return JSON.stringify({ heroId, verso, note: note.trim() });
}

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
  reloadMedia: () => Promise<ProfileMediaRow[]>;
  uploadMedia: (
    file: File | null,
    opts?: { folderSlug?: 'models' | 'tijdelijke-uploads' | 'setkaarten'; setAsProfilePhoto?: boolean },
  ) => Promise<{ id: string } | null>;
}) {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin') ?? false;
  const impersonationAdminToken = getImpersonationAdminToken();
  const actingAsAdmin = isAdmin || !!impersonationAdminToken;
  const adminApiToken = impersonationAdminToken ?? (isAdmin ? token : null);
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
  const [savedOnServer, setSavedOnServer] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<{ pct: number; label: string } | null>(null);

  const heroLocalRef = useRef<string | null>(null);
  const serverSnapshotRef = useRef('');

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
      const slots = slotsFromDraft(d.versoPhotoAssetIds);
      setVersoSlots(slots);
      setNote(d.noteFromModel ?? '');
      revokeHeroLocal();
      setVersoLocalUrls(Array.from({ length: VERSO_COUNT }, () => null));
      serverSnapshotRef.current = draftSnapshot(d.frontHeroAssetId, slots, d.noteFromModel ?? '');
      setSavedOnServer(!!d.frontHeroAssetId && slots.every((x) => !!x));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Kon setkaart niet laden.');
    }
  }, [token, canRead, revokeHeroLocal]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const snap = draftSnapshot(heroId, versoSlots, note);
    setSavedOnServer(snap === serverSnapshotRef.current && !!heroId && !versoSlots.some((x) => !x));
  }, [heroId, versoSlots, note]);

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
      const body = JSON.stringify({
        frontHeroAssetId: heroId,
        versoPhotoAssetIds: versoSlots,
        noteFromModel: note.trim() || null,
      });
      const updated =
        actingAsAdmin && adminApiToken && user?.id
          ? await adminFetch<SetCardDraft>(`/admin/set-card/users/${user.id}/draft`, adminApiToken, {
              method: 'PUT',
              body,
            })
          : await apiFetch<SetCardDraft>('/portal/model/set-card', {
              method: 'PUT',
              token,
              body,
            });
      setDraft(updated);
      setHeroId(updated.frontHeroAssetId);
      const slots = slotsFromDraft(updated.versoPhotoAssetIds);
      setVersoSlots(slots);
      const freshMedia = await reloadMedia();
      const freshById = new Map(freshMedia.map((m) => [m.id, m]));
      if (updated.frontHeroAssetId && freshById.has(updated.frontHeroAssetId)) {
        revokeHeroLocal();
      }
      setVersoLocalUrls((prev) =>
        prev.map((url, i) => {
          const id = slots[i];
          if (url && id && freshById.has(id)) URL.revokeObjectURL(url);
          return id && freshById.has(id) ? null : url;
        }),
      );
      serverSnapshotRef.current = draftSnapshot(updated.frontHeroAssetId, slots, note);
      setSavedOnServer(true);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Opslaan mislukt.';
      setBanner({ tone: 'err', text: parseApiErrorMessage(msg) });
      return false;
    }
  }, [
    token,
    canUpload,
    heroId,
    versoSlots,
    note,
    revokeHeroLocal,
    reloadMedia,
    actingAsAdmin,
    adminApiToken,
    user?.id,
  ]);

  const saveLocalToServer = async () => {
    if (!token || !canUpload) return;
    setBusy(true);
    setBanner(null);
    try {
      const ok = await persistDraft();
      if (ok) setBanner({ tone: 'ok', text: 'Setkaarten opgeslagen.' });
    } finally {
      setBusy(false);
    }
  };

  const startPayment = async () => {
    if (!token || !canUpload) return;
    setBusy(true);
    setBanner(null);
    try {
      const ok = await persistDraft();
      if (!ok) return;
      const res = await apiFetch<
        | { checkoutUrl: string }
        | { skipCheckout: true; reason: string; freeOrder?: boolean; paid?: boolean }
      >('/portal/model/set-card/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({ returnOrigin: paymentReturnOrigin() }),
      });
      if ('skipCheckout' in res && res.skipCheckout) {
        await load();
        setBanner({ tone: 'ok', text: res.reason });
        return;
      }
      if ('checkoutUrl' in res && res.checkoutUrl) {
        goToExternalCheckout(res.checkoutUrl);
        return;
      }
      setBanner({ tone: 'err', text: 'Geen betaallink ontvangen.' });
    } catch (e) {
      setBanner({ tone: 'err', text: e instanceof Error ? parseApiErrorMessage(e.message) : 'Betaling mislukt.' });
    } finally {
      setBusy(false);
    }
  };

  const toggleAllowReorder = async (allow: boolean) => {
    if (!adminApiToken || !user?.id) return;
    setBusy(true);
    setBanner(null);
    try {
      const updated = await adminFetch<SetCardDraft>('/admin/set-card/allow-reorder', adminApiToken, {
        method: 'PATCH',
        body: JSON.stringify({ userId: user.id, allow }),
      });
      setDraft(updated);
      setHeroId(updated.frontHeroAssetId);
      const slots = slotsFromDraft(updated.versoPhotoAssetIds);
      setVersoSlots(slots);
      setNote(updated.noteFromModel ?? '');
      serverSnapshotRef.current = draftSnapshot(updated.frontHeroAssetId, slots, updated.noteFromModel ?? '');
      setSavedOnServer(!!updated.frontHeroAssetId && slots.every((x) => !!x));
      setBanner({
        tone: 'ok',
        text: allow
          ? 'Tweede bestelling toegestaan — het model kan opnieuw opslaan en doorsturen.'
          : 'Tweede bestelling niet meer actief.',
      });
    } catch (e) {
      setBanner({ tone: 'err', text: e instanceof Error ? parseApiErrorMessage(e.message) : 'Kon niet bijwerken.' });
    } finally {
      setBusy(false);
    }
  };

  const adminDownloadZip = async () => {
    if (!adminApiToken || !actingAsAdmin || !user?.id) return;
    setBusy(true);
    try {
      const ok = await persistDraft();
      if (!ok) return;
      await adminDownloadFile(
        `/admin/set-card/users/${user.id}/preview.zip`,
        adminApiToken,
        'setkaart-preview.zip',
      );
    } catch (e) {
      setBanner({ tone: 'err', text: e instanceof Error ? e.message : 'Download mislukt.' });
    } finally {
      setBusy(false);
    }
  };

  const submitToBureau = async () => {
    if (!token || !canUpload) return;
    const confirmMsg = actingAsAdmin
      ? 'Setkaarten opnieuw naar Class-Models versturen (admin)? Het bureau ontvangt opnieuw een e-mail met de PDF.'
      : draft?.setCardAllowReorder
        ? 'Setkaarten definitief naar Class-Models versturen? (tweede bestelling toegestaan door het bureau)'
        : 'Setkaarten definitief naar Class-Models versturen? Dit kan als model maar één keer. Het bureau ontvangt een e-mail met uw PDF.';
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    setBanner(null);
    setSubmitProgress({ pct: 10, label: 'Setkaarten opslaan…' });
    try {
      const ok = await persistDraft();
      if (!ok) return;
      setSubmitProgress({ pct: 45, label: 'PDF maken…' });
      const r =
        actingAsAdmin && adminApiToken && user?.id
          ? await adminFetch<{ ok: true; mailed: boolean }>(
              `/admin/set-card/users/${user.id}/submit`,
              adminApiToken,
              { method: 'POST' },
            )
          : await apiFetch<{ ok: true; mailed: boolean }>('/portal/model/set-card/submit', {
              method: 'POST',
              token,
            });
      setSubmitProgress({ pct: 100, label: 'Verzonden' });
      await load();
      setBanner({
        tone: 'ok',
        text: r.mailed
          ? 'Setkaarten doorgestuurd — Class-Models heeft een e-mail met uw PDF ontvangen.'
          : 'Setkaarten doorgestuurd; e-mail naar bureau mislukt (SMTP). Het bureau ziet uw inzending wel in het systeem.',
      });
    } catch (e) {
      setBanner({
        tone: 'err',
        text: e instanceof Error ? parseApiErrorMessage(e.message) : 'Versturen mislukt.',
      });
    } finally {
      setBusy(false);
      setTimeout(() => setSubmitProgress(null), 1200);
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
        setBanner({ tone: 'ok', text: 'Hoofdfoto geüpload. Klik «Setkaarten opslaan» om te bewaren.' });
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
            ? `${VERSO_COUNT} foto’s geüpload (extra genegeerd). Klik «Setkaarten opslaan».`
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
  const birthYear = draft?.profile.birthYear ?? null;
  const beschikbaarLine = draft?.profile.beschikbaarLine?.trim() || '— (vul beschikbaarheid in je profiel in)';
  const versoStatRows = draft?.profile.versoStatEntries ?? [];
  const submitted = draft?.status === 'submitted' || draft?.alreadySubmitted === true;
  const allowReorder = draft?.setCardAllowReorder ?? false;
  const mayEditAfterSubmit = actingAsAdmin || allowReorder;
  const freeOrder = draft?.setCardFreeOrder ?? false;
  const paymentRequired = draft?.paymentRequired ?? true;
  const canSubmitPay = draft?.canSubmitWithoutPayment ?? false;
  const canSubmitNow =
    savedOnServer &&
    !validationHint &&
    canSubmitPay &&
    (!submitted || mayEditAfterSubmit);

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
            <strong>Hoofdfoto</strong> (voorzijde) + <strong>4 foto&apos;s</strong> achterzijde (zelfde formaat).
          </li>
          <li>
            <strong>Setkaarten opslaan</strong> — daarna blijven uw foto&apos;s staan na verversen.
          </li>
          <li>
            Indien nodig <strong>betalen (€175)</strong>, daarna <strong>één keer</strong> doorsturen naar Class-Models.
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

      {submitted && !mayEditAfterSubmit ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <strong>U heeft deze setkaarten al doorgestuurd</strong>
          {draft?.submittedAt ? ` (${new Date(draft.submittedAt).toLocaleString('nl-BE')})` : ''}. Voor wijzigingen: contacteer Class-Models.
        </p>
      ) : submitted && allowReorder && !actingAsAdmin ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
          Class-Models gaf toestemming voor een <strong>tweede bestelling</strong>. Pas uw foto&apos;s aan, sla op en stuur opnieuw door.
        </p>
      ) : submitted && actingAsAdmin ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
          Ingediend{draft?.submittedAt ? ` op ${new Date(draft.submittedAt).toLocaleString('nl-BE')}` : ''}. Als admin (bureau-modus) kunt u opnieuw doorsturen, opslaan of tweede bestelling toestaan.
        </p>
      ) : !savedOnServer && heroId && !versoSlots.some((x) => !x) ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Klik eerst <strong>Setkaarten opslaan</strong> voordat u kunt doorsturen naar het bureau.
        </p>
      ) : null}

      {submitProgress ? (
        <div className="rounded-lg border border-line bg-white p-3 space-y-2">
          <p className="text-xs font-medium text-ink">{submitProgress.label}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-burgundy transition-all duration-500"
              style={{ width: `${submitProgress.pct}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canUpload || busy || (submitted && !mayEditAfterSubmit)}
          onClick={() => void saveLocalToServer()}
          className="rounded-full bg-burgundy px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-burgundyDeep disabled:opacity-50"
        >
          Setkaarten opslaan
        </button>
        {freeOrder ? (
          <p className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            U kunt deze setkaarten <strong>gratis bestellen</strong> (inbegrepen in de try-out modeshow).
          </p>
        ) : paymentRequired ? (
          <button
            type="button"
            disabled={!canUpload || busy}
            onClick={() => void startPayment()}
            className="rounded-full bg-burgundy px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-burgundyDeep disabled:opacity-50"
          >
            Betaal €175 (Mollie)
          </button>
        ) : (
          <p className="text-xs text-emerald-800">Betaling ontvangen — u kunt nu versturen.</p>
        )}
        <button
          type="button"
          disabled={!canUpload || busy || !canSubmitNow}
          title={
            !savedOnServer
              ? 'Sla eerst op'
              : submitted && !mayEditAfterSubmit
                ? 'Al doorgestuurd'
                : paymentRequired && !canSubmitPay
                  ? 'Eerst betalen'
                  : undefined
          }
          onClick={() => void submitToBureau()}
          className="rounded-full border border-burgundy bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-burgundy hover:bg-burgundy/10 disabled:opacity-50"
        >
          {submitted && actingAsAdmin ? 'Opnieuw doorsturen (admin)' : 'Verstuur naar Class-Models'}
        </button>
        {actingAsAdmin && adminApiToken ? (
          <>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs text-sky-950">
              <input
                type="checkbox"
                className="rounded border-sky-400"
                checked={allowReorder}
                disabled={busy}
                onChange={(e) => void toggleAllowReorder(e.target.checked)}
              />
              <span>
                <strong>Tweede bestelling toestaan</strong> voor dit model (vink uit na gebruik)
              </span>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void adminDownloadZip()}
              className="rounded-full border border-zinc-400 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Admin: download PDF
            </button>
          </>
        ) : null}
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
            <div className="flex aspect-[148/210] flex-col px-3">
              <hr className="mt-3 border-zinc-400" />
              <p className="shrink-0 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-burgundy">
                {profileNameUpper}
              </p>
              <hr className="border-zinc-400" />
              <div className="relative flex min-h-0 flex-1 items-center justify-center bg-white py-2">
                {heroPreviewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroPreviewSrc} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <p className="px-2 text-center text-[10px] text-zinc-400">Upload hoofdfoto</p>
                )}
              </div>
              <hr className="border-zinc-400" />
              <div className="shrink-0 py-2 text-center text-[6.5px] leading-snug text-zinc-600">
                <p className="font-bold text-zinc-800">{FOOTER_PREVIEW[0]}</p>
                <p className="mt-0.5">{FOOTER_PREVIEW[1]}</p>
              </div>
              <hr className="mb-3 border-zinc-400" />
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

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: VERSO_COUNT }, (_, i) => (
              <div
                key={i}
                className={`space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50/80 p-2 ${i === 3 ? 'sm:col-span-2' : ''}`}
              >
                <p className="text-[10px] font-bold text-zinc-500">{VERSO_SLOT_LABELS[i]}</p>
                <div
                  className={`overflow-hidden rounded bg-white ${i === 3 ? 'aspect-[4/5] max-h-40' : 'aspect-[78/118]'}`}
                >
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
            <div className="aspect-[210/148] w-full overflow-hidden">
              <div
                className="origin-top-left font-serif"
                style={{ width: '595px', height: '419px', transform: 'scale(0.52)', transformOrigin: 'top left' }}
              >
                {/* Zelfde zones als PDF: maten linksboven, 3 foto’s linksonder, grote foto rechts */}
                <div className="relative box-border" style={{ width: 595, height: 419, padding: '12px 20px' }}>
                  <div
                    className="absolute overflow-hidden"
                    style={{ left: 20, width: 258, top: 12, bottom: 52 + 118 + 6 }}
                  >
                    <p className="text-[10px] font-bold text-[#750f1a]">MODEL INFO</p>
                    <hr className="my-1 border-[#750f1a]" />
                    <ul className="rounded text-[6.5px]">
                      {versoStatRows.map((e, idx) => (
                        <li
                          key={e.label}
                          className={`flex justify-between gap-1 px-1.5 py-[2px] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fdf5f6]'}`}
                        >
                          <span className="text-zinc-500">{e.label}:</span>
                          <span className="font-medium text-zinc-800">{e.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="absolute flex shrink-0" style={{ left: 20, bottom: 52, height: 118, gap: 12 }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="overflow-hidden bg-white" style={{ width: 78, height: 118 }}>
                        {versoPreviewSrc(i) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={versoPreviewSrc(i)!} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-zinc-100 text-[10px] text-zinc-300">
                            {i + 1}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div
                    className="absolute overflow-hidden bg-white"
                    style={{ left: 326, right: 20, top: 12, bottom: 52 }}
                  >
                    {versoPreviewSrc(3) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={versoPreviewSrc(3)!} alt="" className="h-full w-full object-contain object-center" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-zinc-100 text-[10px] text-zinc-300">
                        Grote foto
                      </div>
                    )}
                  </div>
                  <div
                    className="absolute flex justify-between text-[7px] text-zinc-600"
                    style={{ left: 326, right: 20, bottom: 42 }}
                  >
                    <span>geboortejaar</span>
                    <span>{birthYear ?? '—'}</span>
                  </div>
                  <div
                    className="absolute text-[7.5px] leading-snug text-[#750f1a]"
                    style={{ left: 20, right: 20, bottom: 12, height: 40 }}
                  >
                    <p className="font-bold">Beschikbaar voor</p>
                    <hr className="my-0.5 border-[#750f1a]/70" />
                    <p>{beschikbaarLine}</p>
                    <hr className="mt-0.5 border-[#750f1a]/70" />
                  </div>
                </div>
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
