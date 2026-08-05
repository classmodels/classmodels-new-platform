import { KpAccordeon, KpCheck, KpFotoTekst, KpPartnerGrid, KpTitel } from './content-shared';

export function KlantenWaarStaatContent() {
  return (
    <div className="cm-kp">
      {/* ─── Kop ─────────────────────────────────────────────────────────── */}
      <header style={{ paddingBottom: 2 }}>
        <h1 className="cm-kp-paginatitel">
          Welkom bij Class-Models: jouw partner in stijl en professionalisme
        </h1>
        <p style={{ marginTop: 8, maxWidth: 720 }}>
          Class-Models verbindt merken, bedrijven en organisaties met het juiste talent — snel,
          transparant en persoonlijk. Hieronder leest u waar wij voor staan en waarom bedrijven in
          heel België met ons samenwerken.
        </p>
      </header>

      {/* ─── Foto links, tekst rechts ────────────────────────────────────── */}
      <KpFotoTekst foto="/nieuw/klantenportaal.jpg" alt="Overleg met een klant bij Class-Models">
        <KpTitel>Waar staat Class-Models voor?</KpTitel>
        <p>
          Bij Class-Models begrijpen we dat het organiseren van een modeshow voor uw winkel een
          aanzienlijke investering in tijd en geld vereist. Daarom bieden wij{' '}
          <strong>kant-en-klare modeshows</strong> aan, waarbij onze ambitie om kwaliteit te leveren
          hand in hand gaat met uw wensen.
        </p>
        <p>
          Of u nu een exclusieve show voor uw eigen winkel wilt organiseren of samen met andere
          kledingzaken een gezamenlijke modeshow wilt opzetten — wij maken het mogelijk. Onze aanpak
          garandeert dat er <strong>geen concurrerende winkels</strong> deelnemen aan gezamenlijke
          modeshows, zodat uw merk op de voorgrond staat.
        </p>
        <p>
          Class-Models is trots op zijn <strong>20-jarige geschiedenis</strong> als toonaangevend
          modellenbureau. Schoonheid kent vele vormen — daarom verwelkomen wij modellen van alle
          leeftijden, maten en achtergronden in ons bestand.
        </p>
      </KpFotoTekst>

      {/* ─── Tekst links, foto rechts ────────────────────────────────────── */}
      <KpFotoTekst foto="/nieuw/hero-home.jpg" alt="Modeshow van Class-Models" fotoRechts>
        <KpTitel>Professionele opleiding en examenshow</KpTitel>
        <p>
          Om onze modellen optimaal te ondersteunen, bieden wij een intensief opleidingsprogramma aan
          dat hen voorbereidt op de uitdagingen van de modewereld. Aan het einde van de opleiding
          nemen zij deel aan de <strong>examenshow</strong> — de try-out modeshow — waaruit blijkt
          wie doorstroomt als professioneel mannequin, foto-model of reclamester.
        </p>
        <p>
          Voor kledingzaken betekent dit een <strong>aantrekkelijke prijsstelling</strong> en een
          frisse benadering van het selectieproces: u ziet nieuw talent aan het werk vóór u boekt.
        </p>
        <p>
          Daarnaast organiseren wij modeshows met ervaren modellen, zorgvuldig geselecteerd door ons
          team, voor klanten die de uitstraling van hun merk professioneel willen communiceren.
        </p>
      </KpFotoTekst>

      {/* ─── Twee tekstkolommen ──────────────────────────────────────────── */}
      <section className="cm-kp-panel">
        <div className="cm-kp-kolommen">
          <div>
            <KpTitel>Diversiteit en inclusiviteit</KpTitel>
            <p>
              Ons modellenbestand omvat een brede variëteit: van kinderen en tieners tot mannen,
              vrouwen en 50-plussers. Daarnaast beschikken we over een team van hosts, hostessen en
              promotionele medewerkers voor uiteenlopende evenementen.
            </p>
          </div>
          <div>
            <KpTitel>Samenwerking met klanten</KpTitel>
            <p>
              Wij plaatsen niet alleen modellen; we denken actief mee over hoe u de meeste respons
              haalt uit uw evenementen. Een sterke samenwerking is de sleutel tot succes in deze
              competitieve industrie.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Accordeons ──────────────────────────────────────────────────── */}
      <KpAccordeon titel="Onze missie">
        <p>
          Door de vereisten en verwachtingen van onze klanten te begrijpen, vinden wij de geschikte
          modellen, hostessen of promo boys &amp; girls voor uw modeshows, conferenties, congressen,
          tentoonstellingen, beurzen of thema-avonden.
        </p>
        <p>
          Ons personeel — tweetalige modellen, promo boys en girls, meertalige en hoogopgeleide hosts
          en hostessen — is de basis van het succes van uw evenement. Zij helpen bij het onthalen en
          begeleiden van het publiek en zorgen voor een vlotte stroom van het evenement.
        </p>
      </KpAccordeon>

      <KpAccordeon titel="Waarom met ons samenwerken?">
        <p>
          Ieder bedrijf, ieder evenement en iedere opdracht is anders. Daarom maken wij voor iedere
          gelegenheid de perfecte match. Wij plaatsen nooit zomaar iemand bij een klus: we kijken
          naar ervaring en persoonlijke eigenschappen, van zowel onze opdrachtgevers als onze mensen.
        </p>
        <KpCheck
          items={[
            <>
              <strong>Persoonlijke aanpak</strong> — elke samenwerking start met een gesprek, geen
              automatische selectie
            </>,
            <>
              <strong>Snelle respons</strong> — aanvragen beantwoorden we binnen 24 uur
            </>,
            <>
              <strong>Transparante tarieven</strong> — alle prijzen vooraf gekend, geen verrassingen
            </>,
            <>
              <strong>Kwaliteitsgarantie</strong> — elk model persoonlijk geselecteerd en gebriefd,
              back-up bij uitval
            </>,
            <>
              <strong>Volledig ontzorgd</strong> — van casting tot contracten en briefing op de dag
              zelf
            </>,
          ]}
        />
        <p style={{ marginTop: 12 }}>
          Het gaat niet alleen om een mooie uitstraling: er moet ook op een prettige manier hard
          gewerkt kunnen worden. Zo houden wij de kwaliteit hoog.
        </p>
      </KpAccordeon>

      <KpAccordeon titel="Wij werkten al samen met">
        <p style={{ marginBottom: 14 }}>
          Een selectie van winkels en merken waarmee Class-Models al mocht samenwerken:
        </p>
        <KpPartnerGrid />
      </KpAccordeon>
    </div>
  );
}
