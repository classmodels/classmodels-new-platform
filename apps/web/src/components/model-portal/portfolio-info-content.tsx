/** Info-tekst voor «Info portfolio» in het modellenportaal — zelfde stijl als try-out / opleiding. */
import type { ReactNode } from 'react';

const STUDIO_ADDRESS = 'Class-Models, Provinciebaan 3, 2235 Hulshout';

export function PortfolioInfoContent() {
  const clothingItems = [
    {
      title: 'Breng 6 verschillende outfits mee',
      body: (
        <>
          Tijdens de shoot worden er <strong style={{ color: 'var(--n-ink)' }}>totaal 6 outfits</strong> gefotografeerd.
          Zorg voor <strong style={{ color: 'var(--n-ink)' }}>variatie in stijl</strong> (bijv. casual, elegant,
          sportief, fashion, …), zodat we een sterk en breed inzetbaar portfolio kunnen maken.
        </>
      ),
    },
    {
      title: 'Lingerie / bikini of zomeroutfit',
      body: (
        <>
          Staat op uw <strong style={{ color: 'var(--n-ink)' }}>modellenfiche</strong> aangeduid dat u lingerie of
          bikini doet? Breng die look dan mee als één van de 6 outfits. Is dat niet aangeduid? Breng in de plaats een{' '}
          <strong style={{ color: 'var(--n-ink)' }}>extra zomeroutfit</strong> mee. Zo blijven we altijd bij 6 looks
          op de shoot.
        </>
      ),
    },
    {
      title: 'Kledingstaat',
      body: (
        <>
          Alle kledij moet <strong style={{ color: 'var(--n-ink)' }}>proper en gestreken</strong> zijn. Vermijd grote
          logo’s of drukke patronen die de aandacht afleiden.
        </>
      ),
    },
    {
      title: 'Schoenen',
      body: <>Breng bij elke outfit passende, propere schoenen mee.</>,
    },
  ];

  const groomingItems = [
    {
      title: 'Geen make-up op voorhand',
      body: (
        <>
          Kom <strong style={{ color: 'var(--n-ink)' }}>zonder make-up</strong>. De make-up wordt ter plaatse gedaan
          door de make-upartiest.
        </>
      ),
    },
    {
      title: 'Haar',
      body: <>Zorg dat je haar gewassen, droog en natuurlijk gestyled is.</>,
    },
    {
      title: 'Details',
      body: (
        <>
          Let op verzorgde nagels (neutraal of geen lak). Geen opvallende juwelen, tenzij deze specifiek bij een outfit
          horen.
        </>
      ),
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 0, fontSize: 12.5, lineHeight: 1.65, color: 'var(--n-mut)' }}>
      <header style={{ paddingBottom: 18 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--n-gold)',
            lineHeight: 1.4,
          }}
        >
          Informatie &amp; benodigdheden
        </p>
        <p
          style={{
            margin: '14px 0 0',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--n-ink)',
            lineHeight: 1.45,
          }}
        >
          Professionele foto’s voor uw modelprofiel en voorstellen naar klanten
        </p>
        <p style={{ margin: '12px 0 0' }}>
          Tijdens de portfolio-afspraak maken we foto’s die gebruikt worden voor uw profiel in het
          Class-Models-portaal en voor voorstellen naar klanten. Kies een beschikbaar moment; uw gegevens worden
          automatisch gekoppeld aan uw inschrijving.
        </p>
      </header>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Waarom een portfolio?</SectionTitle>
        <p style={{ margin: '10px 0 0' }}>
          Een sterk portfolio is uw visitekaartje. Klanten en casting directors willen snel zien hoe u overkomt op
          foto: houding, look, uitstraling en veelzijdigheid. Met actuele, professionele beelden kunt u sneller
          voorgesteld worden voor passende opdrachten.
        </p>
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Wat mag u verwachten?</SectionTitle>
        <CheckList
          items={[
            'Begeleiding tijdens de shoot (poses, houding, blik)',
            'Beelden die bruikbaar zijn voor uw online modelprofiel',
            'Materiaal dat Class-Models kan gebruiken bij voorstellen naar klanten',
            'Na de shoot: foto’s die klaargezet worden zodat u ze kunt downloaden wanneer ze beschikbaar zijn',
          ]}
        />
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Kledij &amp; outfits</SectionTitle>
        <NumberedList items={clothingItems} />
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Verzorging &amp; make-up</SectionTitle>
        <NumberedList items={groomingItems} />
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Planning &amp; timing</SectionTitle>
        <CheckList
          items={[
            <>
              <strong style={{ color: 'var(--n-ink)' }}>Locatie:</strong> {STUDIO_ADDRESS}
            </>,
            <>
              <strong style={{ color: 'var(--n-ink)' }}>Duur:</strong> de shoot duurt gemiddeld{' '}
              <strong style={{ color: 'var(--n-ink)' }}>2 tot 3 uur</strong>
            </>,
            <>
              <strong style={{ color: 'var(--n-ink)' }}>Aanwezigheid:</strong> wees op tijd. We raden aan om{' '}
              <strong style={{ color: 'var(--n-ink)' }}>10 minuten voor aanvang</strong> aanwezig te zijn
            </>,
          ]}
        />
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0 4px' }}>
        <SectionTitle>Inschrijven</SectionTitle>
        <p style={{ margin: '10px 0 0' }}>
          Klik op <strong style={{ color: 'var(--n-ink)' }}>Afspraak maken</strong>, kies een vrij moment in de
          agenda en bevestig. Er zijn geen extra formulieren nodig: u bent al ingelogd als model.
        </p>
        <p
          style={{
            margin: '16px 0 0',
            fontWeight: 600,
            color: 'var(--n-gold)',
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          Wij kijken ernaar uit om samen met jou een fantastisch portfolio te creëren!
        </p>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      style={{
        margin: 0,
        fontFamily: 'var(--n-serif)',
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'var(--n-gold)',
        lineHeight: 1.3,
      }}
    >
      {children}
    </h3>
  );
}

function SectionDivider() {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, var(--n-gold-hair), transparent)',
      }}
    />
  );
}

function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 7 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              marginTop: 2,
              width: 15,
              height: 15,
              borderRadius: '50%',
              border: '1px solid var(--n-gold-hair)',
              background: 'rgba(212, 175, 106, 0.12)',
              color: 'var(--n-gold)',
              fontSize: 10,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ✓
          </span>
          <span style={{ flex: 1 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: { title: string; body: ReactNode }[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 14 }}>
      {items.map((item, i) => (
        <li key={item.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              marginTop: 1,
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '1px solid var(--n-gold-hair)',
              background: 'rgba(212, 175, 106, 0.12)',
              color: 'var(--n-gold)',
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {i + 1}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--n-ink)', fontSize: 13 }}>{item.title}</p>
            <p style={{ margin: '6px 0 0' }}>{item.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
