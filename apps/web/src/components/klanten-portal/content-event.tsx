import { KpBullet, KpCard, KpImageCard, KpSplit, KpTitel } from './content-shared';

export function KlantenEventContent() {
  return (
    <div className="cm-kp">
      <KpCard>
        <h1 className="cm-kp-paginatitel" style={{ marginBottom: 12 }}>
          Een event organiseren? Wij helpen u!
        </h1>
        <p>
          Maak gebruik van ons professioneel eventsbureau. Zo kunt u zich volledig richten op de
          inhoud en het succes van uw bedrijf, terwijl de organisatie van het evenement in goede
          handen is — van een intieme receptie tot een groot bedrijfsgala.
        </p>
        <KpBullet
          items={[
            'Volledige bemensing: ontvangst, bar, vestiaire, hostessen',
            'Locatie, aankleding, catering en entertainment op aanvraag',
            'Personeelsfeesten, kerstborrels en nieuwjaarsrecepties',
            'Bedrijfsopeningen, galas, lanceringen en klantenevents',
            'Persoonlijke briefing en nazorg na elk evenement',
          ]}
        />
      </KpCard>

      <div className="cm-kp-split">
        <KpCard className="cm-kp-card--fill">
          <KpTitel>Wij verzorgen onder andere:</KpTitel>
          <KpBullet
            items={[
              'Ontvangst en gastenregistratie',
              'Begeleiding en zaalassistentie',
              'Bar- en cateringondersteuning',
              'Vestiaire / cloakroom',
              'PR-medewerkers en hostessen',
              'Promo-activaties tijdens uw event',
              'Coördinatie en teamleiding',
            ]}
          />
        </KpCard>
        <KpImageCard src="/nieuw/hero-4.jpg" alt="Eventpersoneel Class-Models" />
      </div>

      <div className="cm-kp-masonry">
        <div className="cm-kp-masonry-col">
          <KpCard>
            <KpTitel>Professioneel personeel maakt het verschil</KpTitel>
            <p>
              Representatieve, goed gebriefde medewerkers zorgen ervoor dat gasten zich welkom
              voelen en dat uw evenement vlot verloopt — tot in de details.
            </p>
            <p>
              Of het nu een formele receptie is of een uitbundige avond: wij matchen het team aan
              uw bedrijfscultuur en budget.
            </p>
          </KpCard>
          <KpImageCard src="/nieuw/hero-6.jpg" alt="Samenwerking op een Class-Models event" />
          <KpCard>
            <KpTitel>Wij voorzien onder andere:</KpTitel>
            <KpBullet
              items={[
                'Personeelsfeest & teambuilding',
                'Kerstborrel en nieuwjaarsreceptie',
                'Bedrijfsopening / bedrijfshappening',
                'Bedrijfsgala en galadiner',
                'Productlancering en awards',
              ]}
            />
          </KpCard>
        </div>
        <div className="cm-kp-masonry-col">
          <KpImageCard src="/nieuw/modellenportaal.jpg" alt="Hosting bij Class-Models" />
          <KpCard>
            <KpTitel>Wij denken mee over:</KpTitel>
            <KpBullet
              items={[
                'Concept en sfeer van uw event',
                'Aantal gasten en flow van de avond',
                'Looks, dresscode en huisstijl',
                'Timing, briefing en back-up',
                'Nazorg en feedback na afloop',
              ]}
            />
          </KpCard>
          <KpCard>
            <KpTitel>Onze werkwijze</KpTitel>
            <KpBullet
              items={[
                'Intakegesprek — concept, locatie, wensen',
                'Personeelsselectie op maat van uw briefing',
                'Gedetailleerde briefing per medewerker',
                'Dag van het event: tijdig, professioneel, klaar',
                'Nazorg: factuur en korte feedback',
              ]}
            />
            <p style={{ marginTop: 12 }}>
              Interesse? Gebruik <strong>Modellen boeken / tarieven</strong> om een offerte of
              bestelling in te dienen en beschrijf uw event in het opmerkingenveld.
            </p>
          </KpCard>
        </div>
      </div>

      <KpSplit foto="/nieuw/hero-home.jpg" alt="Event sfeerbeeld" fotoRechts>
        <KpTitel>Personeelsfeest, kerstborrel of bedrijfsopening</KpTitel>
        <p>
          Een personeelsfeest versterkt de band tussen medewerkers. Een kerstborrel of
          nieuwjaarsreceptie is hét moment om samen bij te praten. Een bedrijfsopening profileert uw
          merk en versterkt relaties.
        </p>
        <p>
          Wij nemen al uw zorgen uit handen: van locatie en catering tot entertainment en
          decoratie. <strong>Samen maken we er een onvergetelijke gebeurtenis van.</strong>
        </p>
      </KpSplit>
    </div>
  );
}
