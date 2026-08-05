'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

// ─── Tarieven ────────────────────────────────────────────────────────────────

const TARIEVEN_PERSONEN = [
  { label: 'Mannequin / Dressman', tarief: 75 },
  { label: 'Fotoshoot (model)', tarief: 150 },
  { label: 'Hostessen / Host', tarief: 40 },
  { label: 'Promo Girls / Boys', tarief: 60 },
  { label: 'Visagiste / Hairstyliste', tarief: 95 },
  { label: 'Fotograaf', tarief: 175 },
  { label: 'Medewerk(st)er', tarief: 40 },
];

const TARIEVEN_OVERIG = [
  { label: 'Doorpassen (forfaitair, max. 2u)', tarief: 50 },
  { label: 'Reiskosten', info: '€ 0,70/km, heen en terug (kantoor Hulshout → adres opdracht)' },
];

/** Bedrijfsgegevens Class-Models — voorbeeldvulling voor admins. */
const CLASS_MODELS_ACCOUNT = {
  street: 'Provinciebaan',
  houseNumber: '3',
  postalCode: '2235',
  city: 'Hulshout',
  phone: '+32 485 322 307',
  companyName: 'Class-Models',
  companyType: 'andere',
  vatNumber: 'BE 0504.801.460',
  email: 'info@class-models.be',
  website: 'www.class-models.be',
};

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

const SOORT_BEDRIJF: Record<string, string> = {
  kledingzaak: 'Kledingzaak',
  reclamebureau: 'Reclamebureau',
  andere: 'Andere',
};

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

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ModelSlot = {
  id: string;
  aantal: number;
  leeftijdVan: string;
  leeftijdTot: string;
  uurVan: string;
  uurTot: string;
};

type FormState = {
  typeOpdracht: string;
  slots: ModelSlot[];
  opmerkingen: string;
  visagiste: boolean;
  visagisteUren: number;
  hairstyliste: boolean;
  hairslisteUren: number;
  fotograaf: boolean;
  fotografUren: number;
  medewerker: boolean;
  medewerkerUren: number;
  auteursrechten: string;
  doorpassen: boolean;
  lingerie: boolean;
  datum: string;
  geenDatum: boolean;
  adresOpdracht: string;
  afstandKm: string;
  kopieEmail: string;
};

type AccountForm = {
  lastName: string;
  firstName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  phone: string;
  companyName: string;
  companyType: string;
  vatNumber: string;
  email: string;
  website: string;
};

type PrijsRegel = { label: string; bedrag: number };

function emptySlot(): ModelSlot {
  return {
    id: newId(),
    aantal: 0,
    leeftijdVan: '',
    leeftijdTot: '',
    uurVan: '',
    uurTot: '',
  };
}

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
  let modelTotaal = 0;

  f.slots.forEach((slot) => {
    if (slot.aantal > 0 && slot.uurVan && slot.uurTot) {
      const uren = hoursBetween(slot.uurVan, slot.uurTot);
      if (uren > 0) {
        const bedrag = slot.aantal * uren * uurTarief;
        modelTotaal += bedrag;
        const urenLabel = Number.isInteger(uren) ? `${uren}` : uren.toFixed(1).replace('.', ',');
        const leeftijd =
          slot.leeftijdVan || slot.leeftijdTot
            ? ` (leeftijd ${slot.leeftijdVan || '?'}–${slot.leeftijdTot || '?'} jaar)`
            : '';
        regels.push({
          label: `${slot.aantal} ${slot.aantal === 1 ? 'model' : 'modellen'} × ${urenLabel} uur × € ${uurTarief}/u${leeftijd}`,
          bedrag,
        });
      }
    }
  });

  if (f.lingerie && modelTotaal > 0) {
    regels.push({ label: 'Lingerie toeslag (+50%)', bedrag: modelTotaal * 0.5 });
  }
  if (f.doorpassen) regels.push({ label: 'Doorpassen (forfait)', bedrag: 50 });
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

  const km = parseFloat(f.afstandKm) || 0;
  if (km > 0) {
    regels.push({
      label: `Reiskosten: ${km} km × 2 (heen en terug) × € 0,70`,
      bedrag: km * 2 * 0.7,
    });
  }

  const autOpt = AUTEURSRECHTEN_OPTIES.find((o) => o.value === f.auteursrechten);
  if (autOpt && autOpt.prijs > 0) {
    regels.push({ label: `Auteursrechten: ${autOpt.label}`, bedrag: autOpt.prijs });
  }

  return regels;
}

const DEFAULT_FORM: FormState = {
  typeOpdracht: 'modeshow',
  slots: [emptySlot()],
  opmerkingen: '',
  visagiste: false,
  visagisteUren: 1,
  hairstyliste: false,
  hairslisteUren: 1,
  fotograaf: false,
  fotografUren: 1,
  medewerker: false,
  medewerkerUren: 1,
  auteursrechten: '',
  doorpassen: false,
  lingerie: false,
  datum: '',
  geenDatum: false,
  adresOpdracht: '',
  afstandKm: '',
  kopieEmail: '',
};

function AccountValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="cm-kp-account-field">
      <span>{label}</span>
      <strong>{value?.trim() || '—'}</strong>
    </div>
  );
}

export function ModellenBoekenPanel({ token }: { token: string }) {
  const { user, refreshMe, hasBackofficeAccess } = useAuth();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [account, setAccount] = useState<AccountForm>({
    lastName: '',
    firstName: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    phone: '',
    companyName: '',
    companyType: '',
    vatNumber: '',
    email: '',
    website: '',
  });
  const [editingAccount, setEditingAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [afstandBusy, setAfstandBusy] = useState(false);
  const [afstandInfo, setAfstandInfo] = useState<string | null>(null);
  const [sent, setSent] = useState<'offerte' | 'bestelling' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const cp = user.clientProfile ?? {};
    /** Admin: Class-Models-gegevens als voorbeeldvulling (zo ziet u het als klant). */
    const cm = hasBackofficeAccess ? CLASS_MODELS_ACCOUNT : null;
    setAccount({
      lastName: user.lastName ?? '',
      firstName: user.firstName ?? '',
      street: cp.street || cm?.street || '',
      houseNumber: cp.houseNumber || cm?.houseNumber || '',
      postalCode: cp.postalCode || cm?.postalCode || '',
      city: cp.city || cm?.city || '',
      phone: user.phone || cm?.phone || '',
      companyName: user.companyName || cm?.companyName || '',
      companyType: cp.companyType || cm?.companyType || '',
      vatNumber: cp.vatNumber || cm?.vatNumber || '',
      email: cm?.email || user.email || '',
      website: cp.website || cm?.website || '',
    });
  }, [user, hasBackofficeAccess]);

  const set = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
  }, []);

  const updateSlot = (id: string, patch: Partial<ModelSlot>) => {
    setForm((f) => ({
      ...f,
      slots: f.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const regels = useMemo(() => berekenPrijs(form), [form]);
  const displayRegels = regels.length
    ? regels
    : [
        { label: 'Modellen', bedrag: 0 },
        { label: 'Extra diensten', bedrag: 0 },
        { label: 'Toeslagen / reiskosten', bedrag: 0 },
      ];
  const totaalExcl = useMemo(() => regels.reduce((s, r) => s + r.bedrag, 0), [regels]);
  const btw21 = totaalExcl * 0.21;
  const totaalIncl = totaalExcl + btw21;

  const saveAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          firstName: account.firstName,
          lastName: account.lastName,
          phone: account.phone,
          companyName: account.companyName,
          clientProfile: {
            street: account.street,
            houseNumber: account.houseNumber,
            postalCode: account.postalCode,
            city: account.city,
            companyType: account.companyType,
            vatNumber: account.vatNumber,
            website: account.website,
          },
        }),
      });
      await refreshMe(token);
      setEditingAccount(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt.');
    } finally {
      setBusy(false);
    }
  };

  const berekenAfstand = async () => {
    const adres = form.adresOpdracht.trim();
    if (adres.length < 6) {
      setError('Vul eerst het adres van de opdracht in (straat nr, gemeente).');
      return;
    }
    setAfstandBusy(true);
    setError(null);
    try {
      const r = await apiFetch<{ km: number; label: string }>('/portal/client/offerte/afstand', {
        method: 'POST',
        token,
        body: JSON.stringify({ adres }),
      });
      set('afstandKm', String(r.km));
      setAfstandInfo(`${r.km} km enkele rit — heen en terug wordt aangerekend (× 2 × € 0,70).`);
    } catch (e) {
      setAfstandInfo(null);
      setError(e instanceof Error ? e.message : 'Afstand berekenen mislukt.');
    } finally {
      setAfstandBusy(false);
    }
  };

  const validate = (): string | null => {
    if (!account.lastName.trim() || !account.firstName.trim()) return 'Naam en voornaam zijn verplicht.';
    if (!account.email.trim()) return 'E-mailadres is verplicht.';
    if (!account.phone.trim()) return 'GSM is verplicht.';
    if (!form.typeOpdracht) return 'Type opdracht is verplicht.';
    if (!form.datum && !form.geenDatum) return 'Kies een datum of vink "Nog geen datum" aan.';
    return null;
  };

  const handleSubmit = async (isBestelling: boolean) => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await apiFetch('/portal/client/offerte', {
        method: 'POST',
        token,
        body: JSON.stringify({
          isBestelling,
          naam: `${account.firstName} ${account.lastName}`.trim(),
          bedrijfsnaam: account.companyName,
          soortBedrijf: account.companyType,
          btw: account.vatNumber,
          straat: account.street,
          nr: account.houseNumber,
          postcode: account.postalCode,
          gemeente: account.city,
          gsm: account.phone,
          website: account.website,
          clientEmail: account.email,
          kopieEmail: form.kopieEmail.trim() || undefined,
          typeOpdracht: form.typeOpdracht,
          opmerkingen: form.opmerkingen,
          slots: form.slots
            .filter((s) => s.aantal > 0)
            .map((s) => ({
              aantal: s.aantal,
              leeftijdVan: s.leeftijdVan,
              leeftijdTot: s.leeftijdTot,
              uurVan: s.uurVan,
              uurTot: s.uurTot,
            })),
          datum: form.geenDatum ? 'Nog geen datum voorzien' : form.datum,
          adresOpdracht: form.adresOpdracht.trim() || undefined,
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
          Bedankt. We nemen zo snel mogelijk contact op via <strong>{account.email}</strong>.
        </p>
        <button
          type="button"
          className="nieuw-btn nieuw-btn-ghost"
          style={{ marginTop: 18 }}
          onClick={() => {
            setForm(DEFAULT_FORM);
            setSent(null);
          }}
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
          Bekijk onze tarieven en bereken meteen de prijs. Accountgegevens komen uit uw
          bedrijfsprofiel.
        </p>
      </header>

      <section className="nieuw-panel cm-kp-rates">
        <h2 className="cm-kp-titel">Prijslijst (excl. btw)</h2>
        <p className="nieuw-lead" style={{ marginBottom: 12 }}>
          Richtprijzen. Definitieve prijs na uw aanvraag.
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
                  <td>€ {t.tarief}/u</td>
                </tr>
              ))}
              <tr className="cm-kp-rates-section">
                <th colSpan={2}>Toeslagen &amp; reiskosten</th>
              </tr>
              {TARIEVEN_OVERIG.map((t) => (
                <tr key={t.label}>
                  <td>
                    {t.label}
                    {'info' in t && t.info ? <span className="cm-kp-rate-note">({t.info})</span> : null}
                  </td>
                  <td>{'tarief' in t && typeof t.tarief === 'number' ? `€ ${t.tarief}` : '—'}</td>
                </tr>
              ))}
              <tr className="cm-kp-rates-section">
                <th colSpan={2}>Auteursrechten (eenmalig)</th>
              </tr>
              {AUTEURSRECHTEN_OPTIES.filter((o) => o.value).map((o) => (
                <tr key={o.value}>
                  <td>{o.label}</td>
                  <td>€ {o.prijs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="cm-kp-booking-accordion" open>
        <summary>
          <span>
            <b>Offerte / bestelling aanvragen</b>
            <small>Accountgegevens, opdracht en live prijsberekening</small>
          </span>
        </summary>

        <section className="nieuw-panel cm-kp-booking-form">
          {/* Accountgegevens — 2 kolommen met verticale lijn */}
          <fieldset className="cm-kp-form-section cm-kp-form-section--full cm-kp-account">
            <legend>Uw gegevens</legend>
            <div className="cm-kp-account-toolbar">
              <p>Gegevens uit uw klantenaccount</p>
              <button type="button" className="nieuw-btn nieuw-btn-ghost" onClick={() => setEditingAccount((v) => !v)}>
                {editingAccount ? 'Annuleren' : 'Wijzigen'}
              </button>
            </div>

            {editingAccount ? (
              <div className="cm-kp-account-grid">
                <div className="cm-kp-account-col">
                  <label className="nieuw-field">
                    <span>Naam *</span>
                    <input value={account.lastName} onChange={(e) => setAccount({ ...account, lastName: e.target.value })} />
                  </label>
                  <label className="nieuw-field">
                    <span>Voornaam *</span>
                    <input value={account.firstName} onChange={(e) => setAccount({ ...account, firstName: e.target.value })} />
                  </label>
                  <div className="cm-kp-inline-2">
                    <label className="nieuw-field">
                      <span>Straat</span>
                      <input value={account.street} onChange={(e) => setAccount({ ...account, street: e.target.value })} />
                    </label>
                    <label className="nieuw-field cm-kp-narrow">
                      <span>Nr.</span>
                      <input value={account.houseNumber} onChange={(e) => setAccount({ ...account, houseNumber: e.target.value })} />
                    </label>
                  </div>
                  <div className="cm-kp-inline-2">
                    <label className="nieuw-field cm-kp-narrow">
                      <span>Postcode</span>
                      <input value={account.postalCode} onChange={(e) => setAccount({ ...account, postalCode: e.target.value })} />
                    </label>
                    <label className="nieuw-field">
                      <span>Gemeente</span>
                      <input value={account.city} onChange={(e) => setAccount({ ...account, city: e.target.value })} />
                    </label>
                  </div>
                  <label className="nieuw-field">
                    <span>GSM *</span>
                    <input value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
                  </label>
                </div>
                <div className="cm-kp-account-col">
                  <label className="nieuw-field">
                    <span>Bedrijfsnaam</span>
                    <input value={account.companyName} onChange={(e) => setAccount({ ...account, companyName: e.target.value })} />
                  </label>
                  <label className="nieuw-field">
                    <span>Soort bedrijf</span>
                    <select
                      className="cm-kp-select"
                      value={account.companyType}
                      onChange={(e) => setAccount({ ...account, companyType: e.target.value })}
                    >
                      <option value="">— kies —</option>
                      <option value="kledingzaak">Kledingzaak</option>
                      <option value="reclamebureau">Reclamebureau</option>
                      <option value="andere">Andere</option>
                    </select>
                  </label>
                  <label className="nieuw-field">
                    <span>BTW-nummer</span>
                    <input value={account.vatNumber} onChange={(e) => setAccount({ ...account, vatNumber: e.target.value })} />
                  </label>
                  <label className="nieuw-field">
                    <span>E-mailadres *</span>
                    <input value={account.email} disabled />
                  </label>
                  <label className="nieuw-field">
                    <span>Website</span>
                    <input value={account.website} onChange={(e) => setAccount({ ...account, website: e.target.value })} />
                  </label>
                </div>
              </div>
            ) : (
              <div className="cm-kp-account-grid">
                <div className="cm-kp-account-col">
                  <AccountValue label="Naam" value={account.lastName} />
                  <AccountValue label="Voornaam" value={account.firstName} />
                  <AccountValue label="Straat & nr." value={[account.street, account.houseNumber].filter(Boolean).join(' ')} />
                  <AccountValue label="Postcode & gemeente" value={[account.postalCode, account.city].filter(Boolean).join(' ')} />
                  <AccountValue label="GSM" value={account.phone} />
                </div>
                <div className="cm-kp-account-col">
                  <AccountValue label="Bedrijfsnaam" value={account.companyName} />
                  <AccountValue label="Soort bedrijf" value={SOORT_BEDRIJF[account.companyType] || account.companyType} />
                  <AccountValue label="BTW-nummer" value={account.vatNumber} />
                  <AccountValue label="E-mailadres" value={account.email} />
                  <AccountValue label="Website" value={account.website} />
                </div>
              </div>
            )}

            {editingAccount ? (
              <div className="cm-kp-account-save">
                <button type="button" className="nieuw-btn" disabled={busy} onClick={() => void saveAccount()}>
                  {busy ? 'Opslaan…' : 'Gegevens opslaan'}
                </button>
              </div>
            ) : null}
          </fieldset>

          {/* Opdracht: links type + slots, rechts extra diensten */}
          <fieldset className="cm-kp-form-section cm-kp-form-section--full">
            <legend>Opdracht</legend>
            <div className="cm-kp-opdracht-grid">
              <div className="cm-kp-opdracht-left">
            <label className="nieuw-field cm-kp-type-field">
              <span>Type opdracht *</span>
              <select
                className="cm-kp-select"
                value={form.typeOpdracht}
                onChange={(e) => set('typeOpdracht', e.target.value)}
              >
                <option value="modeshow">Modeshow (€ 75/u)</option>
                <option value="showroom">Showroom (€ 75/u)</option>
                <option value="fotoshoot">Fotoshoot (€ 150/u)</option>
                <option value="promowerk">Promowerk (€ 60/u)</option>
                <option value="hostess">Hostessen (€ 40/u)</option>
              </select>
            </label>

            <div className="cm-kp-slots">
              {form.slots.map((slot, idx) => (
                <div key={slot.id} className="cm-kp-slot-row">
                  <label className="nieuw-field">
                    <span>Aantal</span>
                    <input
                      type="number"
                      min={0}
                      value={slot.aantal || ''}
                      onChange={(e) => updateSlot(slot.id, { aantal: parseInt(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="nieuw-field">
                    <span>Leeftijd van</span>
                    <input
                      type="number"
                      min={0}
                      value={slot.leeftijdVan}
                      onChange={(e) => updateSlot(slot.id, { leeftijdVan: e.target.value })}
                    />
                  </label>
                  <label className="nieuw-field">
                    <span>Leeftijd tot</span>
                    <input
                      type="number"
                      min={0}
                      value={slot.leeftijdTot}
                      onChange={(e) => updateSlot(slot.id, { leeftijdTot: e.target.value })}
                    />
                  </label>
                  <label className="nieuw-field">
                    <span>Uur van</span>
                    <input
                      type="time"
                      value={slot.uurVan}
                      onChange={(e) => updateSlot(slot.id, { uurVan: e.target.value })}
                    />
                  </label>
                  <label className="nieuw-field">
                    <span>Uur tot</span>
                    <input
                      type="time"
                      value={slot.uurTot}
                      onChange={(e) => updateSlot(slot.id, { uurTot: e.target.value })}
                    />
                  </label>
                  <div className="cm-kp-slot-actions">
                    {form.slots.length > 1 ? (
                      <button
                        type="button"
                        className="cm-kp-slot-btn"
                        aria-label="Slot verwijderen"
                        onClick={() => setForm((f) => ({ ...f, slots: f.slots.filter((s) => s.id !== slot.id) }))}
                      >
                        −
                      </button>
                    ) : (
                      <span className="cm-kp-slot-spacer" />
                    )}
                    {idx === form.slots.length - 1 ? (
                      <button
                        type="button"
                        className="cm-kp-slot-btn"
                        aria-label="Slot toevoegen"
                        onClick={() => setForm((f) => ({ ...f, slots: [...f.slots, emptySlot()] }))}
                      >
                        +
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <label className="nieuw-field" style={{ marginTop: 10 }}>
              <span>Opmerkingen</span>
              <textarea
                rows={2}
                value={form.opmerkingen}
                onChange={(e) => set('opmerkingen', e.target.value)}
                placeholder="Stijl, look, bijzondere vereisten…"
              />
            </label>
              </div>

              <div className="cm-kp-opdracht-right">
                <p className="cm-kp-subkop">Extra diensten</p>
                <div className="cm-kp-check-grid cm-kp-check-grid--stack">
                  {(
                    [
                      { key: 'visagiste', urenKey: 'visagisteUren', label: 'Visagiste (€ 95/u)', uren: form.visagisteUren },
                      { key: 'hairstyliste', urenKey: 'hairslisteUren', label: 'Hairstyliste (€ 95/u)', uren: form.hairslisteUren },
                      { key: 'fotograaf', urenKey: 'fotografUren', label: 'Fotograaf (€ 175/u)', uren: form.fotografUren },
                      { key: 'medewerker', urenKey: 'medewerkerUren', label: 'Medewerk(st)er (€ 40/u)', uren: form.medewerkerUren },
                    ] as const
                  ).map(({ key, urenKey, label, uren }) => (
                    <div key={key} className="cm-kp-check-row">
                      <label>
                        <input
                          type="checkbox"
                          checked={form[key]}
                          onChange={(e) => set(key, e.target.checked)}
                        />
                        <span>{label}</span>
                      </label>
                      {form[key] ? (
                        <input
                          className="cm-kp-uren"
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={uren || ''}
                          onChange={(e) => set(urenKey, parseFloat(e.target.value) || 0)}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {/* Onderste rij: opties/reis links, prijs rechts */}
          <div className="cm-kp-bottom-grid">
            <div className="cm-kp-bottom-left">
              <fieldset className="cm-kp-form-section">
                <legend>Opties &amp; reiskosten</legend>
                <div className="cm-kp-opties-grid">
                  <div className="cm-kp-opties-checks">
                    <label className="cm-kp-check-plain">
                      <input type="checkbox" checked={form.doorpassen} onChange={(e) => set('doorpassen', e.target.checked)} />
                      <span>Doorpassen (+ € 50)</span>
                    </label>
                    <label className="cm-kp-check-plain">
                      <input type="checkbox" checked={form.lingerie} onChange={(e) => set('lingerie', e.target.checked)} />
                      <span>Lingerie / badmode (+50%)</span>
                    </label>
                  </div>
                  <div className="cm-kp-opties-velden">
                    <label className="nieuw-field">
                      <span>Auteursrechten</span>
                      <select
                        className="cm-kp-select"
                        value={form.auteursrechten}
                        onChange={(e) => set('auteursrechten', e.target.value)}
                      >
                        {AUTEURSRECHTEN_OPTIES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                            {o.prijs ? ` — € ${o.prijs}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="nieuw-field">
                      <span>Datum</span>
                      <input
                        type="date"
                        value={form.datum}
                        disabled={form.geenDatum}
                        onChange={(e) => set('datum', e.target.value)}
                      />
                    </label>
                    <label className="cm-kp-check-plain">
                      <input
                        type="checkbox"
                        checked={form.geenDatum}
                        onChange={(e) => {
                          set('geenDatum', e.target.checked);
                          if (e.target.checked) set('datum', '');
                        }}
                      />
                      <span>Nog geen datum voorzien</span>
                    </label>
                  </div>
                </div>

                <div className="cm-kp-travel">
                  <p className="cm-kp-subkop">Reiskosten</p>
                  <div className="cm-kp-travel-row">
                    <label className="nieuw-field cm-kp-travel-adres">
                      <span>Adres opdracht</span>
                      <input
                        value={form.adresOpdracht}
                        onChange={(e) => set('adresOpdracht', e.target.value)}
                        placeholder="Straat nr, gemeente"
                      />
                    </label>
                    <button
                      type="button"
                      className="nieuw-btn nieuw-btn-ghost cm-kp-travel-btn"
                      disabled={afstandBusy}
                      onClick={() => void berekenAfstand()}
                    >
                      {afstandBusy ? 'Berekenen…' : 'Bereken afstand'}
                    </button>
                    <label className="nieuw-field cm-kp-travel-km">
                      <span>Km (enkel)</span>
                      <input
                        type="number"
                        min={0}
                        value={form.afstandKm}
                        onChange={(e) => set('afstandKm', e.target.value)}
                        placeholder="0"
                      />
                    </label>
                  </div>
                  <p className="cm-kp-travel-note">
                    {afstandInfo ??
                      'Afstand van Class-Models (Provinciebaan 3, Hulshout) naar het adres van de opdracht. Heen en terug × € 0,70/km.'}
                  </p>
                </div>
              </fieldset>
            </div>

            <div className="cm-kp-bottom-right">
              <div className="cm-kp-price-box">
                <h3>Prijsoverzicht</h3>
                <table>
                  <tbody>
                    {displayRegels.map((r, i) => (
                      <tr key={i}>
                        <td>{r.label}</td>
                        <td>€ {fmt(r.bedrag)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Totaal excl. BTW</td>
                      <td>€ {fmt(totaalExcl)}</td>
                    </tr>
                    <tr>
                      <td>BTW 21%</td>
                      <td>€ {fmt(btw21)}</td>
                    </tr>
                    <tr>
                      <td>Totaal incl. BTW</td>
                      <td>€ {fmt(totaalIncl)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <label className="nieuw-field cm-kp-kopie-field">
                <span>Kopie naar e-mail (optioneel)</span>
                <input
                  type="email"
                  value={form.kopieEmail}
                  onChange={(e) => set('kopieEmail', e.target.value)}
                  placeholder="extra@adres.be"
                />
              </label>

              {error ? <p className="cm-kp-form-error">{error}</p> : null}

              <div className="cm-kp-form-actions">
                <button type="button" className="nieuw-btn nieuw-btn-ghost" disabled={busy} onClick={() => void handleSubmit(false)}>
                  {busy ? 'Bezig…' : 'Offerte aanvragen'}
                </button>
                <button type="button" className="nieuw-btn" disabled={busy} onClick={() => void handleSubmit(true)}>
                  {busy ? 'Bezig…' : 'Bestellen'}
                </button>
              </div>
              <p className="cm-kp-form-disclaimer">
                Bij «Bestellen» bevestigt u de opdracht. Bij «Offerte» ontvangt u een vrijblijvende prijsopgave.
              </p>
            </div>
          </div>
        </section>
      </details>
    </div>
  );
}
