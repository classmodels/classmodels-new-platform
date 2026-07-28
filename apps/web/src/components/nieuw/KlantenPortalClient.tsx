'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';

const PACKAGES = [
  {
    name: 'Starter casting',
    price: 'vanaf € 350',
    blurb: 'Ideaal voor een snelle selectie van 3–5 passende modellen.',
    items: [
      'Briefing intake (telefonisch of mail)',
      'Voorselectie op basis van look & beschikbaarheid',
      'Digitale castingfiche per model',
      'Eén herzieningsronde',
    ],
  },
  {
    name: 'Campagne selectie',
    price: 'vanaf € 790',
    blurb: 'Voor merken die een gerichte shortlist willen met duidelijke opties.',
    items: [
      'Uitgebreide briefing & moodboard-afstemming',
      'Shortlist van 8–12 modellen',
      'Vergelijkbare look-alternatieven',
      'Ondersteuning bij opties & bevestiging',
    ],
  },
  {
    name: 'Full production support',
    price: 'op maat',
    blurb: 'Casting + planning + opvolging voor shoots, events of modeshows.',
    items: [
      'Volledige casting tot definitieve boeking',
      'Contract & callsheet-ondersteuning',
      'Backup-modellen bij uitval',
      'Dedicated contactpersoon',
    ],
  },
] as const;

const STEPS = [
  {
    title: 'Briefing',
    text: 'U bezorgt look, doelgroep, data, locatie en budget. Wij vertalen dat naar een heldere castingvraag.',
  },
  {
    title: 'Selectie',
    text: 'U ontvangt een shortlist met fiches. U kiest favorieten of vraagt alternatieven.',
  },
  {
    title: 'Bevestiging',
    text: 'Wij checken beschikbaarheid, opties en voorwaarden. U bevestigt de definitieve keuze.',
  },
  {
    title: 'Op de set',
    text: 'Modellen komen voorbereid. Wij blijven bereikbaar voor last-minute wijzigingen.',
  },
] as const;

const DEMO_MODELS = [
  { name: 'Emma', meta: 'Vrouw · 24 · 174 cm', img: '/nieuw/hero-2.jpg' },
  { name: 'Noah', meta: 'Man · 27 · 186 cm', img: '/nieuw/modellenportaal.jpg' },
  { name: 'Lina', meta: 'Vrouw · 19 · 170 cm', img: '/nieuw/hero-1.jpg' },
  { name: 'Jules', meta: 'Man · 31 · 182 cm', img: '/nieuw/hero-4.jpg' },
  { name: 'Mila', meta: 'Vrouw · 22 · 168 cm', img: '/nieuw/gastenportaal.jpg' },
  { name: 'Arthur', meta: 'Man · 25 · 188 cm', img: '/nieuw/hero-6.jpg' },
] as const;

export function KlantenPortalClient() {
  const { user, token, loading, can, logout } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
    project: '',
    date: '',
    notes: '',
  });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loginHint, setLoginHint] = useState(false);

  const isClient = Boolean(user?.roles?.includes('client'));
  const isAdmin = Boolean(
    user?.roles?.includes('admin') ||
      can('*') ||
      user?.permissions?.some((p) => p.startsWith('admin.')),
  );
  const canEnter = Boolean(user && (isClient || isAdmin));
  const canSubmitCasting = Boolean(user && token && canEnter);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setLoginHint(false);

    if (!user || !token) {
      setLoginHint(true);
      return;
    }

    if (!canSubmitCasting) {
      setSubmitError('Castingaanvragen zijn beschikbaar voor klantenaccounts.');
      return;
    }

    setBusy(true);
    try {
      const title = form.project.trim() || 'Castingaanvraag';
      const bodyParts = [
        `Bedrijf: ${form.company.trim()}`,
        `Contactpersoon: ${form.contact.trim()}`,
        `E-mail: ${form.email.trim()}`,
        form.phone.trim() ? `Telefoon: ${form.phone.trim()}` : null,
        `Project: ${form.project.trim()}`,
        form.date.trim() ? `Gewenste datum / periode: ${form.date.trim()}` : null,
        form.notes.trim() ? `Extra info: ${form.notes.trim()}` : null,
        selected.length ? `Shortlist: ${selected.join(', ')}` : null,
      ].filter(Boolean);
      const body = bodyParts.join('\n');

      await apiFetch('/portal/client/briefs', {
        method: 'POST',
        token,
        body: JSON.stringify({ title, body }),
      });
      setSent(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Verzenden mislukt.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="nieuw-uc" style={{ background: 'var(--n-bg)', minHeight: '40vh' }}>
        <p className="nieuw-lead">Laden…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="nieuw-sectie" style={{ paddingTop: 36 }}>
        <div className="nieuw-wrap" style={{ maxWidth: 560 }}>
          <span className="nieuw-label">Klantenportaal</span>
          <h1 className="nieuw-display" style={{ marginTop: 4, fontSize: 'clamp(28px, 4vw, 44px)' }}>
            Welkom <em>terug</em>
          </h1>
          <p className="nieuw-lead">
            Log in met uw klantenaccount om castingaanvragen en tarieven te beheren.
          </p>
          <div className="nieuw-hero-actions" style={{ marginTop: 24 }}>
            <Link className="nieuw-btn" href="/nieuw/inloggen">
              Inloggen
            </Link>
            <Link className="nieuw-btn nieuw-btn-ghost" href="/nieuw/klanten/registreren">
              Klantenaccount aanmaken
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!canEnter) {
    return (
      <section className="nieuw-sectie" style={{ paddingTop: 36 }}>
        <div className="nieuw-wrap" style={{ maxWidth: 560 }}>
          <span className="nieuw-label">Klantenportaal</span>
          <h1 className="nieuw-display" style={{ marginTop: 4, fontSize: 'clamp(28px, 4vw, 44px)' }}>
            Geen <em>toegang</em>
          </h1>
          <p className="nieuw-lead">
            Dit portaal is bestemd voor klantenaccounts. U bent momenteel met een ander type
            account ingelogd.
          </p>
          <div className="nieuw-hero-actions" style={{ marginTop: 24 }}>
            <Link className="nieuw-btn" href="/nieuw">
              Naar home
            </Link>
            <button type="button" className="nieuw-btn nieuw-btn-ghost" onClick={() => void logout()}>
              Uitloggen
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="nieuw-hero nieuw-hero-compact">
        <div className="nieuw-wrap nieuw-hero-grid">
          <div>
            <span className="nieuw-label">Voor merken &amp; bedrijven</span>
            <h1 className="nieuw-display">
              Modellen
              <br />
              <em>boeken</em>
            </h1>
            <p className="nieuw-lead nieuw-hero-lead">
              Class-Models levert casting en boekingen voor campagnes, reclame, events,
              modeshows en productshoots. Duidelijke selectie, snelle shortlists en professionele
              opvolging.
            </p>
            <div className="nieuw-hero-actions">
              <a className="nieuw-btn" href="#bestellen">
                Casting aanvragen
              </a>
              <a className="nieuw-btn nieuw-btn-ghost" href="#tarieven">
                Bekijk tarieven
              </a>
            </div>
          </div>
          <aside className="nieuw-hero-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nieuw/klantenportaal.jpg" alt="Klantenoverleg bij Class-Models" />
            <div className="nieuw-hero-card-body">
              <h2>Wat u krijgt</h2>
              <ul>
                <li>Gerichte shortlist op look &amp; beschikbaarheid</li>
                <li>Heldere fiches per model</li>
                <li>Ondersteuning tot op de set</li>
                <li>Backup-opties bij uitval</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="nieuw-sectie" id="tarieven">
        <div className="nieuw-wrap">
          <span className="nieuw-label">Tarieven</span>
          <h2 className="nieuw-display nieuw-display-md">
            Duidelijke <em>formules</em>
          </h2>
          <p className="nieuw-lead">
            Indicatieve casting- en selectietarieven. Modelhonoraria hangen af van gebruik,
            exclusiviteit en productieduur — die bevestigen we na uw briefing.
          </p>
          <div className="nieuw-grid-3" style={{ marginTop: 28 }}>
            {PACKAGES.map((p) => (
              <article key={p.name} className="nieuw-panel nieuw-price-card">
                <span className="nieuw-label">{p.name}</span>
                <div className="nieuw-price">{p.price}</div>
                <p className="nieuw-lead" style={{ marginTop: 10, maxWidth: 'none' }}>
                  {p.blurb}
                </p>
                <ul className="nieuw-checklist" style={{ marginTop: 16 }}>
                  {p.items.map((item) => (
                    <li key={item}>
                      <span className="v">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nieuw-sectie nieuw-sectie-alt">
        <div className="nieuw-wrap">
          <span className="nieuw-label">Werkwijze</span>
          <h2 className="nieuw-display nieuw-display-md">
            Van briefing tot <em>set</em>
          </h2>
          <div className="nieuw-steps" style={{ marginTop: 28 }}>
            {STEPS.map((s) => (
              <div key={s.title} className="nieuw-stap">
                <p>
                  <strong>{s.title}.</strong> {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="nieuw-sectie" id="modellen">
        <div className="nieuw-wrap">
          <span className="nieuw-label">Selectie</span>
          <h2 className="nieuw-display nieuw-display-md">
            Kies <em>modellen</em>
          </h2>
          <p className="nieuw-lead">Selecteer favorieten voor uw aanvraag.</p>
          <div className="nieuw-models" style={{ marginTop: 24 }}>
            {DEMO_MODELS.map((m) => {
              const on = selected.includes(m.name);
              return (
                <button
                  key={m.name}
                  type="button"
                  className={`nieuw-model${on ? ' selected' : ''}`}
                  onClick={() => toggle(m.name)}
                >
                  <div className="nieuw-model-foto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.img} alt={m.name} />
                    {on ? <span className="nieuw-model-badge">Gekozen</span> : null}
                  </div>
                  <div className="nieuw-model-meta">
                    <h4>{m.name}</h4>
                    <p>{m.meta}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="nieuw-lead" style={{ marginTop: 18 }}>
            Shortlist: {selected.length ? selected.join(', ') : 'nog geen selectie'}
          </p>
        </div>
      </section>

      <section className="nieuw-sectie nieuw-sectie-alt" id="bestellen">
        <div className="nieuw-wrap" style={{ maxWidth: 760 }}>
          <span className="nieuw-label">Aanvraag</span>
          <h2 className="nieuw-display nieuw-display-md">
            Casting <em>aanvragen</em>
          </h2>
          {sent ? (
            <div className="nieuw-panel" style={{ marginTop: 24, borderColor: 'var(--n-gold-hair)' }}>
              <h3 className="nieuw-h3">Aanvraag ontvangen</h3>
              <p className="nieuw-lead">Bedankt. We hebben uw aanvraag ontvangen.</p>
              <Link className="nieuw-btn" href="/nieuw" style={{ marginTop: 18 }}>
                Terug naar home
              </Link>
            </div>
          ) : (
            <form className="nieuw-panel" style={{ marginTop: 24 }} onSubmit={(e) => void onSubmit(e)}>
              <div className="nieuw-form-grid">
                <label className="nieuw-field">
                  <span>Bedrijf</span>
                  <input
                    required
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </label>
                <label className="nieuw-field">
                  <span>Contactpersoon</span>
                  <input
                    required
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  />
                </label>
                <label className="nieuw-field">
                  <span>E-mail</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <label className="nieuw-field">
                  <span>Telefoon</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </label>
                <label className="nieuw-field nieuw-field-full">
                  <span>Type project</span>
                  <input
                    required
                    placeholder="bv. campagne, event, productshoot, modeshow"
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                  />
                </label>
                <label className="nieuw-field nieuw-field-full">
                  <span>Gewenste datum / periode</span>
                  <input
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <label className="nieuw-field nieuw-field-full">
                  <span>Extra info / look</span>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Doelgroep, sfeer, aantal modellen, locatie…"
                  />
                </label>
              </div>
              {selected.length ? (
                <p className="nieuw-lead" style={{ marginTop: 14 }}>
                  Meegestuurd: shortlist {selected.join(', ')}
                </p>
              ) : null}
              {loginHint ? (
                <p style={{ color: '#e8a0a0', fontSize: 13, margin: '14px 0 0' }}>
                  Log in om uw castingaanvraag te versturen.{' '}
                  <Link className="nieuw-link" href="/nieuw/inloggen">
                    Naar inloggen
                  </Link>
                </p>
              ) : null}
              {submitError ? (
                <p style={{ color: '#e8a0a0', fontSize: 13, margin: '14px 0 0' }}>{submitError}</p>
              ) : null}
              <button className="nieuw-btn" type="submit" disabled={busy} style={{ marginTop: 20 }}>
                {busy ? 'Bezig…' : 'Verstuur castingaanvraag →'}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
