import {
  KpAccordeon,
  KpBullet,
  KpCard,
  KpImageCard,
  KpPartnerGrid,
  KpSplit,
  KpTitel,
} from './content-shared';

export function KlantenWaarStaatContent() {
  return (
    <div className="cm-kp">
      <KpCard>
        <h1 className="cm-kp-paginatitel" style={{ marginBottom: 12 }}>
          Welkom bij Class-Models: jouw partner in stijl en professionalisme
        </h1>
        <p>
          Class-Models verbindt merken, bedrijven en organisaties met het juiste talent — snel,
          transparant en persoonlijk. Hieronder leest u waar wij voor staan en waarom bedrijven in
          heel België met ons samenwerken.
        </p>
        <KpBullet
          items={[
            'Kant-en-klare modeshows, afgestemd op uw winkel of merk',
            'Geen concurrerende winkels in gezamenlijke shows',
            '20 jaar ervaring als toonaangevend modellenbureau',
            'Modellen van alle leeftijden, maten en achtergronden',
            'Persoonlijke aanpak — elke casting start met een gesprek',
          ]}
        />
      </KpCard>

      <KpSplit foto="/nieuw/klantenportaal.jpg" alt="Overleg bij Class-Models" fotoRechts>
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

      <div className="cm-kp-masonry">
        <div className="cm-kp-masonry-col">
          <KpCard>
            <KpTitel>Professionele opleiding en examenshow</KpTitel>
            <p>
              Onze modellen volgen een intensief opleidingsprogramma. Aan het einde nemen zij deel
              aan de <strong>examenshow</strong> (try-out modeshow), waaruit blijkt wie doorstroomt
              als professioneel mannequin, foto-model of reclamester.
            </p>
            <p>
              Voor kledingzaken betekent dit een aantrekkelijke prijsstelling en een frisse
              selectie: u ziet nieuw talent aan het werk vóór u boekt.
            </p>
          </KpCard>
          <KpCard>
            <KpTitel>Waarom met ons samenwerken?</KpTitel>
            <KpBullet
              items={[
                'Persoonlijke aanpak — geen automatische selectie',
                'Snelle respons binnen 24 uur',
                'Transparante tarieven, geen verrassingen',
                'Kwaliteitsgarantie en back-up bij uitval',
                'Volledig ontzorgd: casting, contracten, briefing',
              ]}
            />
          </KpCard>
        </div>
        <div className="cm-kp-masonry-col">
          <KpImageCard src="/nieuw/hero-home.jpg" alt="Modeshow Class-Models" />
          <KpCard>
            <KpTitel>Onze missie</KpTitel>
            <p>
              Door uw verwachtingen te begrijpen, vinden wij de geschikte modellen, hostessen of
              promo boys &amp; girls voor modeshows, beurzen, congressen en thema-avonden.
            </p>
            <p>
              Tweetalig en hoogopgeleid personeel zorgt voor een vlotte ontvangst en begeleiding —
              de basis van een geslaagd evenement.
            </p>
          </KpCard>
        </div>
      </div>

      <div className="cm-kp-split">
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

      <KpAccordeon titel="Wij werkten al samen met">
        <p style={{ marginBottom: 14 }}>
          Een selectie van winkels en merken waarmee Class-Models al mocht samenwerken:
        </p>
        <KpPartnerGrid />
      </KpAccordeon>
    </div>
  );
}
