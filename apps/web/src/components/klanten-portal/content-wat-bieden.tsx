import { KpBullet, KpCard, KpImageCard, KpSplit, KpTitel } from './content-shared';

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
        <KpBullet
          items={[
            'Traditionele én authentieke «people from the street»-modellen',
            'Kinderen, tieners, vrouwen, mannen, maatje meer en 50+',
            'Hostessen en hosts voor beurzen, recepties en events',
            'Promo girls & boys voor activaties en sampling',
            'Spectaculaire modeshows met full production',
          ]}
        />
      </KpCard>

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

      <div className="cm-kp-masonry">
        <div className="cm-kp-masonry-col">
          <KpCard>
            <KpTitel>Hostessen boeken</KpTitel>
            <p>
              Professionele hosts en hostessen tillen uw event naar een hoger niveau — of het nu
              gaat om gasten verwelkomen, standbemanning, productdemonstratie of sales.
            </p>
            <p>
              <strong>«Wij willen graag dat jij gezien wordt.»</strong>
            </p>
            <KpBullet
              items={[
                'Tweetalig (NL/FR) of meertalig',
                'Gepast gekleed volgens uw concept',
                'Ervaring met receptie en standwerk',
                'Meerkeuze-selectie op basis van uw eisen',
              ]}
            />
          </KpCard>
          <KpImageCard src="/nieuw/gastenportaal.jpg" alt="Promoteam Class-Models" />
          <KpCard>
            <KpTitel>Geef uw evenement een boost</KpTitel>
            <p>
              Merklancering, beurs of groot evenement? Onze promo girls &amp; boys werken niet alleen
              vóór uw merk — zij <strong>zijn</strong> het merk. Passie, hospitality en
              branche-ervaring in één team.
            </p>
          </KpCard>
        </div>
        <div className="cm-kp-masonry-col">
          <KpImageCard src="/nieuw/hero-2.jpg" alt="Hostessen Class-Models" />
          <KpCard>
            <KpTitel>Onze promoteams</KpTitel>
            <p>
              Zij tillen uw evenementen op een hoger niveau — niet alleen met looks, maar met een
              hospitality-radar die altijd aan staat. Van fashionfotoshoots tot exclusieve
              vip-evenementen.
            </p>
            <KpBullet
              items={[
                'Promo Girls & Boys',
                'Hostessen en hosts',
                'Teamcoördinatie mogelijk',
                'Werkkleding of huisstijl op aanvraag',
              ]}
            />
          </KpCard>
          <KpCard>
            <KpTitel>Spectaculaire modeshows</KpTitel>
            <KpBullet
              items={[
                'Licht- en geluidsproductie op maat',
                'Grote catwalk voor maximale impact',
                'Ledwall voor een visueel spektakel',
                'Getrainde modellen: catwalk, poses, presentatie',
                'Optionele afterparty met hapjes en drankjes',
              ]}
            />
          </KpCard>
        </div>
      </div>

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
