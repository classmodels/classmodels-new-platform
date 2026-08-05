import { KpCard, KpChecks, KpSplit, KpTitel } from './content-shared';

export function KlantenWatBiedenContent() {
  return (
    <div className="cm-kp">
      <KpCard>
        <h1 className="cm-kp-paginatitel" style={{ marginBottom: 12 }}>
          Wat bieden we aan
        </h1>
        <p>
          Bij Class-Models gaan diversiteit en professionaliteit hand in hand. Elk model in ons
          bestand heeft een uitgebreide opleiding genoten én met succes een examen afgelegd —
          garantie op een professioneel portfolio en een sterke uitstraling voor de camera.
        </p>
        <KpChecks
          items={[
            <>
              <strong>Breed bestand:</strong> traditionele én authentieke «people from the
              street»-modellen.
            </>,
            <>
              <strong>Alle doelgroepen:</strong> kinderen, tieners, vrouwen, mannen, maatje meer en
              50+.
            </>,
            <>
              <strong>Hostessen &amp; hosts:</strong> voor beurzen, recepties en events.
            </>,
            <>
              <strong>Promoteams:</strong> promo girls &amp; boys voor activaties en sampling.
            </>,
            <>
              <strong>Modeshows:</strong> full production van catwalk tot afterparty.
            </>,
          ]}
        />
      </KpCard>

      {/* Foto links */}
      <KpSplit foto="/nieuw/hero-1.jpg" alt="Modellen van Class-Models">
        <KpTitel>Selectie van modellen</KpTitel>
        <p>
          Wij bieden niet alleen traditionele modellen met «perfecte maten», maar ook modellen die
          representatief zijn voor de mensen van de straat — het{' '}
          <strong>authentieke, herkenbare model</strong> dat perfect bij uw merk past.
        </p>
        <div className="cm-kp-cellen">
          {[
            { naam: 'Kinderen', sub: 'jongste doelgroep' },
            { naam: 'Tieners', sub: 'fris en energiek' },
            { naam: 'Vrouwen', sub: 'diverse stijlen' },
            { naam: 'Mannen', sub: 'elke gelegenheid' },
            { naam: 'Maatje meer', sub: 'inclusief' },
            { naam: '50+', sub: 'levenservaring' },
          ].map((c) => (
            <div key={c.naam} className="cm-kp-cel">
              <b>{c.naam}</b>
              <span>{c.sub}</span>
            </div>
          ))}
        </div>
      </KpSplit>

      {/* Foto rechts */}
      <KpSplit foto="/nieuw/hero-2.jpg" alt="Hostessen Class-Models" fotoRechts>
        <KpTitel>Hostessen boeken</KpTitel>
        <p>
          Professionele hosts en hostessen tillen uw event naar een hoger niveau — of het nu gaat om
          gasten verwelkomen, standbemanning, productdemonstratie of sales.
        </p>
        <p>
          <strong>«Wij willen graag dat jij gezien wordt.»</strong>
        </p>
        <KpChecks
          items={[
            <>
              <strong>Talen:</strong> tweetalig (NL/FR) of meertalig.
            </>,
            <>
              <strong>Look:</strong> gepast gekleed volgens uw concept.
            </>,
            <>
              <strong>Ervaring:</strong> receptie, promotie en standwerk.
            </>,
            <>
              <strong>Selectie:</strong> meerkeuze op basis van uw eisen.
            </>,
          ]}
        />
      </KpSplit>

      {/* Foto links */}
      <KpSplit foto="/nieuw/gastenportaal.jpg" alt="Promoteam Class-Models">
        <KpTitel>Onze promoteams</KpTitel>
        <p>
          Zij tillen uw evenementen op een hoger niveau — niet alleen met looks, maar met een
          hospitality-radar die altijd aan staat. Van fashionfotoshoots tot exclusieve
          vip-evenementen.
        </p>
        <KpChecks
          items={[
            <>
              <strong>Promo Girls &amp; Boys:</strong> enthousiast en klantgericht.
            </>,
            <>
              <strong>Hostessen en hosts:</strong> representatief en professioneel.
            </>,
            <>
              <strong>Coördinatie:</strong> teamleiding op aanvraag.
            </>,
            <>
              <strong>Huisstijl:</strong> werkkleding of branding mogelijk.
            </>,
          ]}
        />
      </KpSplit>

      {/* Foto rechts */}
      <KpSplit foto="/nieuw/hero-4.jpg" alt="Modeshow productie" fotoRechts>
        <KpTitel>Spectaculaire modeshows</KpTitel>
        <KpChecks
          numbered
          items={[
            <>
              <strong>Licht &amp; geluid:</strong> productie op maat van de collectie.
            </>,
            <>
              <strong>Catwalk:</strong> groot formaat voor maximale impact.
            </>,
            <>
              <strong>Ledwall:</strong> visueel spektakel dat de sfeer versterkt.
            </>,
            <>
              <strong>Modellen:</strong> getraind in catwalk, poses en presentatie.
            </>,
            <>
              <strong>Afterparty:</strong> optioneel met hapjes en drankjes.
            </>,
          ]}
        />
      </KpSplit>

      <KpCard>
        <KpTitel>Werkwijze op maat</KpTitel>
        <p>
          Via dit klantenportaal of telefonisch vraagt u een host, hostess of promoteam aan. Wij
          zoeken voor de door u aangegeven periode een passende selectie en sturen een meerkeuze.
          Specifieke eisen over looks of talen? Laat het ons weten — wij kijken ook naar ervaring en
          persoonlijkheid.
        </p>
      </KpCard>
    </div>
  );
}
