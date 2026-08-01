/** Algemene voorwaarden try-out — compacte opmaak zoals info-tekst. */
import type { ReactNode } from 'react';

export function TryoutTermsContent({ priceLabel = '€ 600' }: { priceLabel?: string }) {
  return (
    <div style={{ display: 'grid', gap: 0, fontSize: 11.5, lineHeight: 1.55, color: 'var(--n-mut)' }}>
      <Article title="Artikel 1 – Inschrijving en deelname">
        <P>1.1 Door inschrijving voor de Try-Out Modeshow verklaart het model zich akkoord met deze algemene voorwaarden.</P>
        <P>
          1.2 Deelname is vrijwillig. Na inschrijving en akkoordverklaring is deelname verplicht.
        </P>
        <P>
          1.3 De deelnamekost bedraagt <strong style={{ color: 'var(--n-gold)' }}>{priceLabel}</strong>. Het model
          ontvangt hiervoor <strong style={{ color: 'var(--n-ink)' }}>30 inkomkaarten</strong>, die vrij mogen worden
          verdeeld of verkocht.
        </P>
      </Article>

      <Divider />

      <Article title="Artikel 2 – Annulering en terugbetaling">
        <P>2.1 Bij annulering door het model volgt geen restitutie van het inschrijfgeld.</P>
        <P>
          2.2 Bij annulering zonder aantoonbare overmacht wordt het model uit het bestand van Class-Models verwijderd
          en uitgesloten van toekomstige opdrachten.
        </P>
        <P>
          2.3 Indien de Try-Out Modeshow door overmacht aan de zijde van Class-Models niet kan doorgaan én niet kan
          worden verplaatst, wordt het betaalde bedrag volledig terugbetaald.
        </P>
        <P>2.4 In alle andere gevallen is restitutie uitgesloten.</P>
      </Article>

      <Divider />

      <Article title="Artikel 3 – Verplichtingen van het model">
        <P>3.1 Het model neemt deel aan drie oefenlessen in aanloop naar de Try-Out Modeshow.</P>
        <P>3.2 Het model past op de afgesproken dagen en tijden kleding bij de deelnemende zaken.</P>
        <P>
          3.3 Op de dag van de show heeft het model recht op visagie, haarstyling, setcards, foto’s en een volledige
          filmopname.
        </P>
      </Article>

      <Divider />

      <Article title="Artikel 4 – Gedragscode en vertrouwelijkheid">
        <P>
          4.1 Het model stelt zich professioneel, respectvol en positief op tegenover organisatie, andere modellen,
          klanten en betrokkenen.
        </P>
        <P>
          4.2 Negatief gedrag, roddelen of het aanzetten tot negativiteit leidt tot onmiddellijke uitsluiting en
          verwijdering uit het bestand van Class-Models.
        </P>
        <P>4.3 Opmerkingen of klachten kunnen rechtstreeks bij de directie worden gemeld.</P>
        <P>
          4.4 Wie getuige is van negatief gedrag en dit niet meldt, kan als medeplichtig worden beschouwd.
        </P>
        <P>
          4.5 Interne informatie of persoonlijke gegevens mogen niet aan klanten worden verstrekt.
        </P>
        <P>
          4.6 Zelfstandige opdrachten voor klanten zonder Class-Models (na bemiddeling) zijn verboden en kunnen tot
          schadevergoeding leiden.
        </P>
      </Article>

      <Divider />

      <Article title="Artikel 5 – Samenwerking met klanten">
        <P>
          5.1 Klanten ontvangen een lijst van passerende modellen en vullen een evaluatieformulier in.
        </P>
        <P>5.2 Het model is stipt op tijd bij afspraken met klanten.</P>
        <P>
          5.3 Hygiëne en uitstraling: verzorgde haren, nette kleding, indien mogelijk licht opgemaakt, vriendelijke
          houding.
        </P>
        <P>5.4 Het model draagt de door de winkel gekozen kleding; discussie hierover is niet toegestaan.</P>
        <P>5.5 Een goede eerste indruk is essentieel.</P>
      </Article>

      <Divider />

      <Article title="Artikel 6 – Uitsluiting en sancties">
        <P>
          6.1 Ongepast gedrag of het niet naleven van deze voorwaarden kan leiden tot uitsluiting zonder compensatie.
        </P>
        <P>6.2 Bij uitsluiting wordt het model per e-mail geïnformeerd.</P>
      </Article>

      <Divider />

      <Article title="Artikel 7 – Overige bepalingen">
        <P>7.1 In gevallen waarin deze voorwaarden niet voorzien, beslist Class-Models.</P>
        <P>
          7.2 Door inschrijving verklaart het model deze voorwaarden te hebben gelezen, begrepen en ermee akkoord te
          gaan.
        </P>
      </Article>
    </div>
  );
}

function Article({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ padding: '12px 0' }}>
      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--n-serif)',
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--n-gold)',
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>
      <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0 }}>{children}</p>;
}

function Divider() {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, var(--n-gold-hair), transparent)',
      }}
    />
  );
}
