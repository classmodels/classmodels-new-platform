export function KlantenEventContent() {
  return (
    <div>
      {/* ─── Intro ───────────────────────────────────────────────────────── */}
      <section className="nieuw-panel" style={{ marginBottom: 28 }}>
        <span className="nieuw-label">Eventpersoneel</span>
        <h2
          className="nieuw-h3"
          style={{ color: 'var(--n-gold)', marginTop: 6, marginBottom: 14, fontWeight: 700 }}
        >
          Professioneel personeel voor uw event
        </h2>
        <p className="nieuw-lead">
          Class-Models levert professioneel eventpersoneel voor bedrijfsfeesten, personeelspartijen,
          kerstborrels, nieuwjaarsrecepties, galabanketten en elk ander soort zakelijk evenement.
          Van een intieme receptie voor 30 mensen tot een groot bedrijfsgala voor 500 gasten — ons
          team staat voor u klaar.
        </p>
        <p className="nieuw-lead" style={{ marginTop: 10 }}>
          Wij verzorgen de volledige bemensing: representatieve ontvangstdames en -heren, barmedewerkers,
          cloakroomhosts en algemene eventmedewerkers. Elk personeelslid is professioneel, stijlvol
          gekleed en goed gebriefd over uw concept en wensen.
        </p>
      </section>

      {/* ─── Foto + diensten grid ─────────────────────────────────────────── */}
      <section
        className="nieuw-panel"
        style={{
          marginBottom: 28,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: 28,
          alignItems: 'start',
        }}
      >
        <div>
          <h3 style={{ color: 'var(--n-gold)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
            Wat wij verzorgen
          </h3>
          <ul className="nieuw-checklist" style={{ marginBottom: 16 }}>
            {[
              'Ontvangst & gastenregistratie',
              'Begeleiding en zaalassistentie',
              'Bar- en cateringondersteuning',
              'Vestiaire / cloakroom',
              'PR-medewerkers en hostessen',
              'Promo-activaties tijdens uw event',
              'Fotobegeleiding en modelaanwezigheid',
              'Coördinatie en teamleiding op aanvraag',
            ].map((item) => (
              <li key={item}>
                <span className="v" style={{ color: 'var(--n-gold)' }}>✓</span>
                <span style={{ fontSize: 13 }}>{item}</span>
              </li>
            ))}
          </ul>
          <div
            style={{
              background: 'var(--n-bg-3)',
              border: '1px solid var(--n-hair)',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--n-mut)', margin: 0 }}>
              <strong style={{ color: 'var(--n-gold)' }}>Tip:</strong> Boek uw eventpersoneel
              minstens 2 weken op voorhand voor optimale beschikbaarheid. Last-minute aanvragen
              behandelen wij waar mogelijk.
            </p>
          </div>
        </div>
        <div style={{ borderRadius: 10, overflow: 'hidden', lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nieuw/hero-4.jpg"
            alt="Eventpersoneel Class-Models"
            loading="lazy"
            decoding="async"
            width={600}
            height={400}
            style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 10 }}
          />
        </div>
      </section>

      {/* ─── Event types ──────────────────────────────────────────────────── */}
      <section className="nieuw-panel" style={{ marginBottom: 28 }}>
        <h3 style={{ color: 'var(--n-gold)', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
          Populaire evenementen
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          {[
            { icoon: '🎄', label: 'Kerstborrel', sub: 'december evenementen' },
            { icoon: '🥂', label: 'Nieuwjaarsreceptie', sub: 'januari activaties' },
            { icoon: '🎉', label: 'Personeelsfeest', sub: 'teambuilding events' },
            { icoon: '🏢', label: 'Bedrijfsgala', sub: 'galadiner & galabal' },
            { icoon: '🎗️', label: 'Productlancering', sub: 'launch events' },
            { icoon: '🤝', label: 'Klantenevent', sub: 'relatiebeheer' },
            { icoon: '🎓', label: 'Academische zitting', sub: 'afstudeerceremonies' },
            { icoon: '🏆', label: 'Awards & prijsuitreikingen', sub: 'ceremonies' },
          ].map((evt) => (
            <div
              key={evt.label}
              style={{
                background: 'var(--n-bg-2)',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1.3 }}>{evt.icoon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--n-ink)' }}>{evt.label}</div>
                <div style={{ fontSize: 11, color: 'var(--n-mut)', marginTop: 2 }}>{evt.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Foto + werkwijze ──────────────────────────────────────────────── */}
      <section
        className="nieuw-panel"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: 28,
          alignItems: 'start',
        }}
      >
        <div style={{ borderRadius: 10, overflow: 'hidden', lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nieuw/hero-6.jpg"
            alt="Class-Models event samenwerking"
            loading="lazy"
            decoding="async"
            width={600}
            height={400}
            style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 10 }}
          />
        </div>
        <div>
          <h3 style={{ color: 'var(--n-gold)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
            Onze werkwijze
          </h3>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            {[
              {
                stap: '1. Intakegesprek',
                tekst: 'We bespreken het concept, de locatie, het aantal gasten en uw specifieke wensen.',
              },
              {
                stap: '2. Personeelsselectie',
                tekst: 'Op basis van uw briefing selecteren wij het meest geschikte team.',
              },
              {
                stap: '3. Briefing & voorbereiding',
                tekst: 'Elk personeelslid ontvangt een gedetailleerde briefing over uw evenement.',
              },
              {
                stap: '4. Dag van het event',
                tekst: 'Ons team is tijdig aanwezig, professioneel gekleed en volledig voorbereid.',
              },
              {
                stap: '5. Nazorg',
                tekst: 'Na het event ontvangt u een factuur en vragen wij kort uw feedback.',
              },
            ].map((item) => (
              <li
                key={item.stap}
                style={{ marginBottom: 12, paddingLeft: 4 }}
              >
                <strong style={{ color: 'var(--n-gold)', fontSize: 13 }}>{item.stap}</strong>
                <p style={{ fontSize: 12, color: 'var(--n-mut)', margin: '3px 0 0', lineHeight: 1.55 }}>
                  {item.tekst}
                </p>
              </li>
            ))}
          </ol>
          <div
            style={{
              background: 'var(--n-bg-3)',
              border: '1px solid var(--n-hair)',
              borderRadius: 8,
              padding: '12px 16px',
              marginTop: 16,
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--n-mut)', margin: 0 }}>
              Interesse? Gebruik het formulier &ldquo;Modellen boeken&rdquo; om een offerte of
              bestelling in te dienen. Selecteer <strong>Hostessen</strong> als type opdracht en
              beschrijf uw event in het opmerkingenveld.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
