import { KpAccordeon, KpCheck, KpFotoTekst, KpTitel } from './content-shared';

export function KlantenEventContent() {
  return (
    <div className="cm-kp">
      {/* ─── Kop ─────────────────────────────────────────────────────────── */}
      <header style={{ paddingBottom: 2 }}>
        <h1 className="cm-kp-paginatitel">Een event organiseren? Wij helpen u!</h1>
        <p style={{ marginTop: 8, maxWidth: 720 }}>
          Maak gebruik van ons professioneel eventsbureau. Zo kunt u zich volledig richten op de
          inhoud en het succes van uw bedrijf, terwijl de organisatie van het evenement in goede
          handen is — van een intieme receptie tot een groot bedrijfsgala.
        </p>
      </header>

      {/* ─── Foto links, tekst rechts ────────────────────────────────────── */}
      <KpFotoTekst foto="/nieuw/hero-4.jpg" alt="Eventpersoneel van Class-Models">
        <KpTitel>Wat wij verzorgen</KpTitel>
        <p>
          Class-Models levert professioneel eventpersoneel en neemt desgewenst de volledige
          organisatie uit handen: locatie, aankleding, catering, entertainment en decoratie.
        </p>
        <KpCheck
          items={[
            'Ontvangst en gastenregistratie',
            'Begeleiding en zaalassistentie',
            'Bar- en cateringondersteuning',
            'Vestiaire / cloakroom',
            'PR-medewerkers en hostessen',
            'Promo-activaties tijdens uw event',
            'Coördinatie en teamleiding op aanvraag',
          ]}
        />
        <p style={{ marginTop: 12 }}>
          <strong>Tip:</strong> boek uw eventpersoneel minstens twee weken op voorhand voor optimale
          beschikbaarheid. Last-minute aanvragen behandelen wij waar mogelijk.
        </p>
      </KpFotoTekst>

      {/* ─── Populaire evenementen ───────────────────────────────────────── */}
      <section className="cm-kp-panel">
        <KpTitel>Populaire evenementen</KpTitel>
        <div className="cm-kp-cellen">
          {[
            { naam: 'Personeelsfeest', sub: 'teambuilding en waardering' },
            { naam: 'Kerstborrel', sub: 'eindejaarsevenementen' },
            { naam: 'Nieuwjaarsreceptie', sub: 'januari-activaties' },
            { naam: 'Bedrijfsopening', sub: 'bedrijfshappening' },
            { naam: 'Bedrijfsgala', sub: 'galadiner en galabal' },
            { naam: 'Productlancering', sub: 'launch events' },
            { naam: 'Klantenevent', sub: 'relatiebeheer' },
            { naam: 'Awards', sub: 'prijsuitreikingen en ceremonies' },
          ].map((evt) => (
            <div key={evt.naam} className="cm-kp-cel">
              <b>{evt.naam}</b>
              <span>{evt.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tekst links, foto rechts ────────────────────────────────────── */}
      <KpFotoTekst foto="/nieuw/hero-6.jpg" alt="Samenwerking op een event van Class-Models" fotoRechts>
        <KpTitel>Onze werkwijze</KpTitel>
        <KpCheck
          items={[
            <>
              <strong>Intakegesprek</strong> — we bespreken concept, locatie, aantal gasten en uw
              wensen
            </>,
            <>
              <strong>Personeelsselectie</strong> — op basis van uw briefing selecteren wij het meest
              geschikte team
            </>,
            <>
              <strong>Briefing</strong> — elk personeelslid wordt gedetailleerd gebrieft over uw
              evenement
            </>,
            <>
              <strong>Dag van het event</strong> — ons team is tijdig aanwezig, professioneel gekleed
              en voorbereid
            </>,
            <>
              <strong>Nazorg</strong> — na het event ontvangt u de factuur en vragen we kort uw
              feedback
            </>,
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Interesse? Gebruik <strong>Modellen boeken / tarieven</strong> om een offerte of bestelling
          in te dienen en beschrijf uw event in het opmerkingenveld.
        </p>
      </KpFotoTekst>

      {/* ─── Accordeons ──────────────────────────────────────────────────── */}
      <KpAccordeon titel="Personeelsfeest">
        <p>
          Een personeelsfeest versterkt de band tussen medewerkers en bevordert de samenwerking. Het
          zorgt voor een positieve werksfeer en draagt bij aan het behouden van talent binnen de
          organisatie.
        </p>
        <p>
          Wij nemen al uw zorgen uit handen: van locatie en catering tot entertainment en decoratie.
          Ons ervaren team maakt samen met u een plan op maat, passend bij uw bedrijfscultuur en
          budget. Samen maken we er een onvergetelijke gebeurtenis van!
        </p>
      </KpAccordeon>

      <KpAccordeon titel="Kerstborrel en nieuwjaarsreceptie">
        <p>
          Een kerstborrel, nieuwjaarsreceptie of een andere speciale dag voor u en uw medewerkers die
          niet zomaar mag passeren? Een receptie met een hapje en een tapje is altijd een leuk moment
          om samen bij te praten.
        </p>
        <p>
          U kan kiezen voor een formele receptie in een leuk kader of een uitbundige avondreceptie
          met veel toeters en bellen — aan u de keuze. Wij regelen alles tot in de puntjes, zodat u
          en uw medewerkers zorgeloos kunnen genieten. Zo wordt uw receptie een gebeurtenis waar nog
          lang over nagepraat zal worden.
        </p>
      </KpAccordeon>

      <KpAccordeon titel="Bedrijfsopening">
        <p>
          Bij een bedrijfsopening is het belangrijk om de boodschap en identiteit van uw bedrijf
          duidelijk naar voren te laten komen. Denk hierbij aan de keuze van locatie, aankleding,
          catering en eventuele sprekers of entertainment.
        </p>
        <p>
          Een bedrijfsopening is niet alleen feestelijk, maar ook dé kans om uw bedrijf te profileren
          en relaties te versterken. Maak er een bedrijfshappening van die de start markeert van een
          succesvolle periode voor uw bedrijf!
        </p>
      </KpAccordeon>
    </div>
  );
}
