/** Info-tekst voor «Info try-out modeshow» in het modellenportaal. */
import type { ReactNode } from 'react';

export function TryoutModeshowInfoContent({ priceLabel = '€ 600' }: { priceLabel?: string }) {
  const checkItems = [
    <>
      <strong style={{ color: 'var(--n-ink)' }}>30 inkomkaarten</strong> ter waarde van € 20 per kaart (totale waarde{' '}
      {priceLabel})
    </>,
    <>
      Professionele <strong style={{ color: 'var(--n-ink)' }}>setcards</strong> ter waarde van € 175
    </>,
    <>Alle professionele foto’s van de catwalk</>,
    <>Volledige filmregistratie van de modeshow</>,
    <>Professionele make-upartiesten</>,
    <>Professionele kappers</>,
    <>Drie voorbereidende oefenlessen</>,
    <>Begeleiding tijdens repetities en de show</>,
  ];

  const skillItems = [
    'Fotoshoots',
    'Reclamecampagnes',
    'Commercials',
    'Videoproducties',
    'Modepresentaties',
    'Promotionele opdrachten',
    'Andere professionele modellenopdrachten',
  ];

  return (
    <div style={{ display: 'grid', gap: 0, fontSize: 12.5, lineHeight: 1.65, color: 'var(--n-mut)' }}>
      <header style={{ paddingBottom: 18 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--n-serif)',
            fontSize: 'clamp(20px, 2.6vw, 26px)',
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: 'var(--n-gold)',
            lineHeight: 1.25,
          }}
        >
          Schrijf je in voor de Try-out Modeshow!
        </h2>
        <p
          style={{
            margin: '14px 0 0',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--n-ink)',
            lineHeight: 1.45,
          }}
        >
          Ben jij klaar om je opleiding om te zetten in echte podiumervaring?
        </p>
        <p style={{ margin: '12px 0 0' }}>
          Modellen die hun opleiding bij Class-Models volledig hebben afgerond, krijgen nu de unieke kans om deel te
          nemen aan onze spectaculaire <strong style={{ color: 'var(--n-ink)' }}>Try-out Modeshow</strong>. Dit is
          veel meer dan een gewone modeshow: het is een professioneel totaalspektakel waarbij jij jezelf kunt tonen
          aan een groot publiek én aan potentiële klanten.
        </p>
        <p style={{ margin: '10px 0 0' }}>
          Je loopt met de nieuwste collecties over een indrukwekkende{' '}
          <strong style={{ color: 'var(--n-ink)' }}>14 meter lange catwalk</strong>, omringd door stijlvol
          ingedekte ronde tafels, professionele belichting, krachtig geluid en een enthousiast publiek.
          Make-upartiesten en kappers zorgen ervoor dat je volledig verzorgd en professioneel op de catwalk
          verschijnt.
        </p>
      </header>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Een complete professionele ervaring</SectionTitle>
        <p style={{ margin: '10px 0 0' }}>
          De deelnameprijs bedraagt <strong style={{ color: 'var(--n-gold)' }}>{priceLabel}</strong>. In deze prijs is
          een uitgebreid pakket inbegrepen:
        </p>
        <CheckList items={checkItems} />
        <p style={{ margin: '14px 0 0' }}>
          Wanneer je de 30 inkomkaarten verkoopt, ontvang je de volledige deelnameprijs van{' '}
          <strong style={{ color: 'var(--n-ink)' }}>{priceLabel}</strong> terug via de kaartverkoop. Je investering
          kan op die manier volledig worden gerecupereerd, terwijl je tegelijkertijd een professionele opleiding,
          beeldmateriaal, setcards en een onvergetelijke ervaring ontvangt.
        </p>
        <p style={{ margin: '10px 0 0' }}>
          Een model dat deze carrière echt ernstig neemt, begrijpt hoe belangrijk het is om zichzelf te tonen en zal
          graag deze inspanning leveren.
        </p>
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Word gezien door klanten</SectionTitle>
        <p style={{ margin: '10px 0 0' }}>
          Tijdens de Try-out Modeshow zijn er verschillende klanten en professionele contacten aanwezig. Zij komen
          kijken naar de deelnemende modellen en kunnen modellen selecteren met wie zij het volgende seizoen willen
          samenwerken.
        </p>
        <p style={{ margin: '10px 0 0' }}>
          Vorig jaar waren er maar liefst <strong style={{ color: 'var(--n-ink)' }}>900 bezoekers</strong> aanwezig.
          Uit die modeshow zijn voor verschillende deelnemende modellen concrete opdrachten voortgekomen.
        </p>
        <p style={{ margin: '10px 0 0' }}>
          Dit is jouw kans om jezelf in levende lijve te presenteren. Een foto is belangrijk, maar klanten willen ook
          zien hoe je beweegt, hoe je een outfit draagt, hoe je op een podium staat en welke uitstraling je hebt.
        </p>
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0' }}>
        <SectionTitle>Ervaring die je overal kunt gebruiken</SectionTitle>
        <p style={{ margin: '10px 0 0' }}>
          De ervaring die je tijdens deze modeshow opdoet, is niet alleen belangrijk voor toekomstige opdrachten als
          mannequin of dressman. Je leert zelfverzekerd bewegen, professioneel poseren en omgaan met publiek,
          camera’s, kledingwissels en aanwijzingen.
        </p>
        <p style={{ margin: '10px 0 0' }}>Deze vaardigheden zijn ook bijzonder waardevol voor:</p>
        <CheckList items={skillItems} />
        <p style={{ margin: '14px 0 0' }}>
          Voor veel beginnende modellen is dit de eerste kans om deel te nemen aan een professioneel georganiseerde
          modeshow met alles erop en eraan. Het is een unieke ervaring die je portfolio versterkt en je
          zelfvertrouwen een enorme boost geeft.
        </p>
      </section>

      <SectionDivider />

      <section style={{ padding: '18px 0 4px' }}>
        <SectionTitle>Een eenmalige kans</SectionTitle>
        <p style={{ margin: '10px 0 0' }}>
          Class-Models organiseert deze Try-out Modeshow speciaal om afgestudeerde modellen de kans te geven ervaring
          op te doen, gezien te worden en nieuwe opdrachten te verkrijgen.
        </p>
        <p style={{ margin: '10px 0 0' }}>
          De organisatie van een dergelijk totaalspektakel brengt zeer hoge kosten met zich mee. Daarom vragen wij
          aan de deelnemende modellen een beperkte inspanning om het evenement mee mogelijk te maken. Daartegenover
          ontvang je een volledig professioneel pakket en kan je jouw deelnameprijs recupereren door de inkomkaarten
          te verkopen.
        </p>
        <p style={{ margin: '10px 0 0' }}>
          Deze kans is <strong style={{ color: 'var(--n-ink)' }}>eenmalig voor jouw lichting</strong>. De volgende
          Try-out Modeshow is voorbehouden voor de nieuwe lichting modellen. Laat deze gelegenheid dus niet
          voorbijgaan.
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
          Dit is jouw moment. Jouw catwalk. Jouw kans om gezien te worden.
        </p>
        <p style={{ margin: '12px 0 0' }}>
          Schrijf je vandaag nog in via het <strong style={{ color: 'var(--n-ink)' }}>Modellenportaal</strong> —
          tab <strong style={{ color: 'var(--n-ink)' }}>Try-out Modeshow</strong>.
        </p>
        <p style={{ margin: '10px 0 0' }}>
          Bekijk zeker ook de eerdere beelden via{' '}
          <strong style={{ color: 'var(--n-ink)' }}>Trailers – Try-out Modeshow</strong>.
        </p>
        <p style={{ margin: '14px 0 0', fontWeight: 600, color: 'var(--n-gold)' }}>
          Wij hopen van harte dat jij erbij bent!
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
