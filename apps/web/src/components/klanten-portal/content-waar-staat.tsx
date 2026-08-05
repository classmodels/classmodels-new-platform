import {
  KpAccordeon,
  KpCard,
  KpChecks,
  KpIntro,
  KpPartnerGrid,
  KpSplit,
  KpTitel,
} from './content-shared';

export function KlantenWaarStaatContent() {
  return (
    <div className="cm-kp">
      <KpIntro
        label="Waarom Class-Models"
        titel={<>Stijl.<br />Service.<br /><em>Professionalisme.</em></>}
      >
        <p>
          Class-Models verbindt merken, bedrijven en organisaties met het juiste talent — snel,
          transparant en persoonlijk. Hieronder leest u waar wij voor staan en waarom bedrijven in
          heel België met ons samenwerken.
        </p>
        <KpChecks
          items={[
            <>
              <strong>Kant-en-klare modeshows:</strong> afgestemd op uw winkel of merk.
            </>,
            <>
              <strong>Geen concurrentie in joint shows:</strong> uw merk blijft op de voorgrond.
            </>,
            <>
              <strong>20 jaar ervaring:</strong> toonaangevend modellenbureau in België.
            </>,
            <>
              <strong>Divers bestand:</strong> alle leeftijden, maten en achtergronden.
            </>,
            <>
              <strong>Persoonlijke aanpak:</strong> elke casting start met een gesprek.
            </>,
          ]}
        />
      </KpIntro>

      {/* Foto links */}
      <KpSplit foto="/nieuw/klantenportaal.jpg" alt="Overleg bij Class-Models">
        <KpTitel>Waar staat Class-Models voor?</KpTitel>
        <p>
          Bij Class-Models begrijpen we dat het organiseren van een modeshow voor uw winkel een
          aanzienlijke investering in tijd en geld vereist. Daarom bieden wij{' '}
          <strong>kant-en-klare modeshows</strong> aan, waarbij onze ambitie om kwaliteit te leveren
          hand in hand gaat met uw wensen.
        </p>
        <p>
          Of u een exclusieve show voor uw eigen winkel wilt of een gezamenlijke modeshow met andere
          kledingzaken — wij maken het mogelijk. Uw merk staat altijd op de voorgrond.
        </p>
      </KpSplit>

      {/* Foto rechts */}
      <KpSplit foto="/nieuw/hero-home.jpg" alt="Modeshow Class-Models" fotoRechts>
        <KpTitel>Professionele opleiding en examenshow</KpTitel>
        <p>
          Onze modellen volgen een intensief opleidingsprogramma. Aan het einde nemen zij deel aan
          de <strong>examenshow</strong> (try-out modeshow), waaruit blijkt wie doorstroomt als
          professioneel mannequin, foto-model of reclamester.
        </p>
        <p>
          Voor kledingzaken betekent dit een aantrekkelijke prijsstelling en een frisse selectie: u
          ziet nieuw talent aan het werk vóór u boekt.
        </p>
      </KpSplit>

      <div className="cm-kp-duo">
        <KpCard className="cm-kp-card--fill">
          <KpTitel>Diversiteit en inclusiviteit</KpTitel>
          <p>
            Ons bestand omvat kinderen, tieners, mannen, vrouwen, 50-plussers én hosts, hostessen en
            promoteams. Representatie is voor ons geen trend, maar een overtuiging.
          </p>
        </KpCard>
        <KpCard className="cm-kp-card--fill">
          <KpTitel>Samenwerking met klanten</KpTitel>
          <p>
            Wij plaatsen niet alleen modellen; we denken mee over hoe u de meeste respons haalt uit
            uw evenementen. Een sterke samenwerking is de sleutel tot succes.
          </p>
        </KpCard>
      </div>

      {/* Foto links */}
      <KpSplit foto="/nieuw/hero-1.jpg" alt="Team Class-Models">
        <KpTitel>Waarom met ons samenwerken?</KpTitel>
        <KpChecks
          items={[
            <>
              <strong>Persoonlijke aanpak:</strong> geen automatische selectie.
            </>,
            <>
              <strong>Snelle respons:</strong> binnen 24 uur.
            </>,
            <>
              <strong>Transparante tarieven:</strong> geen verrassingen achteraf.
            </>,
            <>
              <strong>Kwaliteitsgarantie:</strong> back-up bij uitval.
            </>,
            <>
              <strong>Volledig ontzorgd:</strong> casting, contracten en briefing.
            </>,
          ]}
        />
      </KpSplit>

      {/* Foto rechts */}
      <KpSplit foto="/nieuw/hero-2.jpg" alt="Class-Models in actie" fotoRechts>
        <KpTitel>Onze missie</KpTitel>
        <p>
          Door uw verwachtingen te begrijpen, vinden wij de geschikte modellen, hostessen of promo
          boys &amp; girls voor modeshows, beurzen, congressen en thema-avonden.
        </p>
        <p>
          Tweetalig en hoogopgeleid personeel zorgt voor een vlotte ontvangst en begeleiding — de
          basis van een geslaagd evenement.
        </p>
      </KpSplit>

      <KpAccordeon titel="Wij werkten al samen met">
        <p style={{ marginBottom: 14 }}>
          Een selectie van winkels en merken waarmee Class-Models al mocht samenwerken:
        </p>
        <KpPartnerGrid />
      </KpAccordeon>
    </div>
  );
}
