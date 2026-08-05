import { KpChecks, KpIntro, KpSplit, KpTitel } from './content-shared';

export function KlantenEventContent() {
  return (
    <div className="cm-kp">
      <KpIntro
        label="Class-Models Events"
        titel={<>Concept.<br />Organisatie.<br /><em>Uitvoering.</em></>}
        intro={
          <p>
            Richt u volledig op de inhoud en het succes van uw bedrijf. Wij nemen de organisatie
            professioneel in handen, van een intieme receptie tot een groot bedrijfsgala.
          </p>
        }
      >
        <KpChecks
          items={[
            <>
              <strong>Volledige bemensing:</strong> ontvangst, bar, vestiaire, hostessen.
            </>,
            <>
              <strong>Productie op aanvraag:</strong> locatie, aankleding, catering, entertainment.
            </>,
            <>
              <strong>Seizoensevents:</strong> personeelsfeesten, kerstborrels, nieuwjaarsrecepties.
            </>,
            <>
              <strong>Zakelijke events:</strong> openings, galas, lanceringen, klantenevents.
            </>,
            <>
              <strong>Nazorg:</strong> persoonlijke briefing en feedback na afloop.
            </>,
          ]}
        />
      </KpIntro>

      {/* Foto rechts */}
      <KpSplit foto="/nieuw/hero-4.jpg" alt="Eventpersoneel Class-Models" fotoRechts>
        <KpTitel>Wij verzorgen onder andere:</KpTitel>
        <KpChecks
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
      </KpSplit>

      {/* Foto links */}
      <KpSplit foto="/nieuw/hero-6.jpg" alt="Samenwerking op een Class-Models event">
        <KpTitel>Professioneel personeel maakt het verschil</KpTitel>
        <p>
          Representatieve, goed gebriefde medewerkers zorgen ervoor dat gasten zich welkom voelen en
          dat uw evenement vlot verloopt — tot in de details.
        </p>
        <p>
          Of het nu een formele receptie is of een uitbundige avond: wij matchen het team aan uw
          bedrijfscultuur en budget.
        </p>
      </KpSplit>

      {/* Foto rechts */}
      <KpSplit foto="/nieuw/modellenportaal.jpg" alt="Hosting bij Class-Models" fotoRechts>
        <KpTitel>Wij denken mee over:</KpTitel>
        <KpChecks
          items={[
            <>
              <strong>Concept &amp; sfeer:</strong> van formal tot feestelijk.
            </>,
            <>
              <strong>Gastenflow:</strong> aantal gasten en timing van de avond.
            </>,
            <>
              <strong>Looks:</strong> dresscode en huisstijl.
            </>,
            <>
              <strong>Planning:</strong> briefing en back-up.
            </>,
            <>
              <strong>Nazorg:</strong> factuur en korte feedback.
            </>,
          ]}
        />
      </KpSplit>

      {/* Foto links */}
      <KpSplit foto="/nieuw/hero-home.jpg" alt="Event sfeerbeeld">
        <KpTitel>Personeelsfeest, kerstborrel of bedrijfsopening</KpTitel>
        <p>
          Een personeelsfeest versterkt de band tussen medewerkers. Een kerstborrel of
          nieuwjaarsreceptie is hét moment om samen bij te praten. Een bedrijfsopening profileert uw
          merk en versterkt relaties.
        </p>
        <KpChecks
          numbered
          items={[
            <>
              <strong>Intake:</strong> concept, locatie en wensen.
            </>,
            <>
              <strong>Selectie:</strong> team op maat van uw briefing.
            </>,
            <>
              <strong>Briefing:</strong> elk teamlid kent uw evenement.
            </>,
            <>
              <strong>Uitvoering:</strong> tijdig, professioneel, klaar.
            </>,
            <>
              <strong>Nazorg:</strong> factuur en feedback.
            </>,
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Interesse? Gebruik <strong>Modellen boeken / tarieven</strong> om een offerte of bestelling
          in te dienen en beschrijf uw event in het opmerkingenveld.
        </p>
      </KpSplit>
    </div>
  );
}
