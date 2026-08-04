/** Info-tekst voor «Info opleiding» in het modellenportaal — zelfde stijl als try-out modeshow. */
import type { ReactNode } from 'react';

export function OpleidingInfoContent() {
  const learnItems = [
    {
      title: 'Catwalktraining',
      body: (
        <>
          U leert hoe u zich zelfverzekerd, natuurlijk en professioneel over de catwalk beweegt. Bij mannequins ligt
          de nadruk op elegantie, houding en finesse. Dressmen leren een krachtige, stijlvolle en mannelijke
          presentatie neer te zetten.
        </>
      ),
    },
    {
      title: 'Poseren voor foto en show',
      body: (
        <>
          U maakt kennis met verschillende poses en leert hoe u uw lichaam, houding en gezichtsuitdrukking
          doelgericht inzet tijdens fotoshoots, castings en modeshows.
        </>
      ),
    },
    {
      title: 'Voorbereiding op opdrachten',
      body: (
        <>
          U krijgt praktische informatie over wat er van u verwacht wordt bij een modeshow, fotoshoot,
          reclamecampagne, televisieopname of andere modellenopdracht. U leert hoe u zich voorbereidt, waarop u moet
          letten en hoe u zich professioneel opstelt tegenover opdrachtgevers en medewerkers.
        </>
      ),
    },
    {
      title: 'Persoonlijke feedback',
      body: (
        <>
          De docente observeert uw houding, uitstraling en bewegingen, benoemt uw sterke punten en geeft gerichte
          tips om deze verder te ontwikkelen.
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
          Model, Mannequin &amp; Dressman
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
          Een praktijkgerichte eerste stap in de mode- en modellenwereld
        </p>
        <p style={{ margin: '12px 0 0' }}>
          Bent u klaar om uw eerste stappen te zetten in de modellenwereld? Bij Class-Models volgt u een
          doelgerichte basisopleiding waarin u de essentiële vaardigheden, kennis en professionele houding
          ontwikkelt die nodig zijn voor opdrachten in de mode- en modellenbranche.
        </p>
      </header>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Begeleiding door een ervaren professional</SectionTitle>
        <p style={{ margin: '10px 0 0' }}>
          De opleiding wordt verzorgd door een ervaren model dat al jarenlang actief is binnen de internationale
          modellenwereld. Zij deelt haar kennis, ervaring en passie vrijwillig en onbezoldigd met de deelnemers.
          Vanuit haar betrokkenheid bij het vak begeleidt zij u persoonlijk en helpt zij u om met meer
          zelfvertrouwen, inzicht en professionaliteit aan uw ontwikkeling als model te werken.
        </p>
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Wat leert u tijdens de opleiding?</SectionTitle>
        <NumberedList items={learnItems} />
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Kort, intensief en doelgericht</SectionTitle>
        <p style={{ margin: '10px 0 0' }}>
          Wij kiezen bewust voor een compacte en praktijkgerichte basisopleiding. U krijgt in korte tijd de
          belangrijkste technieken en inzichten aangereikt, zonder overbodige theorie. Zo beschikt u over een
          sterke basis en bent u beter voorbereid op de volgende stap binnen uw modellenloopbaan.
        </p>
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Vervolgtraject: Try-Out Modeshow en oefenlessen</SectionTitle>
        <p style={{ margin: '10px 0 0' }}>
          Na de basisopleiding kunt u deelnemen aan de <strong style={{ color: 'var(--n-ink)' }}>Try-Out Modeshow</strong>
          , onze praktische examenshow. Deelnemers aan deze show krijgen bovendien toegang tot{' '}
          <strong style={{ color: 'var(--n-ink)' }}>drie extra oefenlessen</strong>. Tijdens deze lessen wordt de
          volledige choreografie stap voor stap aangeleerd en ingeoefend, zodat u goed voorbereid, zelfverzekerd en
          met de juiste uitstraling het podium opgaat.
        </p>
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0 4px' }}>
        <SectionTitle>Praktisch</SectionTitle>
        <p style={{ margin: '10px 0 0' }}>
          Het opleidingsmoment duurt <strong style={{ color: 'var(--n-ink)' }}>drie uur: 14:00 tot 17:00</strong>.
          Doe iets gemakkelijks aan, breng een hakschoentje mee en eventueel iets om te drinken.
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
