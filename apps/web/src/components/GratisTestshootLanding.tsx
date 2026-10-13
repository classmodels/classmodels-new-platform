'use client';

import { useRouter } from 'next/navigation';
import '@/components/gratis-testshoot.css';

const POSTER = '/nieuw/gratis-testshoot-intake.jpg';

/** Gsm → mobiele agenda. Desktop → inschrijven met het pakket al gekozen. */
export function goToGratisTestshootAgenda(push: (href: string) => void) {
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  if (mobile) {
    push('/?m=guest&book=gratis-fotoshoot&pakket=testshoot');
    return;
  }
  window.location.assign('/gasten/model-worden?pakket=testshoot#inschrijven');
}

export function GratisTestshootLanding() {
  const router = useRouter();
  const go = () => goToGratisTestshootAgenda((href) => router.push(href));

  return (
    <div className="gts-root">
      <section className="gts-hero" aria-labelledby="gts-title">
        <div className="gts-wrap">
          <div className="gts-grid">
            <div className="gts-side">
              <button
                type="button"
                className="gts-poster"
                onClick={go}
                aria-label="Ga verder naar de agenda voor een gratis testshoot en intakegesprek"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={POSTER}
                  alt="Gratis testshoot en intakegesprek bij Class-Models. Iedereen is welkom, ervaring is niet nodig."
                  width={1024}
                  height={1536}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </button>
              <button type="button" className="gts-go" onClick={go}>
                Ga verder
              </button>
            </div>

            <div className="gts-copy">
              <p className="gts-kicker">Class-Models</p>
              <h1 id="gts-title" className="gts-title">
                “Modellenwerk? Dat is toch niets voor mij?”
              </h1>
              <p className="gts-lead">
                Misschien denk je daar na één kennismaking helemaal anders over.
              </p>
              <p>
                Bij modellenwerk denken veel mensen aan perfecte maten, jonge gezichten en een
                select groepje dat op de catwalk thuishoort. Maar ook winkels, merken en
                reclamebureaus hebben mensen nodig in wie hun klanten zich herkennen. Gewone
                mensen met een eigen, bijzondere uitstraling.
              </p>
              <p>
                Bij Class-Models zoeken we vrouwen en mannen van verschillende leeftijden, maten
                en achtergronden. Ook met een maatje meer ben je van harte welkom. Je hoeft geen
                ervaring te hebben. Nieuwsgierigheid en de bereidheid om iets nieuws te proberen
                zijn een mooi begin.
              </p>
              <p>
                Daarom nodigen we je uit voor een <strong>gratis testshoot en een persoonlijk
                intakegesprek</strong>. Een toegankelijke manier om kennis te maken met
                modellenwerk en samen te bekijken of je hiervoor in aanmerking komt.
              </p>
              <ul className="gts-questions">
                <li>Hoe voelt het om voor de camera te staan?</li>
                <li>Welke modellen zoeken we?</li>
                <li>Hoe verloopt een opdracht?</li>
                <li>En wat wordt er van je verwacht?</li>
              </ul>
              <p>
                Tijdens het intakegesprek maken we kennis met jou en vertellen we je hoe ons
                bureau werkt. Je krijgt duidelijke uitleg en alle ruimte om je vragen te stellen.
                We bespreken je interesses en bekijken samen welke mogelijkheden er voor jou
                kunnen zijn.
              </p>
              <p>
                <strong>En je mag het zelf ervaren!</strong>
              </p>
              <p>
                Tijdens de testshoot ontdek je hoe het voelt om voor de camera te staan. Je hoeft
                niet vooraf te weten hoe je moet kijken, bewegen of poseren. Je komt juist om
                kennis te maken en te ontdekken.
              </p>
              <p>
                Misschien voelt die eerste stap spannend. Dat is heel begrijpelijk wanneer je
                iets nieuws probeert. Je hoeft niets te bewijzen of iemand anders te worden. We
                willen graag zien wie jij bent en wat jouw uitstraling bijzonder maakt.
              </p>
              <p className="gts-pull">Gewone mensen. Bijzondere uitstraling.</p>
              <p>
                <strong>En hoe zit het met werk of studies?</strong>
              </p>
              <p>
                Modellenwerk gebeurt vaak per opdracht en kan, afhankelijk van de planning,
                daarmee gecombineerd worden. Betaalde opdrachten kunnen een mooie bijverdienste
                opleveren. We vertellen je eerlijk hoe dat werkt, zonder beloftes over
                opdrachten of inkomsten.
              </p>
              <p>
                Na de kennismaking interesse in meer? Dan bespreken we graag de mogelijkheden.
                Een testshoot en intakegesprek zijn een eerste stap om te bekijken of
                modellenwerk bij je past.
              </p>
              <p>
                Wil je gewoon eens kennismaken en ontdekken hoe het voelt om voor de camera te
                staan? Ook dan ben je welkom.
              </p>
              <p className="gts-highlight">
                De testshoot en het intakegesprek zijn volledig gratis en zonder verplichtingen.
                Iedereen is welkom — ervaring is niet nodig.
              </p>
              <p className="gts-close">
                Geef jezelf de kans om jouw mogelijkheden te ontdekken.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
