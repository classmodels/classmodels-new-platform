import { KpAccordeon, KpCheck, KpFotoTekst, KpTitel } from './content-shared';

export function KlantenWatBiedenContent() {
  return (
    <div className="cm-kp">
      {/* ─── Kop ─────────────────────────────────────────────────────────── */}
      <header style={{ paddingBottom: 2 }}>
        <h1 className="cm-kp-paginatitel">Wat bieden we aan</h1>
        <p style={{ marginTop: 8, maxWidth: 720 }}>
          Bij Class-Models gaan diversiteit en professionaliteit hand in hand. Elk model in ons
          bestand heeft een uitgebreide opleiding genoten én met succes een examen afgelegd — de
          garantie op een professioneel portfolio en een sterke uitstraling voor de camera.
        </p>
      </header>

      {/* ─── Foto links, tekst rechts ────────────────────────────────────── */}
      <KpFotoTekst foto="/nieuw/hero-1.jpg" alt="Modellen van Class-Models">
        <KpTitel>Selectie van modellen</KpTitel>
        <p>
          Wij bieden niet alleen traditionele modellen met «perfecte maten», maar ook modellen die
          representatief zijn voor de mensen van de straat. Zo kunt u kiezen voor het{' '}
          <strong>authentieke, herkenbare model</strong> dat perfect bij uw merk past.
        </p>
        <p>In ons uitgebreide bestand vindt u onder meer:</p>
        <div className="cm-kp-cellen">
          {[
            { naam: 'Kinderen', sub: 'campagnes voor de jongste doelgroep' },
            { naam: 'Tieners', sub: 'fris, energiek, de laatste mode' },
            { naam: 'Vrouwen', sub: 'diverse leeftijden en stijlen' },
            { naam: 'Mannen', sub: 'sterk en stijlvol, elke gelegenheid' },
            { naam: 'Maatje meer', sub: 'representatief en inclusief' },
            { naam: '50+', sub: 'levenservaring en unieke charme' },
          ].map((c) => (
            <div key={c.naam} className="cm-kp-cel">
              <b>{c.naam}</b>
              <span>{c.sub}</span>
            </div>
          ))}
        </div>
      </KpFotoTekst>

      {/* ─── Tekst links, foto rechts ────────────────────────────────────── */}
      <KpFotoTekst foto="/nieuw/hero-2.jpg" alt="Hostessen van Class-Models" fotoRechts>
        <KpTitel>Hostessen boeken bij Class-Models</KpTitel>
        <p>
          Op zoek naar professionele hosts of hostessen? De knappe en hogeropgeleide dames en heren
          van Class-Models tillen uw event naar een hoger niveau — of het nu gaat om gasten
          verwelkomen, standbemanning, productdemonstratie of sales.
        </p>
        <p>
          <strong>«Wij willen graag dat jij gezien wordt.»</strong> Hun sprankelende uitstraling en
          klantvriendelijkheid zijn het ideale visitekaartje voor uw bedrijf.
        </p>
        <KpCheck
          items={[
            'Tweetalig (NL/FR) of meertalig beschikbaar',
            'Gepast gekleed volgens uw concept of huisstijl',
            'Ervaring met receptie, promotie en standwerk',
            'Meerkeuze-selectie op basis van uw eisen',
          ]}
        />
      </KpFotoTekst>

      {/* ─── Foto links, tekst rechts ────────────────────────────────────── */}
      <KpFotoTekst foto="/nieuw/gastenportaal.jpg" alt="Promoteam van Class-Models">
        <KpTitel>Onze promoteams</KpTitel>
        <p>
          Onze promoteams tillen uw evenementen op een hoger niveau — niet alleen met hun looks, maar
          ook met een uitstraling die iedereen omverblaast. Zij hebben een{' '}
          <strong>hospitality-radar die altijd aan staat</strong> en nemen expertise mee van
          uiteenlopende campagnes: van fotoshoots voor fashionmerken tot exclusieve vip-evenementen.
        </p>
        <p>
          Omdat elk merk uniek is, besteedt Class-Models veel aandacht aan de absolute match tussen
          merk en promoteam. Alleen zo wordt de beleving van uw merk versterkt.
        </p>
        <p>
          <strong>Zij stralen, zij lachen, zij zijn de eyecatcher van de avond.</strong>
        </p>
      </KpFotoTekst>

      {/* ─── Accordeons ──────────────────────────────────────────────────── */}
      <KpAccordeon titel="Spectaculaire modeshows">
        <p>
          Wij organiseren professionele modeshows in samenwerking met ervaren modellen, stylisten,
          make-up artists en andere professionals. Onze shows zijn een mix van creativiteit, fashion
          en entertainment.
        </p>
        <KpCheck
          items={[
            'Professionele licht- en geluidsbedrijven, elk detail afgestemd op de collectie',
            'Grote catwalk zodat de modellen de kleding indrukwekkend kunnen showen',
            'Ledwall voor een visueel spektakel dat de sfeer versterkt',
            'Modellen getraind in catwalk, poses en overtuigende presentatie',
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Aansluitend organiseren we desgewenst een <strong>afterparty</strong> met hapjes en
          drankjes — een leuke manier om de avond af te sluiten. Met een geslaagde afterparty wordt
          de modeshow pas echt een onvergetelijke ervaring.
        </p>
      </KpAccordeon>

      <KpAccordeon titel="Geef uw evenement een boost">
        <p>
          De lancering van een merk, een groot evenement of een beurs waarop uw doelgroep wordt
          aangesproken? Class-Models ondersteunt u graag met promo girls &amp; boys die niet alleen
          vóór uw merk werken, maar dit merk ook <strong>zijn</strong>.
        </p>
        <p>
          Onze promoteams delen de passie en het talent voor hospitality en beschikken over unieke
          kwaliteiten en specifieke branche- en merkervaring. Uw gasten zijn blij en op hun gemak, en
          u geniet alleen maar van een fantastisch evenement.
        </p>
      </KpAccordeon>

      <KpAccordeon titel="Werkwijze op maat">
        <p>
          Wanneer u een host of hostess wil boeken, vult u het aanvraagformulier in via dit
          klantenportaal of contacteert u ons telefonisch. Wij zoeken voor de door u aangegeven
          periode een passende host of hostess en sturen een meerkeuze-selectie.
        </p>
        <p>
          U kan vooraf aangeven of u specifieke eisen heeft voor de looks, of dat iemand een tweede
          of derde taal spreekt. Wij kijken ook naar persoonlijke eigenschappen, ervaring en wat onze
          mensen graag doen — dat zie je terug in het werk.
        </p>
      </KpAccordeon>
    </div>
  );
}
