'use client';

import { useRouter } from 'next/navigation';
import '@/components/gratis-testshoot.css';

const POSTER = '/nieuw/ontdek-modellenwerk.jpg';
const MEASURES = '/nieuw/fotoanalyse-metingen.jpg';

export type HomeCampaign = {
  slug: string;
  kicker: string;
  title: string;
  lead: string;
  body: string;
  highlight: string;
  close: string;
  button: string;
  image: string;
};

function pakketForSlug(slug: string): string {
  if (slug === 'intake-gesprek') return 'intake';
  if (slug === 'modellendag') return 'modellendag';
  return 'testshoot';
}

/** Gsm → mobiele agenda. Desktop → inschrijven met het pakket al gekozen. */
export function goToGuestAgenda(push: (href: string) => void, slug: string) {
  const pakket = pakketForSlug(slug);
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  if (mobile) {
    push(`/?m=guest&book=${encodeURIComponent(slug)}&pakket=${encodeURIComponent(pakket)}`);
    return;
  }
  window.location.assign(`/gasten/model-worden?pakket=${encodeURIComponent(pakket)}#inschrijven`);
}

export function goToGratisTestshootAgenda(push: (href: string) => void) {
  goToGuestAgenda(push, 'gratis-fotoshoot');
}

export function GratisTestshootLanding({ campaign }: { campaign?: HomeCampaign | null }) {
  const router = useRouter();
  const slug = campaign?.slug || 'gratis-fotoshoot';
  const go = () => goToGuestAgenda((href) => router.push(href), slug);

  return (
    <div className="gts-root">
      <section className="gts-hero" aria-labelledby="gts-title">
        <div className="gts-wrap">
          <div className="gts-open">
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
                en achtergronden. Ook met een maatje meer, als 50-plusser of als kind ben je van
                harte welkom. Je hoeft geen ervaring te hebben. Nieuwsgierigheid en de
                bereidheid om iets nieuws te proberen zijn een mooi begin.
              </p>
              <p>
                Daarom nodigen we je uit voor een{' '}
                <strong>volledig gratis en vrijblijvende professionele testshoot</strong>,
                gecombineerd met iets bijzonders: een uitgebreide, digitale modelanalyse die
                speciaal werd ontwikkeld om jouw persoonlijke mogelijkheden binnen de
                modellenwereld in kaart te brengen.
              </p>
            </div>

            <aside className="gts-side">
              <button type="button" className="gts-poster" onClick={go} aria-label="Plan je gratis testshoot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={POSTER}
                  alt="Class-Models. Ontdek of modellenwerk iets voor jou is. Gratis fotoshoot en een volledige, persoonlijke fotoanalyse."
                  width={819}
                  height={1024}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </button>
              <button type="button" className="gts-go" onClick={go}>
                Plan je gratis testshoot
              </button>
            </aside>
          </div>

          <article className="gts-article">
            <h2>Ontdek wat jouw uitstraling écht waard is in de modellenwereld</h2>
            <p>
              Iedereen heeft een unieke uitstraling. Maar wist je dat verschillende soorten
              modellenwerk ook om verschillende kenmerken vragen?
            </p>
            <p>
              Een gezicht dat perfect past bij een lifestylecampagne, hoeft niet noodzakelijk
              hetzelfde profiel te hebben als iemand die geschikt is voor fashion, commerciële
              fotografie of reclame.
            </p>
            <p>
              Daarom ontwikkelde Class-Models een eigen digitaal modelanalysesysteem waarmee we
              jouw persoonlijke kenmerken en uitstraling op een gestructureerde manier kunnen
              analyseren.
            </p>
            <p>
              <strong>
                Geen algemene beoordeling, maar een uitgebreide, individuele analyse van jouw
                modelprofiel.
              </strong>
            </p>
            <p>En het bijzondere? Je krijgt deze analyse bij ons helemaal gratis.</p>
          </article>
        </div>
      </section>

      <section className="gts-measure" aria-labelledby="gts-measure-title">
        <div className="gts-wrap">
          <p className="gts-kicker">Ter plaatse, op basis van jouw foto’s</p>
          <h2 id="gts-measure-title">Fotoanalyse en metingen op basis van de gemaakte foto’s</h2>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MEASURES}
              alt="Metingen van volledig lichaam, gezicht en zijprofiel op basis van de foto’s."
              width={1024}
              height={387}
              loading="lazy"
              decoding="async"
            />
          </figure>
        </div>
      </section>

      <section className="gts-hero" style={{ paddingTop: 8 }}>
        <div className="gts-wrap">
          <article className="gts-article">
            <h2>Een professionele digitale modelanalyse. Binnen 5 minuten.</h2>
            <p>
              Tijdens jouw gratis testshoot maken we verschillende foto’s van jou. Deze beelden
              vormen de basis voor onze speciaal ontwikkelde digitale modelanalyse.
            </p>
            <p>
              Aan de hand van deze foto’s onderzoekt ons analysesysteem verschillende zichtbare
              kenmerken van jouw gezicht, lichaamsverhoudingen en algemene uitstraling.
            </p>
            <p>
              De analyse is opgebouwd rond meetbare kenmerken, verhoudingen en gestructureerde
              beoordelingscriteria. Zo combineren we digitale beeldanalyse met een systematische
              benadering van verschillende modellenprofielen.
            </p>
            <p>
              <strong>
                Binnen ongeveer 5 minuten ontvang je een uitgebreid digitaal profiel dat jouw
                persoonlijke mogelijkheden als model in kaart brengt.
              </strong>
            </p>
            <p>
              Je ontdekt niet alleen welke kenmerken jou bijzonder maken, maar ook voor welke
              soorten modellenopdrachten jouw profiel het sterkst aansluit.
            </p>

            <h2>Wat ontdek je in jouw persoonlijke modelanalyse?</h2>
            <p>Je ontvangt een uitgebreid digitaal modelprofiel met onder andere:</p>
            <ul className="gts-questions">
              <li>
                <strong>Jouw persoonlijke modelprofiel:</strong> een gedetailleerd overzicht van
                je zichtbare kenmerken, verhoudingen en uitstraling.
              </li>
              <li>
                <strong>Jouw matchpercentage per modellenrichting:</strong> ontdek in percentages
                hoe sterk jouw profiel aansluit bij verschillende soorten modellenwerk.
              </li>
              <li>
                <strong>Jouw mogelijke modellenrichtingen:</strong> bekijk of je profiel
                bijvoorbeeld past bij fashion, commercial, lifestyle, reclamefotografie of
                real-people-campagnes.
              </li>
              <li>
                <strong>Jouw sterke punten:</strong> ontdek welke kenmerken jouw uitstraling
                bijzonder maken en bij welke opdrachten deze een troef kunnen zijn.
              </li>
              <li>
                <strong>Jouw aandachtspunten:</strong> krijg meer inzicht in de kenmerken die per
                modellenrichting een andere rol kunnen spelen.
              </li>
              <li>
                <strong>Jouw persoonlijke mogelijkheden:</strong> een overzicht van de
                modellenrichtingen waarin jouw profiel mogelijk interessant is.
              </li>
            </ul>

            <h3>Hoe goed match jij met verschillende soorten modellenwerk?</h3>
            <p>
              Misschien scoort jouw profiel bijzonder sterk voor commerciële fotografie, terwijl
              je voor lifestylecampagnes eveneens een interessante match hebt.
            </p>
            <p>
              Of misschien ontdek je dat jouw uitstraling beter aansluit bij een
              modellenrichting waar je zelf nooit aan gedacht had.
            </p>
            <p>
              Onze digitale analyse maakt deze verschillen inzichtelijk aan de hand van
              persoonlijke matchpercentages.
            </p>
            <p className="gts-note">
              Deze percentages geven een indicatie van de aansluiting tussen jouw profiel en de
              gebruikte beoordelingscriteria. Ze zijn geen wetenschappelijke voorspelling van
              succes of garantie op opdrachten.
            </p>
            <p>
              <strong>
                Zo ontdek je niet alleen hoe je eruitziet op foto, maar vooral welke
                mogelijkheden jouw uitstraling kan bieden.
              </strong>
            </p>

            <h2>Een exclusieve analyse die je nu volledig gratis ontvangt</h2>
            <p>
              Een professionele fotoshoot, een uitgebreide digitale profielanalyse en
              persoonlijk advies vormen samen een waardevolle kennismaking met de
              modellenwereld.
            </p>
            <p>
              Bij Class-Models vinden we dat iedereen de kans moet krijgen om zijn of haar
              mogelijkheden te ontdekken, zonder meteen kosten te moeten maken.
            </p>
            <p>
              Daarom stellen we onze speciaal ontwikkelde digitale modelanalyse momenteel{' '}
              <strong>volledig gratis ter beschikking van iedereen die deelneemt aan onze testshoot.</strong>
            </p>
            <p>
              Geen kosten voor de foto’s tijdens de testshoot. Geen kosten voor de digitale
              analyse. Geen verplichting om daarna verder te gaan.
            </p>
            <p>
              Je ontvangt een persoonlijk inzicht in jouw mogelijkheden, gebaseerd op de foto’s
              die tijdens jouw testshoot werden gemaakt.
            </p>

            <h2>Meer dan alleen een gratis fotoshoot</h2>
            <p>
              Tijdens het intakegesprek maken we kennis met jou en vertellen we je hoe ons
              bureau werkt. Je krijgt duidelijke uitleg en alle ruimte om vragen te stellen.
            </p>
            <p>
              We bespreken je interesses, bekijken je digitale modelprofiel en overlopen samen
              welke modellenrichtingen voor jou interessant kunnen zijn.
            </p>
            <p>
              Misschien bevestigt de analyse iets wat je zelf al vermoedde. Misschien ontdek je
              net een volledig nieuwe kant van jezelf.
            </p>
            <p>
              En misschien blijkt dat jouw uitstraling precies aansluit bij het type mensen dat
              merken en reclamebureaus zoeken.
            </p>
            <p>
              <strong>
                Je hoeft geen ervaring te hebben. Je hoeft geen perfect model te zijn. Je hoeft
                alleen jezelf te zijn.
              </strong>
            </p>
          </article>

          <div className="gts-closeband">
            <h2>Benieuwd naar jouw persoonlijke matchpercentages?</h2>
            <p>
              Ontdek tijdens een professionele testshoot hoe het voelt om voor de camera te
              staan en ontvang binnen ongeveer 5 minuten jouw uitgebreide digitale
              modelanalyse.
            </p>
            <p className="gts-close">Jouw gratis kennismaking omvat:</p>
            <ul className="gts-questions">
              <li>Een professionele testshoot</li>
              <li>Een volledige digitale modelanalyse op basis van jouw foto’s</li>
              <li>Een persoonlijk modelprofiel met matchpercentages</li>
              <li>Inzicht in jouw mogelijke modellenrichtingen</li>
              <li>Persoonlijke toelichting en advies</li>
            </ul>
            <p className="gts-highlight">Alles volledig kosteloos en vrijblijvend.</p>
            <h3>Misschien ben jij wel ons volgende gezicht.</h3>
            <p className="gts-pull">Ontdek jouw modelpotentieel</p>
            <p className="gts-lead">Gratis testshoot + volledige digitale modelanalyse</p>
            <p className="gts-close">Echte mensen. Echte verhalen.</p>
            <button type="button" className="gts-go" onClick={go}>
              Plan je gratis testshoot
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
