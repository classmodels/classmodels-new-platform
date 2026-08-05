export function KlantenWaarStaatContent() {
  return (
    <div>
      {/* ─── Welcome banner ──────────────────────────────────────────────── */}
      <section
        className="nieuw-panel"
        style={{
          background: 'var(--n-bg-3)',
          border: '1px solid var(--n-gold-hair, var(--n-hair))',
          marginBottom: 28,
          textAlign: 'center',
          padding: '32px 24px',
        }}
      >
        <span className="nieuw-label">Klantenportaal</span>
        <h1
          className="nieuw-display"
          style={{ fontSize: 'clamp(22px, 3.5vw, 38px)', marginTop: 8, marginBottom: 14 }}
        >
          Welkom bij <em>Class-Models</em>
        </h1>
        <p className="nieuw-lead" style={{ maxWidth: 640, margin: '0 auto' }}>
          Jouw partner in stijl en professionalisme. Wij verbinden merken, bedrijven en organisaties
          met het juiste talent — snel, transparant en persoonlijk.
        </p>
      </section>

      {/* ─── Onze filosofie ──────────────────────────────────────────────── */}
      <section className="nieuw-panel" style={{ marginBottom: 28 }}>
        <h2 className="nieuw-h3" style={{ color: 'var(--n-gold)', marginBottom: 14, fontWeight: 700 }}>
          Onze filosofie
        </h2>
        <p className="nieuw-lead">
          Bij Class-Models geloven we dat mode, stijl en representatie meer zijn dan uiterlijk. Het
          gaat om authenticiteit, zelfvertrouwen en de kracht van een sterk verhaal. Elk model dat wij
          begeleiden, elke klant die wij ondersteunen — we doen het met dezelfde toewijding: persoonlijk,
          professioneel en met oog voor detail.
        </p>
        <p className="nieuw-lead" style={{ marginTop: 10 }}>
          We werken niet met anonieme databases of automatische koppeltools. Elke casting begint met
          een gesprek. We luisteren naar uw noden, begrijpen uw merk en selecteren op basis van echte
          compatibiliteit — niet enkel op looks.
        </p>
      </section>

      {/* ─── Diversiteit & inclusie ──────────────────────────────────────── */}
      <section className="nieuw-panel" style={{ marginBottom: 28 }}>
        <h2 className="nieuw-h3" style={{ color: 'var(--n-gold)', marginBottom: 14, fontWeight: 700 }}>
          Diversiteit &amp; inclusie
        </h2>
        <p className="nieuw-lead">
          Class-Models werkt met modellen van alle leeftijden, maten en achtergronden. Van kinderen
          en tieners over vrouwen en mannen tot 50+-modellen en curvy-modellen — wij leveren de
          diversiteit die uw doelgroep verdient.
        </p>
        <p className="nieuw-lead" style={{ marginTop: 10 }}>
          Representatie is geen trend voor ons, maar een fundamentele overtuiging. Een merk dat
          authentiek wil communiceren, heeft modellen nodig die de werkelijke samenleving
          weerspiegelen. Dat is precies wat wij bieden.
        </p>
      </section>

      {/* ─── Modeshows & events ──────────────────────────────────────────── */}
      <section className="nieuw-panel" style={{ marginBottom: 28 }}>
        <h2 className="nieuw-h3" style={{ color: 'var(--n-gold)', marginBottom: 14, fontWeight: 700 }}>
          Modeshows &amp; events
        </h2>
        <p className="nieuw-lead">
          Class-Models organiseert en bemannen modeshows voor kledingzaken, winkelcentra,
          reclameproducties en bedrijfsevents. We verzorgen de volledige casting — van eerste contactname
          tot briefing op de dag zelf.
        </p>
        <p className="nieuw-lead" style={{ marginTop: 10 }}>
          Naast commerciële modeshows ondersteunt Class-Models ook opleidingsgerelateerde shows en
          examenshows waarbij studenten de kans krijgen hun talent voor het eerst voor een publiek te
          tonen. Via onze try-out- en examenshowprojecten begeleiden wij nieuw talent in hun eerste
          stappen.
        </p>
      </section>

      {/* ─── Missie ──────────────────────────────────────────────────────── */}
      <section className="nieuw-panel" style={{ marginBottom: 28 }}>
        <h2 className="nieuw-h3" style={{ color: 'var(--n-gold)', marginBottom: 14, fontWeight: 700 }}>
          Onze missie
        </h2>
        <p className="nieuw-lead">
          Class-Models wil de meest betrouwbare castingpartner zijn voor Belgische bedrijven en merken.
          Niet de grootste, maar de beste in service, selectie en persoonlijke opvolging. We bouwen
          langetermijnrelaties op — met onze modellen én met onze klanten.
        </p>
        <p className="nieuw-lead" style={{ marginTop: 10 }}>
          Transparantie staat centraal: duidelijke tarieven, eerlijke contracten en open communicatie.
          U weet altijd waarvoor u betaalt, en u kunt altijd bij ons terecht met vragen of
          aanpassingen.
        </p>
      </section>

      {/* ─── Waarom samenwerken ──────────────────────────────────────────── */}
      <section className="nieuw-panel">
        <h2 className="nieuw-h3" style={{ color: 'var(--n-gold)', marginBottom: 14, fontWeight: 700 }}>
          Waarom samenwerken met Class-Models?
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
            marginTop: 4,
          }}
        >
          {[
            {
              titel: 'Persoonlijke aanpak',
              tekst: 'Geen geautomatiseerde selectie, maar een menselijk gesprek als startpunt van elke samenwerking.',
            },
            {
              titel: 'Snelle respons',
              tekst: 'We beantwoorden aanvragen binnen 24 uur en leveren shortlists op maat binnen de afgesproken termijn.',
            },
            {
              titel: 'Brede expertise',
              tekst: 'Van modeshow en fotoshoot tot hostessen en promoteams — Class-Models dekt het volledige spectrum.',
            },
            {
              titel: 'Transparante tarieven',
              tekst: 'Alle tarieven zijn vooraf gekend. Geen verborgen kosten, geen verrassingen achteraf.',
            },
            {
              titel: 'Kwaliteitsgarantie',
              tekst: 'Elk model is persoonlijk geselecteerd en gebriefd. Bij uitval voorzien we altijd een back-up.',
            },
            {
              titel: 'Volledig ontzorgd',
              tekst: 'Van casting tot contracten en callsheets — wij regelen het zodat u zich kunt focussen op uw core business.',
            },
          ].map((item) => (
            <div
              key={item.titel}
              style={{
                background: 'var(--n-bg-2)',
                borderRadius: 8,
                padding: '14px 16px',
                borderLeft: '3px solid var(--n-gold)',
              }}
            >
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-gold)', marginBottom: 6 }}>
                {item.titel}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--n-mut)', margin: 0, lineHeight: 1.55 }}>
                {item.tekst}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
