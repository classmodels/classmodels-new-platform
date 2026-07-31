'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CmProgressOverlay } from '@/components/CmProgressOverlay';
import { useAuth } from '@/context/auth-context';
import { downloadProgressSublabel, downloadWithProgress, type DownloadProgressUpdate } from '@/lib/download-with-progress';
import { getApiBase, parseApiErrorBody, publicMediaUrl } from '@/lib/api';
import { TESTSHOOT_PAGE } from '@/components/guest-portal/guest-portal-data';

type Photo = { id: string; thumbFile: string; fullFile: string };
type ModelSlot = {
  id: string;
  name: string;
  downloadUnlocked: boolean;
  photos: Photo[];
};

type FeedbackForm = {
  naam: string;
  voornaam: string;
  email: string;
  gsm: string;
  ervaring: string;
  tevredenheid_fotos: string;
  ingeschreven: string;
  reden_nee_vrij: string;
  druk: string;
  ontvangst: string;
  info: string;
  toekomst_contact: string;
  opmerkingen: string;
};

const EMPTY_FORM: FeedbackForm = {
  naam: '',
  voornaam: '',
  email: '',
  gsm: '',
  ervaring: '',
  tevredenheid_fotos: '',
  ingeschreven: '',
  reden_nee_vrij: '',
  druk: '',
  ontvangst: '',
  info: '',
  toekomst_contact: '',
  opmerkingen: '',
};

const ERVARING = ['Zeer positief', 'Positief', 'Neutraal', 'Negatief', 'Zeer negatief'] as const;
const TEVREDENHEID = [
  'Zeer tevreden',
  'Tevreden',
  'Neutraal',
  'Ontevreden',
  'Zeer ontevreden',
] as const;
const ONTVANGST = [
  'Zeer vriendelijk',
  'Vriendelijk',
  'Neutraal',
  'Onvriendelijk',
  'Zeer onvriendelijk',
] as const;
const INFO = ['Ja', 'Nee', 'Gedeeltelijk'] as const;
const JA_NEE = ['Ja', 'Nee'] as const;

function RadioGroup({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="nieuw-ts-radios" role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <label key={opt} className="nieuw-ts-radio">
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            required
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

export function TestshootDownloadClient() {
  const { token, hasBackofficeAccess, can } = useAuth();
  const [models, setModels] = useState<ModelSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [formModelId, setFormModelId] = useState<string | null>(null);
  const [form, setForm] = useState<FeedbackForm>(EMPTY_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressUpdate | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const res = await fetch(`${getApiBase()}/guest/testshoot`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(parseApiErrorBody(await res.text()) || 'Laden mislukt.');
      }
      const data = (await res.json()) as ModelSlot[];
      setModels(Array.isArray(data) ? data.filter((m) => m.photos?.length > 0) : []);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Laden mislukt.');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!lightbox && !formModelId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setLightbox(null);
      if (!busyId) {
        setFormModelId(null);
        setForm(EMPTY_FORM);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, formModelId, busyId]);

  const closeForm = () => {
    if (busyId) return;
    setFormModelId(null);
    setForm(EMPTY_FORM);
    setErr(null);
  };

  const startZip = async (modelId: string, modelName: string, exp: number, sig: string) => {
    const url = `${getApiBase()}/guest/testshoot/models/${modelId}/zip?e=${exp}&s=${encodeURIComponent(sig)}`;
    const safeName = modelName.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'testshoot';
    setDownloadProgress({
      percent: null,
      loaded: 0,
      total: null,
      indeterminate: true,
      phase: 'connecting',
    });
    await downloadWithProgress(url, {
      fallbackName: `${safeName}-fotos.zip`,
      onProgress: setDownloadProgress,
    });
    setOkMsg('De foto’s werden volledig gedownload en verdwijnen nu van deze pagina.');
    await load();
    window.setTimeout(() => setDownloadProgress(null), 500);
  };

  const requestDownload = async (model: ModelSlot) => {
    setErr(null);
    setOkMsg(null);
    setBusyId(model.id);
    try {
      const isAdminTestshoot = !!token && (hasBackofficeAccess || can('admin.testshoot.read') || can('admin.testshoot.write'));
      if (isAdminTestshoot) {
        const url = `${getApiBase()}/admin/testshoot/models/${model.id}/zip`;
        const safeName = model.name.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'testshoot';
        setDownloadProgress({
          percent: null,
          loaded: 0,
          total: null,
          indeterminate: true,
          phase: 'connecting',
        });
        await downloadWithProgress(url, {
          token,
          fallbackName: `${safeName}-fotos.zip`,
          onProgress: setDownloadProgress,
        });
        setOkMsg('Admin-download voltooid. Deze foto’s blijven beschikbaar op de site.');
        return;
      }

      const res = await fetch(`${getApiBase()}/guest/testshoot/models/${model.id}/download-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const text = await res.text();
      if (res.status === 403) {
        const msg = parseApiErrorBody(text);
        if (msg.includes('NEED_FEEDBACK') || res.status === 403) {
          setFormModelId(model.id);
          setForm(EMPTY_FORM);
          return;
        }
        throw new Error(msg || 'Download niet toegestaan.');
      }
      if (!res.ok) throw new Error(parseApiErrorBody(text) || 'Download mislukt.');
      const { exp, sig } = JSON.parse(text) as { exp: number; sig: string };
      await startZip(model.id, model.name, exp, sig);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Download mislukt.');
    } finally {
      setDownloadProgress(null);
      setBusyId(null);
    }
  };

  const onSubmitFeedback = async (e: FormEvent) => {
    e.preventDefault();
    if (!formModelId) return;
    setErr(null);
    setOkMsg(null);
    if (form.ingeschreven === 'Nee' && !form.reden_nee_vrij.trim()) {
      setErr('Vul de reden in als u zich niet heeft ingeschreven.');
      return;
    }
    setBusyId(formModelId);
    try {
      const res = await fetch(`${getApiBase()}/guest/testshoot/models/${formModelId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reden_nee_vrij: form.ingeschreven === 'Nee' ? form.reden_nee_vrij.trim() : '',
          opmerkingen: form.opmerkingen.trim(),
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(parseApiErrorBody(text) || 'Feedback opslaan mislukt.');
      const { exp, sig } = JSON.parse(text) as { exp: number; sig: string };
      setFormModelId(null);
      setForm(EMPTY_FORM);
      await startZip(formModelId, formModel?.name ?? 'testshoot', exp, sig);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Feedback opslaan mislukt.');
    } finally {
      setDownloadProgress(null);
      setBusyId(null);
    }
  };

  const formModel = models.find((m) => m.id === formModelId);

  const content = (
    <div>
      {downloadProgress ? (
        <CmProgressOverlay
          label="De foto’s worden gedownload"
          sublabel={`Dit kan even duren. ${downloadProgressSublabel(downloadProgress)}`}
          percent={downloadProgress.percent ?? undefined}
          indeterminate={downloadProgress.indeterminate}
        />
      ) : null}
      <span className="nieuw-label">{TESTSHOOT_PAGE.kicker}</span>
      <h1 className="nieuw-h1" style={{ maxWidth: '16ch' }}>
        Jouw testshoot-<em>foto&apos;s</em>
      </h1>
      <p className="nieuw-lead" style={{ maxWidth: '96ch' }}>
        Hier vindt u de foto&apos;s van de testshoot. Deze beelden zijn gemaakt zonder make-up en met
        eenvoudige verlichting. Ze hebben niets te maken met een portfolio-aanmaak. Een portfolio
        wordt uitgewerkt met een topmodelfotograaf, styliste, make-upartieste, kapper en een
        volledig andere lichtsetting. Deze foto&apos;s dienen enkel om de spontaniteit van het model
        te beoordelen, te zien of iemand fotogeniek is en hoe het model beweegt voor de camera.
      </p>

      {loading ? (
        <p className="nieuw-lead" style={{ marginTop: 32 }}>
          Laden…
        </p>
      ) : null}
      {loadErr ? (
        <p className="nieuw-lead" style={{ marginTop: 32, color: '#c45c5c' }}>
          {loadErr}
        </p>
      ) : null}
      {err && !formModelId ? (
        <p className="nieuw-panel" style={{ marginTop: 24, borderColor: '#c45c5c', color: '#c45c5c' }}>
          {err}
        </p>
      ) : null}
      {okMsg ? (
        <p className="nieuw-panel" style={{ marginTop: 24 }}>
          {okMsg}
        </p>
      ) : null}

      {!loading && !loadErr && models.length === 0 ? (
        <div className="nieuw-panel" style={{ marginTop: 36, textAlign: 'center' }}>
          <p className="nieuw-lead" style={{ margin: '0 auto', textAlign: 'center' }}>
            Er staan momenteel geen testshoot-foto&apos;s klaar. Kom later terug, of neem contact op
            met Class-Models als u net een shoot had.
          </p>
        </div>
      ) : null}

      <div className="nieuw-ts-grid">
        {models.map((model) => (
          <article key={model.id} className="nieuw-panel nieuw-ts-card">
            <div className="nieuw-ts-card-head">
              <h2 className="nieuw-h3" style={{ margin: 0, fontSize: 22 }}>
                {model.name}
              </h2>
              <span className="nieuw-ts-count">
                {model.photos.length} foto{model.photos.length === 1 ? '' : '’s'}
              </span>
            </div>
            <div className="nieuw-ts-thumbs">
              {model.photos.slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="nieuw-ts-thumb"
                  onClick={() =>
                    setLightbox({
                      src: publicMediaUrl(p.fullFile),
                      alt: `${model.name} — foto`,
                    })
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicMediaUrl(p.thumbFile)} alt="" loading="lazy" />
                </button>
              ))}
              {model.photos.length > 12 ? (
                <div className="nieuw-ts-thumb nieuw-ts-more">+{model.photos.length - 12}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="nieuw-btn"
              style={{ width: '100%', marginTop: 18 }}
              disabled={busyId === model.id}
              onClick={() => void requestDownload(model)}
            >
              {busyId === model.id
                ? 'Bezig…'
                : model.downloadUnlocked
                  ? 'Foto’s opnieuw downloaden'
                  : 'Download alle foto’s'}
            </button>
          </article>
        ))}
      </div>

      {lightbox ? (
        <div
          className="nieuw-ts-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Foto"
          onClick={() => setLightbox(null)}
        >
          <div className="nieuw-ts-lightbox-panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="nieuw-ts-close nieuw-ts-close-panel"
              aria-label="Sluiten"
              onClick={() => setLightbox(null)}
            >
              ×
            </button>
            <div className="nieuw-ts-lightbox-scroll">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightbox.src} alt={lightbox.alt} className="nieuw-ts-lightbox-img" />
            </div>
          </div>
        </div>
      ) : null}

      {formModelId && formModel ? (
        <div
          className="nieuw-ts-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ts-feedback-title"
          onClick={closeForm}
        >
          <form
            className="nieuw-ts-form"
            onSubmit={onSubmitFeedback}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="nieuw-ts-close nieuw-ts-close-form" aria-label="Sluiten" onClick={closeForm}>
              ×
            </button>

            <p className="nieuw-ts-kicker">Feedback</p>
            <h2 id="ts-feedback-title" className="nieuw-ts-title">
              Voor u de foto&apos;s van <em>{formModel.name}</em> downloadt
            </h2>
            <p className="nieuw-ts-intro">
              Vul dit korte formulier in. Daarna start de zip-download automatisch.
            </p>

            {err ? <p className="nieuw-ts-error">{err}</p> : null}

            <section className="nieuw-ts-section">
              <h3 className="nieuw-ts-section-title">Uw gegevens</h3>
              <div className="nieuw-ts-grid-fields">
                <label className="nieuw-ts-field">
                  <span>Naam *</span>
                  <input
                    required
                    value={form.naam}
                    onChange={(e) => setForm((f) => ({ ...f, naam: e.target.value }))}
                    autoComplete="family-name"
                  />
                </label>
                <label className="nieuw-ts-field">
                  <span>Voornaam *</span>
                  <input
                    required
                    value={form.voornaam}
                    onChange={(e) => setForm((f) => ({ ...f, voornaam: e.target.value }))}
                    autoComplete="given-name"
                  />
                </label>
                <label className="nieuw-ts-field">
                  <span>E-mailadres *</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    autoComplete="email"
                  />
                </label>
                <label className="nieuw-ts-field">
                  <span>Telefoonnummer *</span>
                  <input
                    required
                    type="tel"
                    value={form.gsm}
                    onChange={(e) => setForm((f) => ({ ...f, gsm: e.target.value }))}
                    autoComplete="tel"
                  />
                </label>
              </div>
            </section>

            <section className="nieuw-ts-section">
              <h3 className="nieuw-ts-section-title">Ervaring &amp; foto&apos;s</h3>
              <div className="nieuw-ts-q">
                <p className="nieuw-ts-q-label">Hoe heeft u de testshoot ervaren? *</p>
                <RadioGroup
                  name="ervaring"
                  value={form.ervaring}
                  options={ERVARING}
                  onChange={(v) => setForm((f) => ({ ...f, ervaring: v }))}
                />
              </div>
              <div className="nieuw-ts-q">
                <p className="nieuw-ts-q-label">Wat vond u van de ontvangen foto’s? *</p>
                <RadioGroup
                  name="tevredenheid_fotos"
                  value={form.tevredenheid_fotos}
                  options={TEVREDENHEID}
                  onChange={(v) => setForm((f) => ({ ...f, tevredenheid_fotos: v }))}
                />
              </div>
            </section>

            <section className="nieuw-ts-section">
              <h3 className="nieuw-ts-section-title">Inschrijving</h3>
              <div className="nieuw-ts-q">
                <p className="nieuw-ts-q-label">Heeft u zich ingeschreven bij ons bureau? *</p>
                <RadioGroup
                  name="ingeschreven"
                  value={form.ingeschreven}
                  options={JA_NEE}
                  onChange={(v) => setForm((f) => ({ ...f, ingeschreven: v }))}
                />
              </div>
              {form.ingeschreven === 'Nee' ? (
                <label className="nieuw-ts-field nieuw-ts-field-full">
                  <span>Indien nee, wat is hiervoor de reden? *</span>
                  <input
                    required
                    value={form.reden_nee_vrij}
                    onChange={(e) => setForm((f) => ({ ...f, reden_nee_vrij: e.target.value }))}
                  />
                </label>
              ) : null}
              <div className="nieuw-ts-q">
                <p className="nieuw-ts-q-label">Heeft u druk ervaren om zich in te schrijven? *</p>
                <RadioGroup
                  name="druk"
                  value={form.druk}
                  options={JA_NEE}
                  onChange={(v) => setForm((f) => ({ ...f, druk: v }))}
                />
              </div>
            </section>

            <section className="nieuw-ts-section">
              <h3 className="nieuw-ts-section-title">Ontvangst &amp; contact</h3>
              <div className="nieuw-ts-q">
                <p className="nieuw-ts-q-label">Hoe bent u ontvangen bij ons? *</p>
                <RadioGroup
                  name="ontvangst"
                  value={form.ontvangst}
                  options={ONTVANGST}
                  onChange={(v) => setForm((f) => ({ ...f, ontvangst: v }))}
                />
              </div>
              <div className="nieuw-ts-q">
                <p className="nieuw-ts-q-label">Heeft u voldoende en duidelijke informatie ontvangen? *</p>
                <RadioGroup
                  name="info"
                  value={form.info}
                  options={INFO}
                  onChange={(v) => setForm((f) => ({ ...f, info: v }))}
                />
              </div>
              <div className="nieuw-ts-q">
                <p className="nieuw-ts-q-label">Mogen wij u in de toekomst nog contacteren? *</p>
                <RadioGroup
                  name="toekomst_contact"
                  value={form.toekomst_contact}
                  options={JA_NEE}
                  onChange={(v) => setForm((f) => ({ ...f, toekomst_contact: v }))}
                />
              </div>
            </section>

            <section className="nieuw-ts-section nieuw-ts-section-last">
              <h3 className="nieuw-ts-section-title">Opmerkingen</h3>
              <label className="nieuw-ts-field nieuw-ts-field-full">
                <span>Opmerkingen / suggesties</span>
                <textarea
                  rows={3}
                  value={form.opmerkingen}
                  onChange={(e) => setForm((f) => ({ ...f, opmerkingen: e.target.value }))}
                />
              </label>
            </section>

            <div className="nieuw-ts-actions">
              <button type="submit" className="nieuw-btn" disabled={busyId === formModelId}>
                {busyId === formModelId ? 'Bezig…' : 'Versturen en foto’s downloaden'}
              </button>
              <button
                type="button"
                className="nieuw-btn nieuw-btn-ghost"
                disabled={busyId === formModelId}
                onClick={closeForm}
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );

  return content;
}
