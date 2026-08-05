'use client';

import { useCallback, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

// ─── Tarieven ────────────────────────────────────────────────────────────────

const TARIEVEN_PERSONEN = [
  { label: 'Mannequin / Dressman', per: 'uur', tarief: 75 },
  { label: 'Fotoshoot (model)', per: 'uur', tarief: 150 },
  { label: 'Hostessen / Host', per: 'uur', tarief: 40 },
  { label: 'Promo Girls / Boys', per: 'uur', tarief: 60 },
  { label: 'Visagiste / Hairstyliste', per: 'uur', tarief: 95 },
  { label: 'Fotograaf', per: 'uur', tarief: 175 },
  { label: 'Medewerk(st)er', per: 'uur', tarief: 40 },
];

const TARIEVEN_OVERIG = [
  { label: 'Doorpassen (forfaitair, max. 2u)', tarief: 50 },
  { label: 'Reiskosten', info: '€ 0,70/km (enkele rit × 2) + 25% uurtarief' },
];

const AUTEURSRECHTEN_OPTIES = [
  { value: '', label: '— geen —', prijs: 0 },
  { value: 'tv1', label: 'TV — 1 jaar', prijs: 1000 },
  { value: 'tv3', label: 'TV — 3 jaar', prijs: 1500 },
  { value: 'bus', label: 'Busreclame', prijs: 800 },
  { value: 'int1', label: 'Internet — 1 jaar', prijs: 400 },
  { value: 'int3', label: 'Internet — 3 jaar', prijs: 700 },
  { value: 'winkel', label: 'Winkel (display)', prijs: 300 },
  { value: 'display', label: 'Display reclame', prijs: 300 },
  { value: 'folders', label: 'Folders / drukwerk', prijs: 600 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTime(val: string): number {
  if (!val) return 0;
  const [h, m] = val.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

function hoursBetween(van: string, tot: string): number {
  const diff = parseTime(tot) - parseTime(van);
  return diff > 0 ? diff : 0;
}

function fmt(n: number): string {
  return n.toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Types ───────────────────────────────────────────────────────────────────

type GroepRij = {
  aantal: number;
  van: string;
  tot: string;
};

type FormState = {
  // Klantgegevens
  naam: string;
  bedrijfsnaam: string;
  soortBedrijf: string;
  btw: string;
  straat: string;
  nr: string;
  postcode: string;
  gemeente: string;
  gsm: string;
  email: string;
  // Opdracht
  typeOpdracht: string;
  mannen: GroepRij;
  vrouwen: GroepRij;
  kinderenJongen: GroepRij;
  kinderenMeisje: GroepRij;
  opmerkingen: string;
  // Extra diensten
  visagiste: boolean;
  visagisteUren: number;
  hairstyliste: boolean;
  hairslisteUren: number;
  fotograaf: boolean;
  fotografUren: number;
  medewerker: boolean;
  medewerkerUren: number;
  // Auteursrechten
  auteursrechten: string;
  // Opties
  doorpassen: boolean;
  lingerie: boolean;
  // Datum
  datum: string;
  geenDatum: boolean;
  // Afstand
  afstandKm: string;
};

type PrijsRegel = { label: string; bedrag: number };

// ─── Pricing calculator ───────────────────────────────────────────────────────

function uurtariefVoorType(type: string): number {
  switch (type) {
    case 'modeshow':
    case 'showroom':
      return 75;
    case 'fotoshoot':
      return 150;
    case 'hostess':
      return 40;
    case 'promowerk':
      return 60;
    default:
      return 75;
  }
}

function berekenPrijs(f: FormState): PrijsRegel[] {
  const regels: PrijsRegel[] = [];
  const uurTarief = uurtariefVoorType(f.typeOpdracht);

  // Model groepen
  let modelTotaal = 0;
  const groepen: { label: string; rij: GroepRij }[] = [
    { label: 'Mannen', rij: f.mannen },
    { label: 'Vrouwen', rij: f.vrouwen },
    { label: 'Kinderen (jongen)', rij: f.kinderenJongen },
    { label: 'Kinderen (meisje)', rij: f.kinderenMeisje },
  ];
  for (const { label, rij } of groepen) {
    if (rij.aantal > 0 && rij.van && rij.tot) {
      const uren = hoursBetween(rij.van, rij.tot);
      if (uren > 0) {
        const bedrag = rij.aantal * uren * uurTarief;
        modelTotaal += bedrag;
        regels.push({ label: `${label} (${rij.aantal} × ${uren.toFixed(2)}u × €${uurTarief})`, bedrag });
      }
    }
  }

  // Lingerie toeslag (+50% op modellen)
  if (f.lingerie && modelTotaal > 0) {
    const toeslag = modelTotaal * 0.5;
    regels.push({ label: 'Lingerie toeslag (+50%)', bedrag: toeslag });
  }

  // Doorpassen
  if (f.doorpassen) {
    regels.push({ label: 'Doorpassen (forfait)', bedrag: 50 });
  }

  // Extra diensten
  if (f.visagiste && f.visagisteUren > 0) {
    regels.push({ label: `Visagiste (${f.visagisteUren}u × €95)`, bedrag: f.visagisteUren * 95 });
  }
  if (f.hairstyliste && f.hairslisteUren > 0) {
    regels.push({ label: `Hairstyliste (${f.hairslisteUren}u × €95)`, bedrag: f.hairslisteUren * 95 });
  }
  if (f.fotograaf && f.fotografUren > 0) {
    regels.push({ label: `Fotograaf (${f.fotografUren}u × €175)`, bedrag: f.fotografUren * 175 });
  }
  if (f.medewerker && f.medewerkerUren > 0) {
    regels.push({ label: `Medewerk(st)er (${f.medewerkerUren}u × €40)`, bedrag: f.medewerkerUren * 40 });
  }

  // Reiskosten
  const km = parseFloat(f.afstandKm) || 0;
  if (km > 0) {
    const kmKost = km * 2 * 0.70;
    const tijdKost = uurTarief * 0.25;
    const reisKost = kmKost + tijdKost;
    regels.push({ label: `Reiskosten (${km} km heen+terug × €0,70 + 25% uur)`, bedrag: reisKost });
  }

  // Auteursrechten
  const autOpt = AUTEURSRECHTEN_OPTIES.find((o) => o.value === f.auteursrechten);
  if (autOpt && autOpt.prijs > 0) {
    regels.push({ label: `Auteursrechten: ${autOpt.label}`, bedrag: autOpt.prijs });
  }

  return regels;
}

// ─── Component ────────────────────────────────────────────────────────────────

const DEFAULT_GROEP: GroepRij = { aantal: 0, van: '', tot: '' };

const DEFAULT_FORM: FormState = {
  naam: '',
  bedrijfsnaam: '',
  soortBedrijf: '',
  btw: '',
  straat: '',
  nr: '',
  postcode: '',
  gemeente: '',
  gsm: '',
  email: '',
  typeOpdracht: 'modeshow',
  mannen: { ...DEFAULT_GROEP },
  vrouwen: { ...DEFAULT_GROEP },
  kinderenJongen: { ...DEFAULT_GROEP },
  kinderenMeisje: { ...DEFAULT_GROEP },
  opmerkingen: '',
  visagiste: false,
  visagisteUren: 0,
  hairstyliste: false,
  hairslisteUren: 0,
  fotograaf: false,
  fotografUren: 0,
  medewerker: false,
  medewerkerUren: 0,
  auteursrechten: '',
  doorpassen: false,
  lingerie: false,
  datum: '',
  geenDatum: false,
  afstandKm: '',
};

function GroepRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: GroepRij;
  onChange: (v: GroepRij) => void;
}) {
  return (
    <div className="mb-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px', gap: 8, alignItems: 'end' }}>
      <label className="nieuw-field" style={{ margin: 0 }}>
        <span>{label} — aantal</span>
        <input
          type="number"
          min={0}
          value={value.aantal || ''}
          onChange={(e) => onChange({ ...value, aantal: parseInt(e.target.value) || 0 })}
          placeholder="0"
        />
      </label>
      <label className="nieuw-field" style={{ margin: 0 }}>
        <span>Van</span>
        <input
          type="time"
          value={value.van}
          onChange={(e) => onChange({ ...value, van: e.target.value })}
        />
      </label>
      <label className="nieuw-field" style={{ margin: 0 }}>
        <span>Tot</span>
        <input
          type="time"
          value={value.tot}
          onChange={(e) => onChange({ ...value, tot: e.target.value })}
        />
      </label>
      <div style={{ fontSize: 12, color: 'var(--n-mut)', paddingBottom: 8, alignSelf: 'end' }}>
        {value.aantal > 0 && value.van && value.tot
          ? `${hoursBetween(value.van, value.tot).toFixed(2)}u`
          : ''}
      </div>
    </div>
  );
}

export function ModellenBoekenPanel({ token }: { token: string }) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<'offerte' | 'bestelling' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
  }, []);

  const regels = useMemo(() => berekenPrijs(form), [form]);
  const totaalExcl = useMemo(() => regels.reduce((s, r) => s + r.bedrag, 0), [regels]);
  const btw21 = totaalExcl * 0.21;
  const totaalIncl = totaalExcl + btw21;

  const validate = (): string | null => {
    if (!form.naam.trim()) return 'Naam is verplicht.';
    if (!form.email.trim()) return 'E-mailadres is verplicht.';
    if (!form.gsm.trim()) return 'GSM is verplicht.';
    if (!form.typeOpdracht) return 'Type opdracht is verplicht.';
    if (!form.datum && !form.geenDatum) return 'Kies een datum of vink "Nog geen datum" aan.';
    return null;
  };

  const handleSubmit = async (isBestelling: boolean) => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setBusy(true);
    try {
      await apiFetch('/portal/client/offerte', {
        method: 'POST',
        token,
        body: JSON.stringify({
          isBestelling,
          naam: form.naam,
          bedrijfsnaam: form.bedrijfsnaam,
          soortBedrijf: form.soortBedrijf,
          btw: form.btw,
          straat: form.straat,
          nr: form.nr,
          postcode: form.postcode,
          gemeente: form.gemeente,
          gsm: form.gsm,
          clientEmail: form.email,
          typeOpdracht: form.typeOpdracht,
          opmerkingen: form.opmerkingen,
          datum: form.geenDatum ? 'Nog geen datum voorzien' : form.datum,
          afstandKm: parseFloat(form.afstandKm) || 0,
          lingerie: form.lingerie,
          doorpassen: form.doorpassen,
          auteursrechten: form.auteursrechten,
          extraDiensten: {
            visagiste: form.visagiste ? form.visagisteUren : 0,
            hairstyliste: form.hairstyliste ? form.hairslisteUren : 0,
            fotograaf: form.fotograaf ? form.fotografUren : 0,
            medewerker: form.medewerker ? form.medewerkerUren : 0,
          },
          groepen: {
            mannen: form.mannen,
            vrouwen: form.vrouwen,
            kinderenJongen: form.kinderenJongen,
            kinderenMeisje: form.kinderenMeisje,
          },
          prijsRegels: regels,
          totaalExcl,
          btw21,
          totaalIncl,
        }),
      });
      setSent(isBestelling ? 'bestelling' : 'offerte');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verzenden mislukt.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="nieuw-panel" style={{ marginTop: 24, borderColor: 'var(--n-gold-hair)' }}>
        <h3 className="nieuw-h3" style={{ color: 'var(--n-gold)' }}>
          {sent === 'bestelling' ? '✓ Bestelling ontvangen' : '✓ Offerte aanvraag ontvangen'}
        </h3>
        <p className="nieuw-lead">
          Bedankt. We nemen zo snel mogelijk contact op via <strong>{form.email}</strong>.
        </p>
        <button
          type="button"
          className="nieuw-btn nieuw-btn-ghost"
          style={{ marginTop: 18 }}
          onClick={() => { setForm(DEFAULT_FORM); setSent(null); }}
        >
          Nieuw formulier
        </button>
      </div>
    );
  }

  return (
    <div className="cm-kp-booking">
      <header className="cm-kp-booking-header">
        <h1 className="cm-kp-paginatitel">Modellen boeken / tarieven</h1>
        <p>
          Bekijk hieronder onze tarieven en bereken meteen zelf de prijs van uw opdracht. Vraag een
          offerte aan of plaats direct een bestelling — u ontvangt een bevestiging per e-mail.
        </p>
      </header>

      {/* ─── Prijslijst ──────────────────────────────────────────────────── */}
      <section className="nieuw-panel cm-kp-rates">
        <h2 className="cm-kp-titel">Prijslijst (excl. btw)</h2>
        <p className="nieuw-lead" style={{ marginBottom: 12 }}>
          Onderstaande tarieven zijn richtprijzen. De definitieve prijs wordt bevestigd na uw aanvraag.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="cm-kp-rates-table">
            <thead>
              <tr className="cm-kp-rates-section">
                <th colSpan={2}>Modellen &amp; personeel</th>
              </tr>
            </thead>
            <tbody>
              {TARIEVEN_PERSONEN.map((t) => (
                <tr key={t.label}>
                  <td>{t.label}</td>
                  <td>
                    € {t.tarief}/u
                  </td>
                </tr>
              ))}
              <tr className="cm-kp-rates-section">
                <th colSpan={2}>Toeslagen &amp; reiskosten</th>
              </tr>
              {TARIEVEN_OVERIG.map((t) => (
                <tr key={t.label}>
                  <td>
                    {t.label}
                    {'info' in t && t.info ? (
                      <span className="cm-kp-rate-note">({t.info})</span>
                    ) : null}
                  </td>
                  <td>
                    {'tarief' in t && typeof t.tarief === 'number' ? `€ ${t.tarief}` : '—'}
                  </td>
                </tr>
              ))}
              <tr className="cm-kp-rates-section">
                <th colSpan={2}>Auteursrechten (eenmalig)</th>
              </tr>
              {AUTEURSRECHTEN_OPTIES.filter((o) => o.value).map((o) => (
                <tr key={o.value}>
                  <td>{o.label}</td>
                  <td>
                    € {o.prijs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 12, fontSize: 11, color: 'var(--n-mut)' }}>
          * Alle prijzen excl. 21% BTW. Lingerie en badmode: +50% op modelhonorarium.
        </p>
      </section>

      {/* ─── Offerte / Bestelling formulier ──────────────────────────────── */}
      <details className="cm-kp-booking-accordion">
        <summary>
          <span>
            <b>Offerte / bestelling aanvragen</b>
            <small>Open het formulier en bereken uw opdracht</small>
          </span>
        </summary>
        <section className="nieuw-panel cm-kp-booking-form">

        {/* Klantgegevens */}
        <fieldset className="cm-kp-form-section cm-kp-form-section--full" style={{ border: 'none', padding: 0, marginBottom: 24 }}>
          <legend style={{ color: 'var(--n-mut)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Uw gegevens
          </legend>
          <div className="nieuw-form-grid">
            <label className="nieuw-field">
              <span>Naam *</span>
              <input required value={form.naam} onChange={(e) => set('naam', e.target.value)} />
            </label>
            <label className="nieuw-field">
              <span>Bedrijfsnaam</span>
              <input value={form.bedrijfsnaam} onChange={(e) => set('bedrijfsnaam', e.target.value)} />
            </label>
            <label className="nieuw-field">
              <span>Soort bedrijf</span>
              <select value={form.soortBedrijf} onChange={(e) => set('soortBedrijf', e.target.value)}>
                <option value="">— kies —</option>
                <option value="kledingzaak">Kledingzaak</option>
                <option value="reclamebureau">Reclamebureau</option>
                <option value="andere">Andere</option>
              </select>
            </label>
            <label className="nieuw-field">
              <span>BTW-nummer</span>
              <input value={form.btw} onChange={(e) => set('btw', e.target.value)} placeholder="BE 0123.456.789" />
            </label>
            <label className="nieuw-field">
              <span>Straat</span>
              <input value={form.straat} onChange={(e) => set('straat', e.target.value)} />
            </label>
            <label className="nieuw-field" style={{ maxWidth: 100 }}>
              <span>Nr.</span>
              <input value={form.nr} onChange={(e) => set('nr', e.target.value)} />
            </label>
            <label className="nieuw-field" style={{ maxWidth: 120 }}>
              <span>Postcode</span>
              <input value={form.postcode} onChange={(e) => set('postcode', e.target.value)} />
            </label>
            <label className="nieuw-field">
              <span>Gemeente</span>
              <input value={form.gemeente} onChange={(e) => set('gemeente', e.target.value)} />
            </label>
            <label className="nieuw-field">
              <span>GSM *</span>
              <input required type="tel" value={form.gsm} onChange={(e) => set('gsm', e.target.value)} />
            </label>
            <label className="nieuw-field">
              <span>E-mailadres *</span>
              <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </label>
          </div>
        </fieldset>

        {/* Type opdracht */}
        <fieldset className="cm-kp-form-section cm-kp-form-section--full" style={{ border: 'none', padding: 0, marginBottom: 24 }}>
          <legend style={{ color: 'var(--n-mut)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Opdracht
          </legend>
          <label className="nieuw-field" style={{ maxWidth: 280, marginBottom: 20 }}>
            <span>Type opdracht *</span>
            <select value={form.typeOpdracht} onChange={(e) => set('typeOpdracht', e.target.value)}>
              <option value="modeshow">Modeshow (€ 75/u)</option>
              <option value="showroom">Showroom (€ 75/u)</option>
              <option value="fotoshoot">Fotoshoot (€ 150/u)</option>
              <option value="promowerk">Promowerk (€ 60/u)</option>
              <option value="hostess">Hostessen (€ 40/u)</option>
            </select>
          </label>

          <p style={{ fontSize: 12, color: 'var(--n-mut)', marginBottom: 12 }}>
            Aantal modellen per categorie + tijdsblok:
          </p>
          <GroepRow label="Mannen" value={form.mannen} onChange={(v) => set('mannen', v)} />
          <GroepRow label="Vrouwen" value={form.vrouwen} onChange={(v) => set('vrouwen', v)} />
          <GroepRow label="Kinderen (jongen)" value={form.kinderenJongen} onChange={(v) => set('kinderenJongen', v)} />
          <GroepRow label="Kinderen (meisje)" value={form.kinderenMeisje} onChange={(v) => set('kinderenMeisje', v)} />

          <label className="nieuw-field nieuw-field-full" style={{ marginTop: 16 }}>
            <span>Opmerkingen</span>
            <textarea
              rows={3}
              value={form.opmerkingen}
              onChange={(e) => set('opmerkingen', e.target.value)}
              placeholder="Stijl, look, bijzondere vereisten…"
            />
          </label>
        </fieldset>

        {/* Extra diensten */}
        <fieldset className="cm-kp-form-section" style={{ border: 'none', padding: 0, marginBottom: 24 }}>
          <legend style={{ color: 'var(--n-mut)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Extra diensten
          </legend>
          <div className="nieuw-form-grid">
            {([
              { key: 'visagiste', urenKey: 'visagisteUren', label: 'Visagiste (€ 95/u)', uren: form.visagisteUren },
              { key: 'hairstyliste', urenKey: 'hairslisteUren', label: 'Hairstyliste (€ 95/u)', uren: form.hairslisteUren },
              { key: 'fotograaf', urenKey: 'fotografUren', label: 'Fotograaf (€ 175/u)', uren: form.fotografUren },
              { key: 'medewerker', urenKey: 'medewerkerUren', label: 'Medewerk(st)er (€ 40/u)', uren: form.medewerkerUren },
            ] as { key: keyof FormState; urenKey: keyof FormState; label: string; uren: number }[]).map(
              ({ key, urenKey, label, uren }) => (
                <div key={String(key)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(form[key])}
                      onChange={(e) => set(key, e.target.checked as FormState[typeof key])}
                      style={{ accentColor: 'var(--n-gold)', width: 16, height: 16 }}
                    />
                    <span style={{ fontSize: 13 }}>{label}</span>
                  </label>
                  {form[key] ? (
                    <label className="nieuw-field" style={{ margin: 0, maxWidth: 90 }}>
                      <span style={{ fontSize: 11 }}>Uren</span>
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={uren || ''}
                        onChange={(e) => set(urenKey, parseFloat(e.target.value) || 0 as FormState[typeof urenKey])}
                      />
                    </label>
                  ) : null}
                </div>
              ),
            )}
          </div>
        </fieldset>

        {/* Opties */}
        <fieldset className="cm-kp-form-section" style={{ border: 'none', padding: 0, marginBottom: 24 }}>
          <legend style={{ color: 'var(--n-mut)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Opties
          </legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.doorpassen}
                onChange={(e) => set('doorpassen', e.target.checked)}
                style={{ accentColor: 'var(--n-gold)', width: 16, height: 16 }}
              />
              Doorpassen (+ € 50 forfait)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.lingerie}
                onChange={(e) => set('lingerie', e.target.checked)}
                style={{ accentColor: 'var(--n-gold)', width: 16, height: 16 }}
              />
              Lingerie / badmode (+50% op modelen)
            </label>
          </div>
          <label className="nieuw-field" style={{ maxWidth: 280 }}>
            <span>Auteursrechten</span>
            <select value={form.auteursrechten} onChange={(e) => set('auteursrechten', e.target.value)}>
              {AUTEURSRECHTEN_OPTIES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}{o.prijs ? ` — € ${o.prijs}` : ''}</option>
              ))}
            </select>
          </label>
        </fieldset>

        {/* Datum */}
        <fieldset className="cm-kp-form-section" style={{ border: 'none', padding: 0, marginBottom: 24 }}>
          <legend style={{ color: 'var(--n-mut)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Datum
          </legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'end' }}>
            <label className="nieuw-field" style={{ margin: 0 }}>
              <span>Datum van de opdracht</span>
              <input
                type="date"
                value={form.datum}
                disabled={form.geenDatum}
                onChange={(e) => set('datum', e.target.value)}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, paddingBottom: 8 }}>
              <input
                type="checkbox"
                checked={form.geenDatum}
                onChange={(e) => { set('geenDatum', e.target.checked); if (e.target.checked) set('datum', ''); }}
                style={{ accentColor: 'var(--n-gold)', width: 16, height: 16 }}
              />
              Nog geen datum voorzien
            </label>
          </div>
        </fieldset>

        {/* Reiskosten */}
        <fieldset className="cm-kp-form-section" style={{ border: 'none', padding: 0, marginBottom: 28 }}>
          <legend style={{ color: 'var(--n-mut)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Reiskosten (optioneel)
          </legend>
          <label className="nieuw-field" style={{ maxWidth: 200 }}>
            <span>Afstand in km (enkele rit)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={form.afstandKm}
              onChange={(e) => set('afstandKm', e.target.value)}
              placeholder="0"
            />
          </label>
          <p style={{ fontSize: 11, color: 'var(--n-mut)', marginTop: 6 }}>
            Berekening: (km × 2) × € 0,70 + 25% van het uurtarief.
          </p>
        </fieldset>

        {/* Live prijsoverzicht */}
        <div
          className="nieuw-panel cm-kp-form-total"
          style={{
            background: 'var(--n-bg-2)',
            border: '1px solid var(--n-hair)',
            marginBottom: 24,
            padding: '18px 20px',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--n-gold)', marginBottom: 14 }}>
            Prijsoverzicht (live berekening)
          </h3>
          {regels.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--n-mut)' }}>
              Vul het formulier in om een prijs te berekenen.
            </p>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {regels.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--n-hair)' }}>
                      <td style={{ padding: '5px 0', color: 'var(--n-ink)' }}>{r.label}</td>
                      <td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--n-ink)', whiteSpace: 'nowrap' }}>
                        € {fmt(r.bedrag)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--n-hair)' }}>
                    <td style={{ padding: '8px 0 4px', fontWeight: 600, color: 'var(--n-ink)' }}>Totaal excl. BTW</td>
                    <td style={{ padding: '8px 0 4px', textAlign: 'right', fontWeight: 700, color: 'var(--n-gold)' }}>
                      € {fmt(totaalExcl)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', color: 'var(--n-mut)', fontSize: 12 }}>BTW 21%</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', color: 'var(--n-mut)', fontSize: 12 }}>
                      € {fmt(btw21)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0 0', fontWeight: 700, fontSize: 15, color: 'var(--n-ink)' }}>
                      Totaal incl. BTW
                    </td>
                    <td style={{ padding: '4px 0 0', textAlign: 'right', fontWeight: 700, fontSize: 15, color: 'var(--n-gold)' }}>
                      € {fmt(totaalIncl)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>

        {error ? (
          <p style={{ color: '#e8a0a0', fontSize: 13, marginBottom: 14 }}>{error}</p>
        ) : null}

        <div className="cm-kp-form-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="nieuw-btn nieuw-btn-ghost"
            disabled={busy}
            onClick={() => void handleSubmit(false)}
          >
            {busy ? 'Bezig…' : 'Offerte aanvragen →'}
          </button>
          <button
            type="button"
            className="nieuw-btn"
            disabled={busy}
            onClick={() => void handleSubmit(true)}
          >
            {busy ? 'Bezig…' : 'Bestellen →'}
          </button>
        </div>
        <p className="cm-kp-form-disclaimer" style={{ fontSize: 11, color: 'var(--n-mut)', marginTop: 10 }}>
          Bij "Bestellen" bevestigt u de opdracht definitief. Bij "Offerte aanvragen" ontvangt u een
          vrijblijvende prijsopgave.
        </p>
        </section>
      </details>
    </div>
  );
}
