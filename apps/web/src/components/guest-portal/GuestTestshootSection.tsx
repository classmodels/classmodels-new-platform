'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getApiBase, publicMediaUrl } from '@/lib/api';
import { CmText } from '@/components/CmText';
import { TESTSHOOT_PAGE } from '@/components/guest-portal/guest-portal-data';

type PublicPhoto = { id: string; thumbFile: string; fullFile: string };

type PublicModel = {
  id: string;
  name: string;
  downloadUnlocked: boolean;
  photos: PublicPhoto[];
};

const RADIO_GROUPS: {
  name: keyof FeedbackForm;
  label: string;
  options: string[];
}[] = [
  {
    name: 'ervaring',
    label: 'Hoe heeft u de testshoot ervaren?',
    options: ['Zeer positief', 'Positief', 'Neutraal', 'Negatief', 'Zeer negatief'],
  },
  {
    name: 'tevredenheid_fotos',
    label: 'Wat vond u van de ontvangen foto’s?',
    options: ['Zeer tevreden', 'Tevreden', 'Neutraal', 'Ontevreden', 'Zeer ontevreden'],
  },
  {
    name: 'ingeschreven',
    label: 'Heeft u zich ingeschreven bij ons bureau?',
    options: ['Ja', 'Nee'],
  },
  { name: 'druk', label: 'Heeft u druk ervaren om zich in te schrijven?', options: ['Ja', 'Nee'] },
  {
    name: 'ontvangst',
    label: 'Hoe bent u ontvangen bij ons?',
    options: ['Zeer vriendelijk', 'Vriendelijk', 'Neutraal', 'Onvriendelijk', 'Zeer onvriendelijk'],
  },
  {
    name: 'info',
    label: 'Heeft u voldoende en duidelijke informatie ontvangen?',
    options: ['Ja', 'Nee', 'Gedeeltelijk'],
  },
  {
    name: 'toekomst_contact',
    label: 'Mogen wij u in de toekomst nog contacteren?',
    options: ['Ja', 'Nee'],
  },
];

type FeedbackForm = {
  naam: string;
  voornaam: string;
  email: string;
  gsm: string;
  ervaring: string;
  tevredenheid_fotos: string;
  ingeschreven: string;
  druk: string;
  ontvangst: string;
  info: string;
  toekomst_contact: string;
  reden_nee_vrij: string;
  opmerkingen: string;
};

const emptyForm = (): FeedbackForm => ({
  naam: '',
  voornaam: '',
  email: '',
  gsm: '',
  ervaring: '',
  tevredenheid_fotos: '',
  ingeschreven: '',
  druk: '',
  ontvangst: '',
  info: '',
  toekomst_contact: '',
  reden_nee_vrij: '',
  opmerkingen: '',
});

function mediaUrl(file: string) {
  return publicMediaUrl(file);
}

async function postDownloadIntent(modelId: string): Promise<{ exp: number; sig: string }> {
  const res = await fetch(`${getApiBase()}/guest/testshoot/models/${modelId}/download-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (res.status === 403) {
    let msg = '';
    try {
      const j = (await res.json()) as { message?: string };
      msg = j.message ?? '';
    } catch {
      /* ignore */
    }
    if (msg === 'NEED_FEEDBACK') {
      const err = new Error('NEED_FEEDBACK') as Error & { code?: string };
      err.code = 'NEED_FEEDBACK';
      throw err;
    }
    throw new Error(msg || 'Download nog niet vrijgegeven');
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || 'Download mislukt');
  }
  return res.json() as Promise<{ exp: number; sig: string }>;
}

async function downloadZipFile(modelId: string, exp: number, sig: string, filenameBase: string) {
  const url = `${getApiBase()}/guest/testshoot/models/${modelId}/zip?e=${exp}&s=${encodeURIComponent(sig)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Download mislukt');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filenameBase.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'testshoot'}-fotos.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function GuestTestshootSection() {
  const [models, setModels] = useState<PublicModel[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalModel, setModalModel] = useState<PublicModel | null>(null);
  const [form, setForm] = useState<FeedbackForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    void apiFetch<PublicModel[]>('/guest/testshoot')
      .then(setModels)
      .catch((e: Error) => setLoadError(e.message || 'Laden mislukt'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runDownload = async (m: PublicModel) => {
    try {
      const { exp, sig } = await postDownloadIntent(m.id);
      await downloadZipFile(m.id, exp, sig, m.name);
      void load();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'NEED_FEEDBACK' || err.message === 'NEED_FEEDBACK') {
        setForm(emptyForm());
        setModalModel(m);
        return;
      }
      alert(err.message || 'Download mislukt');
    }
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalModel) return;
    if (form.ingeschreven === 'Nee' && !form.reden_nee_vrij.trim()) {
      alert('Vul de reden in bij “Nee” op ingeschreven.');
      return;
    }
    setSubmitting(true);
    try {
      const { exp, sig, modelId } = await apiFetch<{
        exp: number;
        sig: string;
        modelId: string;
      }>(`/guest/testshoot/models/${modalModel.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setModalModel(null);
      await downloadZipFile(modelId, exp, sig, modalModel.name);
      void load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Versturen mislukt');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleModels = (models ?? []).filter((m) => m.photos.length > 0);
  const hasAny = visibleModels.length > 0;

  return (
    <div
      className="tsr-root space-y-6 rounded-cm border border-[#eadfea] bg-gradient-to-br from-white via-[#fff9fb] to-[#f5f9ff] p-4 shadow-sm md:p-6"
      style={
        {
          ['--tsr-accent' as string]: '#ff4f95',
          ['--tsr-accent2' as string]: '#ff6da8',
          ['--tsr-line' as string]: '#eadfea',
        } as React.CSSProperties
      }
    >
      <div className="space-y-2">
        <CmText
          contentKey="portal.guest.testshoot.kicker"
          as="p"
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/80"
          fallback={TESTSHOOT_PAGE.kicker}
        />
        <CmText
          contentKey="portal.guest.testshoot.title"
          as="h2"
          className="font-serif text-xl font-semibold text-ink md:text-2xl"
          fallback={TESTSHOOT_PAGE.title}
        />
        <CmText
          contentKey="portal.guest.testshoot.intro"
          as="p"
          className="text-sm leading-relaxed text-muted"
          fallback={TESTSHOOT_PAGE.intro}
        />
        <p className="text-xs text-muted">
          <CmText contentKey="portal.guest.testshoot.backstage.before" as="span" fallback="Backstage: foto’s uploaden kan in de backoffice onder " />
          <span className="font-medium text-ink">
            <CmText contentKey="portal.guest.testshoot.backstage.path" as="span" fallback="Admin → Testshoot" />
          </span>
          <CmText contentKey="portal.guest.testshoot.backstage.after" as="span" fallback=" (rechten: testshoot beheren)." />
        </p>
      </div>

      {loadError && (
        <p className="rounded-cm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>
      )}
      {!models && !loadError && (
        <CmText contentKey="portal.guest.testshoot.loading" as="p" className="text-sm text-muted" fallback="Laden…" />
      )}
      {models && !hasAny && (
        <CmText
          contentKey="portal.guest.testshoot.empty"
          as="p"
          className="text-sm text-muted"
          fallback="Nog geen testshoot-foto’s om te tonen. Kom later terug."
        />
      )}

      <div className="space-y-8">
        {visibleModels.map((m) => (
          <section
            key={m.id}
            className="rounded-cm border border-[#eadfea] bg-gradient-to-br from-[#fff5f8]/90 via-white to-[#f3f8ff]/90 p-4 shadow-[0_12px_40px_rgba(52,38,64,0.06)] md:p-5"
          >
            <h3 className="border-b border-[#eadfea] bg-gradient-to-r from-[#fde8f0] to-[#eef6ff] px-3 py-2 font-serif text-lg font-semibold text-ink">
              {m.name}
            </h3>
            <div className="mt-4 flex flex-wrap gap-3">
              {m.photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="h-[132px] w-[90px] shrink-0 overflow-hidden border border-[#eadfea] bg-white shadow-sm outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#ff4f95]/40 md:h-[140px] md:w-[96px]"
                  onClick={() => setPreviewUrl(mediaUrl(p.fullFile))}
                  aria-label="Vergroot foto"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(p.thumbFile)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void runDownload(m)}
                className="rounded-cm bg-gradient-to-br from-[#ff4f95] to-[#ff6da8] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
              >
                Download alle foto’s
              </button>
              {m.downloadUnlocked && (
                <span className="rounded-full border border-[#eadfea] bg-white/90 px-3 py-1 text-xs font-semibold text-muted">
                  Feedback ontvangen — zip zonder formulier (tot de eerste geslaagde download verdwijnen de foto’s
                  hier)
                </span>
              )}
            </div>
          </section>
        ))}
      </div>

      {previewUrl && (
        <button
          type="button"
          className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-[#f6e7ef]/85 p-4 backdrop-blur-sm"
          aria-label="Sluit vergroting"
          onClick={() => setPreviewUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="max-h-[92vh] max-w-full border border-[#eadfea] bg-white shadow-2xl" />
        </button>
      )}

      {modalModel && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#f6e7ef]/85 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-labelledby="tsr-feedback-title"
        >
          <div className="relative max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-cm border border-[#eadfea] bg-white p-4 shadow-xl md:p-6">
            <button
              type="button"
              className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-cm bg-gradient-to-br from-[#ff4f95] to-[#ff6da8] text-xl font-bold text-white shadow-md hover:opacity-95"
              onClick={() => setModalModel(null)}
              aria-label="Sluiten"
            >
              ×
            </button>
            <h2 id="tsr-feedback-title" className="pr-12 font-serif text-lg font-semibold text-ink md:text-xl">
              Feedback — {modalModel.name}
            </h2>
            <p className="mt-2 text-sm text-muted">
              Vul het formulier in; daarna start automatisch de download van alle foto’s als zip. Na een geslaagde
              download verdwijnen ze van deze pagina.
            </p>
            <form className="mt-5 space-y-4" onSubmit={(e) => void submitFeedback(e)}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-bold text-ink">
                  Naam *
                  <input
                    required
                    className="mt-1 w-full rounded-cm border border-[#eadfea] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ff4f95]/25"
                    value={form.naam}
                    onChange={(e) => setForm((f) => ({ ...f, naam: e.target.value }))}
                  />
                </label>
                <label className="block text-xs font-bold text-ink">
                  Voornaam *
                  <input
                    required
                    className="mt-1 w-full rounded-cm border border-[#eadfea] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ff4f95]/25"
                    value={form.voornaam}
                    onChange={(e) => setForm((f) => ({ ...f, voornaam: e.target.value }))}
                  />
                </label>
                <label className="block text-xs font-bold text-ink">
                  E-mailadres *
                  <input
                    required
                    type="email"
                    className="mt-1 w-full rounded-cm border border-[#eadfea] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ff4f95]/25"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </label>
                <label className="block text-xs font-bold text-ink">
                  Telefoonnummer *
                  <input
                    required
                    className="mt-1 w-full rounded-cm border border-[#eadfea] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ff4f95]/25"
                    value={form.gsm}
                    onChange={(e) => setForm((f) => ({ ...f, gsm: e.target.value }))}
                  />
                </label>
              </div>

              {RADIO_GROUPS.map((g) => (
                <fieldset key={g.name} className="rounded-cm border border-[#eadfea] bg-[#fdf8fb] p-3 md:p-4">
                  <legend className="px-1 text-sm font-bold text-ink">{g.label} *</legend>
                  <div className="mt-2 space-y-2">
                    {g.options.map((opt) => (
                      <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                        <input
                          type="radio"
                          name={g.name}
                          value={opt}
                          required
                          className="accent-[#ff4f95]"
                          checked={form[g.name] === opt}
                          onChange={() => setForm((f) => ({ ...f, [g.name]: opt }))}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                  {g.name === 'ingeschreven' && form.ingeschreven === 'Nee' && (
                    <label className="mt-3 block border border-dashed border-[#ff4f95]/40 bg-white/80 p-2 text-xs font-bold text-ink">
                      Indien nee, wat is hiervoor de reden? *
                      <input
                        required
                        className="mt-1 w-full rounded-cm border border-[#eadfea] px-2 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-[#ff4f95]/25"
                        value={form.reden_nee_vrij}
                        onChange={(e) => setForm((f) => ({ ...f, reden_nee_vrij: e.target.value }))}
                      />
                    </label>
                  )}
                </fieldset>
              ))}

              <label className="block text-xs font-bold text-ink">
                Opmerkingen / suggesties
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-cm border border-[#eadfea] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ff4f95]/25"
                  value={form.opmerkingen}
                  onChange={(e) => setForm((f) => ({ ...f, opmerkingen: e.target.value }))}
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-cm border border-[#cf4f82] bg-white px-4 py-2 text-sm font-semibold text-[#cf4f82] hover:bg-[#fff5f8]"
                  onClick={() => setModalModel(null)}
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-cm bg-gradient-to-br from-[#ff4f95] to-[#ff6da8] px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Bezig…' : 'Verstuur en download foto’s'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
