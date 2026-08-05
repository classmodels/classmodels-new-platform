import Image from 'next/image';

export function KlantenWatBiedenContent() {
  return (
    <div>
      {/* ─── Selectie van Modellen ──────────────────────────────────────── */}
      <section className="nieuw-panel" style={{ marginBottom: 28 }}>
        <h2 className="nieuw-h3" style={{ color: 'var(--n-gold)', marginBottom: 14, fontWeight: 700 }}>
          Selectie van Modellen
        </h2>
        <p className="nieuw-lead">
          Class-Models beschikt over een uitgebreide databank van professionele modellen voor iedere
          toepassing — van modeshoots en reclamecampagnes tot modeshows en promotionele activaties.
          Elk model is persoonlijk geselecteerd op professionaliteit, uitstraling en betrouwbaarheid.
        </p>
        <p className="nieuw-lead" style={{ marginTop: 10 }}>
          Wij geloven in een diverse, inclusieve casting die de échte wereld weerspiegelt. Onze modellen
          zijn geselecteerd op talent en uitstraling — ongeacht leeftijd, maat of achtergrond.
        </p>

        {/* Highlight box */}
        <div
          style={{
            background: 'var(--n-bg-3)',
            border: '1px solid var(--n-gold-hair, var(--n-hair))',
            borderRadius: 10,
            padding: '18px 22px',
            marginTop: 20,
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-gold)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Ons modellenbestand omvat
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
            }}
          >
            {[
              { icoon: '👦', label: 'Kinderen & tieners', sub: 'jongens en meisjes' },
              { icoon: '👩', label: 'Vrouwen', sub: 'alle leeftijden' },
              { icoon: '👨', label: 'Mannen', sub: 'alle leeftijden' },
              { icoon: '👗', label: 'Maatje meer', sub: 'curvy modellen' },
              { icoon: '👴', label: '50+', sub: 'senior modellen' },
            ].map((cat) => (
              <div
                key={cat.label}
                style={{
                  background: 'var(--n-bg-2)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 22 }}>{cat.icoon}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--n-ink)' }}>{cat.label}</span>
                <span style={{ fontSize: 11, color: 'var(--n-mut)' }}>{cat.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Hostessen boeken ─────────────────────────────────────────────── */}
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
        <div style={{ borderRadius: 10, overflow: 'hidden', lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nieuw/hero-1.jpg"
            alt="Hostessen bij Class-Models"
            loading="lazy"
            decoding="async"
            width={600}
            height={400}
            style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 10 }}
          />
        </div>
        <div>
          <h2 className="nieuw-h3" style={{ color: 'var(--n-gold)', marginBottom: 14, fontWeight: 700 }}>
            Hostessen boeken bij Class-Models
          </h2>
          <p className="nieuw-lead">
            Professionele hostessen en hosts voor beurzen, events, opendeurdagen, receptions en
            bedrijfsactiviteiten. Class-Models levert gemotiveerde, representatieve medewerkers die uw
            merk écht uitdragen.
          </p>
          <p className="nieuw-lead" style={{ marginTop: 10 }}>
            Of het nu gaat om een kleinschalige productlancering of een grootschalige vakbeurs — ons
            team zorgt voor een vlekkeloze ontvangst en een positieve merkbeleving bij elk contact.
          </p>
          <ul className="nieuw-checklist" style={{ marginTop: 16 }}>
            {[
              'Tweetalig (NL/FR) of meertalig beschikbaar',
              'Gepast gekleed voor uw concept',
              'Ervaring met receptie, promotie en gidswerk',
              'Snelle inzetbaarheid, ook last-minute',
            ].map((item) => (
              <li key={item}>
                <span className="v" style={{ color: 'var(--n-gold)' }}>✓</span>
                <span style={{ fontSize: 13 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Promoteams ──────────────────────────────────────────────────── */}
      <section
        className="nieuw-panel"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: 28,
          alignItems: 'start',
        }}
      >
        <div>
          <h2 className="nieuw-h3" style={{ color: 'var(--n-gold)', marginBottom: 14, fontWeight: 700 }}>
            Promoteams op maat
          </h2>
          <p className="nieuw-lead">
            Class-Models stelt complete promoteams samen voor straatpromotie, sampling-acties,
            productlanceringen en retail-activaties. Onze Promo Girls en Boys zijn enthousiast,
            klantgericht en gewend om uw doelgroep aan te spreken.
          </p>
          <p className="nieuw-lead" style={{ marginTop: 10 }}>
            Van een duo in een winkelcentrum tot een groep van twintig op een groot evenement —
            Class-Models coördineert de logistiek en zorgt dat elk teamlid goed gebriefd op de locatie
            verschijnt.
          </p>
          <ul className="nieuw-checklist" style={{ marginTop: 16 }}>
            {[
              'Promo Girls & Boys (€ 60/u)',
              'Hostessen en hosts (€ 40/u)',
              'Begeleiding en teamcoördinatie mogelijk',
              'Werkkleding of huisstijl op aanvraag',
            ].map((item) => (
              <li key={item}>
                <span className="v" style={{ color: 'var(--n-gold)' }}>✓</span>
                <span style={{ fontSize: 13 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ borderRadius: 10, overflow: 'hidden', lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nieuw/hero-2.jpg"
            alt="Promoteam Class-Models"
            loading="lazy"
            decoding="async"
            width={600}
            height={400}
            style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 10 }}
          />
        </div>
      </section>
    </div>
  );
}
