import { KpChecks, KpIntro, KpSplit, KpTitel } from './content-shared';

const E = '/nieuw/events';

export function KlantenEventContent() {
  return (
    <div className="cm-kp">
      <KpIntro
        label="Class-Events-Solutions"
        titel={
          <>
            Wij organiseren.
            <br />
            <em>Jij geniet.</em>
          </>
        }
        intro={
          <>
            <p>
              <strong>Class-Events-Solutions</strong> is een dochteronderneming van Class-Models.
              Wij organiseren evenementen van A tot Z: concept, planning, bemensing, hospitality en
              show — zodat jij je kunt focussen op je gasten en je merk.
            </p>
            <p>
              Van een intieme receptie tot een bedrijfsgala of modeshow: heldere communicatie,
              realistische deadlines en een duidelijke planning. Jij behoudt het overzicht, wij
              bewaken de uitvoering.
            </p>
          </>
        }
      >
        <KpChecks
          items={[
            <>
              <strong>Totale productie:</strong> concept, locatie, aankleding, tech en show.
            </>,
            <>
              <strong>Catering &amp; hospitality:</strong> ontvangst, bediening, barservice.
            </>,
            <>
              <strong>Professioneel personeel:</strong> hosts, zaal, promo en hospitalityteams.
            </>,
            <>
              <strong>Optredens &amp; entertainment:</strong> acts passend bij jouw concept.
            </>,
            <>
              <strong>Budgetbewaking:</strong> concrete voorstellen binnen jouw kader.
            </>,
          ]}
        />
      </KpIntro>

      <KpSplit foto={`${E}/gala-runway.jpg`} alt="Gala en modeshow productie Class-Events-Solutions" fotoRechts>
        <KpTitel>Van concept tot uitvoering</KpTitel>
        <p>
          Een event wordt memorabel door sfeer, timing en beleving. Wij bouwen een productie die
          past bij jouw doel, doelgroep en setting — of het nu een modeshow, gala of
          bedrijfsevent is.
        </p>
        <KpChecks
          items={[
            'Intake: doelstellingen, sfeer en randvoorwaarden',
            'Concept & planning met duidelijke mijlpalen',
            'Technische coördinatie, licht en showconstructie',
            'On-site regie en teamleiding',
            'Nazorg met feedback na afloop',
          ]}
        />
      </KpSplit>

      <KpSplit foto={`${E}/champagne-runway.jpg`} alt="Hospitality en champagne service tijdens modeshow">
        <KpTitel>Catering &amp; hospitality</KpTitel>
        <p>
          Catering is meer dan eten en drinken: het is service, uitstraling en ritme. Wij ondersteunen
          formules van receptie tot high-end hospitality.
        </p>
        <p>
          <strong>Mogelijkheden zijn onder andere:</strong>
        </p>
        <KpChecks
          items={[
            'Ontvangstdrank en aperitiefservice (cava, cocktails, …)',
            'Bediening van hapjes en walking dinners',
            'Verfijnde hospitality-elementen',
            'Barservice en zaalbediening',
            'Coördinatie met cateringpartners en locatie',
          ]}
        />
      </KpSplit>

      <KpSplit foto={`${E}/staff-service.jpg`} alt="Class-Events-Solutions personeel met champagne en hapjes" fotoRechts>
        <KpTitel>Professioneel personeel maakt het verschil</KpTitel>
        <p>
          Naast totaalproducties kan je bij Class-Events-Solutions ook terecht voor gerichte
          personeelsinzet. Representatief, servicegericht en gewend aan events waar timing en
          uitstraling cruciaal zijn.
        </p>
        <p>
          <strong>Wij voorzien onder andere:</strong>
        </p>
        <KpChecks
          items={[
            'Catering- en zaalpersoneel',
            'Hosts &amp; hostessen',
            'Promo girls &amp; promo boys',
            'Hospitality- en ontvangstteams',
            'Ondersteuning bij bar, bediening en service',
            'Vestiaire / cloakroom',
          ]}
        />
      </KpSplit>

      <KpSplit foto={`${E}/model-look.jpg`} alt="Fashion look voor events via Class-Models">
        <KpTitel>Looks &amp; casting via Class-Models</KpTitel>
        <p>
          Als dochter van Class-Models schakelen we soepel modellen, hostessen en promo-teams in —
          met dezelfde kwaliteit en briefing die je van Class-Models kent.
        </p>
        <KpChecks
          items={[
            'Casting afgestemd op jouw merk en dresscode',
            'Promo-activaties tijdens het event',
            'PR-medewerkers en ontvangst',
            'Eén aanspreekpunt voor event én casting',
          ]}
        />
      </KpSplit>

      <KpSplit foto={`${E}/staff-bar.jpg`} alt="Hospitalityteam Class-Events-Solutions" fotoRechts>
        <KpTitel>Wij denken mee over:</KpTitel>
        <KpChecks
          items={[
            'Timing van service (receptie, speeches, momenten)',
            'Personeelsbezetting en flow',
            'Presentatie en niveau passend bij jouw doelgroep',
            'Uitvoering met discretie en professionaliteit',
            'Looks, dresscode en huisstijl',
            'Briefing en back-up op de dag zelf',
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Van een kleinschalige receptie tot een groots bedrijfsevent: wij zorgen voor de juiste
          bezetting, duidelijke briefing en professionele uitvoering.
        </p>
      </KpSplit>

      <KpSplit foto={`${E}/crew-jacket.jpg`} alt="Productieteam Class-Events-Solutions backstage">
        <KpTitel>Optredens &amp; entertainment</KpTitel>
        <p>
          Beleving die blijft hangen. Wij organiseren optredens en entertainment die passen bij
          concept, publiek en setting — met oog voor impact, timing en showconstructie.
        </p>
        <p>
          <strong>We ondersteunen bij:</strong>
        </p>
        <KpChecks
          items={[
            'Keuze van artiesten/acts in lijn met jouw eventdoel',
            'Planning, technische coördinatie en timing',
            'On-site coördinatie en begeleiding',
            'Totale productie in combinatie met hospitality en ontvangst',
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Diezelfde professionele aanpak geldt voor bedrijfsfeesten en thematische events.
        </p>
      </KpSplit>

      <KpSplit foto={`${E}/backstage-fashion.jpg`} alt="Backstage modeshow productie" fotoRechts>
        <KpTitel>Modeshows &amp; fashion events</KpTitel>
        <p>
          Via Class-Models combineren we productie met casting, looks en backstage-flow. Van
          catwalk tot gastenontvangst: één team, één standaard.
        </p>
        <KpChecks
          items={[
            'Runway-, stage- en zaalopbouw in overleg met partners',
            'Backstage-coördinatie, timing en showregie',
            'Koppeling met modellen, hostessen en hospitality',
            'Sfeerbeeld, licht en presentatie op maat',
          ]}
        />
      </KpSplit>

      <KpSplit foto={`${E}/makeup.jpg`} alt="Makeup en voorbereiding backstage">
        <KpTitel>Detail tot in de looks</KpTitel>
        <p>
          Haar, makeup en styling horen bij een strakke show. Wij bewaken de planning zodat elke
          look op tijd klaarstaat — zonder stress voor jouw team.
        </p>
        <KpChecks
          items={[
            'Afstemming met beauty- en stylingpartners',
            'Callsheets en calltijden per model/act',
            'Controle van details vlak voor opkomst',
          ]}
        />
      </KpSplit>

      <KpSplit foto={`${E}/uniform.jpg`} alt="Uniform Class-Events-Solutions hospitality" fotoRechts>
        <KpTitel>Budgetbewaking met professionele voorstellen</KpTitel>
        <p>
          Een event mag niet alleen mooi zijn, maar ook haalbaar en financieel correct. Daarom:
        </p>
        <KpChecks
          items={[
            'Bespreken we vooraf jouw budget en doelstellingen',
            <>
              Doen we <strong>concrete voorstellen</strong> binnen dat budget
            </>,
            'Bieden we opties aan (basis, upgrade, premium) waar mogelijk',
            'Bewaken we kosten doorheen het traject en sturen bij waar nodig',
          ]}
        />
      </KpSplit>

      <KpSplit foto={`${E}/seizoensevent.jpg`} alt="Planning van een bedrijfsevent of kerstborrel">
        <KpTitel>Personeelsfeest, kerstborrel of bedrijfsopening</KpTitel>
        <p>
          Seizoensevents en zakelijke momenten vragen om de juiste mix van sfeer en organisatie. Wij
          matchen concept, team en uitvoering aan jouw bedrijfscultuur.
        </p>
        <KpChecks
          numbered
          items={[
            <>
              <strong>Intake:</strong> concept, locatie en wensen.
            </>,
            <>
              <strong>Selectie:</strong> team en partners op maat.
            </>,
            <>
              <strong>Briefing:</strong> elk teamlid kent jouw evenement.
            </>,
            <>
              <strong>Uitvoering:</strong> tijdig, professioneel, klaar.
            </>,
            <>
              <strong>Nazorg:</strong> factuur en korte feedback.
            </>,
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Interesse? Gebruik <strong>Modellen boeken / tarieven</strong> om een offerte of bestelling
          in te dienen en beschrijf je event in het opmerkingenveld — of vermeld dat je
          Class-Events-Solutions wilt inschakelen voor de totale organisatie.
        </p>
      </KpSplit>
    </div>
  );
}
