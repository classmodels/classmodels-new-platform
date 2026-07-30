'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
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
    <div className="nieuw-radio-group" role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <label key={opt} className="nieuw-radio">
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
  const [models, setModels] = useState<ModelSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [formModelId, setFormModelId] = useState<string | null>(null);
  const [form, setForm] = useState<FeedbackForm>(EMPTY_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

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

  const startZip = (modelId: string, exp: number, sig: string) => {
    const url = `${getApiBase()}/guest/testshoot/models/${modelId}/zip?e=${exp}&s=${encodeURIComponent(sig)}`;
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setOkMsg('Download gestart. Na een geslaagde download verdwijnen de foto’s van deze pagina.');
    window.setTimeout(() => {
      void load();
    }, 3500);
  };

  const requestDownload = async (model: ModelSlot) => {
    setErr(null);
    setOkMsg(null);
    setBusyId(model.id);
    try {
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
      startZip(model.id, exp, sig);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Download mislukt.');
    } finally {
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
      startZip(formModelId, exp, sig);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Feedback opslaan mislukt.');
    } finally {
      setBusyId(null);
    }
  };

  const formModel = models.find((m) => m.id === formModelId);

  return (
    <div>
      <span className="nieuw-label">{TESTSHOOT_PAGE.kicker}</span>
      <h1 className="nieuw-h1" style={{ maxWidth: '16ch' }}>
        Jouw testshoot-<em>foto&apos;s</em>
      </h1>
      <p className="nieuw-lead" style={{ maxWidth: '62ch' }}>
        {TESTSHOOT_PAGE.intro}
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
      {err ? (
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
                <a
                  key={p.id}
                  href={publicMediaUrl(p.fullFile)}
                  target="_blank"
                  rel="noreferrer"
                  className="nieuw-ts-thumb"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicMediaUrl(p.thumbFile)} alt="" loading="lazy" />
                </a>
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

      {formModelId && formModel ? (
        <div className="nieuw-ts-modal" role="dialog" aria-modal="true" aria-labelledby="ts-feedback-title">
          <form className="nieuw-panel nieuw-ts-form" onSubmit={onSubmitFeedback}>
            <span className="nieuw-label">Feedback</span>
            <h2 id="ts-feedback-title" className="nieuw-h3" style={{ marginTop: 6 }}>
              Voor u de foto&apos;s van <em>{formModel.name}</em> downloadt
            </h2>
            <p className="nieuw-lead" style={{ fontSize: 15, marginTop: 8 }}>
              Vul dit korte formulier in. Uw antwoorden worden bewaard in de backsite. Daarna start
              de zip-download automatisch.
            </p>

            <div className="nieuw-form-grid" style={{ marginTop: 22 }}>
              <label className="nieuw-field">
                <span>Naam *</span>
                <input
                  required
                  value={form.naam}
                  onChange={(e) => setForm((f) => ({ ...f, naam: e.target.value }))}
                  autoComplete="family-name"
                />
              </label>
              <label className="nieuw-field">
                <span>Voornaam *</span>
                <input
                  required
                  value={form.voornaam}
                  onChange={(e) => setForm((f) => ({ ...f, voornaam: e.target.value }))}
                  autoComplete="given-name"
                />
              </label>
              <label className="nieuw-field">
                <span>E-mailadres *</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </label>
              <label className="nieuw-field">
                <span>Telefoonnummer *</span>
                <input
                  required
                  type="tel"
                  value={form.gsm}
                  onChange={(e) => setForm((f) => ({ ...f, gsm: e.target.value }))}
                  autoComplete="tel"
                />
              </label>

              <div className="nieuw-field nieuw-field-full">
                <span>Hoe heeft u de testshoot ervaren? *</span>
                <RadioGroup
                  name="ervaring"
                  value={form.ervaring}
                  options={ERVARING}
                  onChange={(v) => setForm((f) => ({ ...f, ervaring: v }))}
                />
              </div>
              <div className="nieuw-field nieuw-field-full">
                <span>Wat vond u van de ontvangen foto’s? *</span>
                <RadioGroup
                  name="tevredenheid_fotos"
                  value={form.tevredenheid_fotos}
                  options={TEVREDENHEID}
                  onChange={(v) => setForm((f) => ({ ...f, tevredenheid_fotos: v }))}
                />
              </div>
              <div className="nieuw-field nieuw-field-full">
                <span>Heeft u zich ingeschreven bij ons bureau? *</span>
                <RadioGroup
                  name="ingeschreven"
                  value={form.ingeschreven}
                  options={JA_NEE}
                  onChange={(v) => setForm((f) => ({ ...f, ingeschreven: v }))}
                />
              </div>
              {form.ingeschreven === 'Nee' ? (
                <label className="nieuw-field nieuw-field-full">
                  <span>Indien nee, wat is hiervoor de reden? *</span>
                  <input
                    required
                    value={form.reden_nee_vrij}
                    onChange={(e) => setForm((f) => ({ ...f, reden_nee_vrij: e.target.value }))}
                  />
                </label>
              ) : null}
              <div className="nieuw-field nieuw-field-full">
                <span>Heeft u druk ervaren om zich in te schrijven? *</span>
                <RadioGroup
                  name="druk"
                  value={form.druk}
                  options={JA_NEE}
                  onChange={(v) => setForm((f) => ({ ...f, druk: v }))}
                />
              </div>
              <div className="nieuw-field nieuw-field-full">
                <span>Hoe bent u ontvangen bij ons? *</span>
                <RadioGroup
                  name="ontvangst"
                  value={form.ontvangst}
                  options={ONTVANGST}
                  onChange={(v) => setForm((f) => ({ ...f, ontvangst: v }))}
                />
              </div>
              <div className="nieuw-field nieuw-field-full">
                <span>Heeft u voldoende en duidelijke informatie ontvangen? *</span>
                <RadioGroup
                  name="info"
                  value={form.info}
                  options={INFO}
                  onChange={(v) => setForm((f) => ({ ...f, info: v }))}
                />
              </div>
              <div className="nieuw-field nieuw-field-full">
                <span>Mogen wij u in de toekomst nog contacteren? *</span>
                <RadioGroup
                  name="toekomst_contact"
                  value={form.toekomst_contact}
                  options={JA_NEE}
                  onChange={(v) => setForm((f) => ({ ...f, toekomst_contact: v }))}
                />
              </div>
              <label className="nieuw-field nieuw-field-full">
                <span>Opmerkingen / suggesties</span>
                <textarea
                  rows={4}
                  value={form.opmerkingen}
                  onChange={(e) => setForm((f) => ({ ...f, opmerkingen: e.target.value }))}
                />
              </label>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
              <button type="submit" className="nieuw-btn" disabled={busyId === formModelId}>
                {busyId === formModelId ? 'Bezig…' : 'Versturen en foto’s downloaden'}
              </button>
              <button
                type="button"
                className="nieuw-btn nieuw-btn-ghost"
                disabled={busyId === formModelId}
                onClick={() => {
                  setFormModelId(null);
                  setForm(EMPTY_FORM);
                  setErr(null);
                }}
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
