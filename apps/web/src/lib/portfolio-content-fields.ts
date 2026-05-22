/** Vaste portfolio-teksten — eenvoudig te bewerken via Admin → Portfolio-teksten. */
export const PORTFOLIO_CONTENT_FIELDS = [
  {
    key: 'portal.model.portfolio.info.title',
    label: 'Knop “Info portfolio” — titel in het kader',
    hint: 'Verschijnt als iemand op Info portfolio klikt (bijv. INFO PORTFOLIO).',
    defaultValue: 'INFO PORTFOLIO',
    rows: 1,
  },
  {
    key: 'portal.model.portfolio.info.body',
    label: 'Knop “Info portfolio” — tekst eronder',
    hint: 'De uitleg in het grijze kader (uw voorbeeldtekst).',
    defaultValue:
      'Kies een beschikbaar moment voor uw portfolio-afspraak. Uw gegevens worden automatisch gekoppeld aan uw inschrijving.',
    rows: 4,
  },
  {
    key: 'portal.model.portfolio.summary.empty.title',
    label: 'Geen afspraak — vetgedrukte regel',
    hint: 'Als het model nog geen portfolio-afspraak heeft.',
    defaultValue: 'U hebt nog geen afspraak ingeboekt.',
    rows: 2,
  },
  {
    key: 'portal.model.portfolio.summary.empty.body',
    label: 'Geen afspraak — tekst eronder',
    hint: 'Uitleg onder de vetgedrukte regel.',
    defaultValue: 'Klik rechtsboven op "Afspraak maken" om een moment te kiezen.',
    rows: 2,
  },
  {
    key: 'portal.model.portfolio.booking.hint',
    label: 'Scherm “Afspraak maken” — hint onder de kalender',
    hint: 'Korte tekst bij het kiezen van een moment.',
    defaultValue: 'Klik op een moment om je meteen in te schrijven. Er zijn geen extra velden nodig.',
    rows: 2,
  },
  {
    key: 'portal.model.portfolio.booked.prep.title',
    label: 'Met afspraak — kop “Voorzien voor portfolio”',
    hint: 'Als er al een afspraak staat ingeboekt.',
    defaultValue: 'Voorzien voor portfolio',
    rows: 1,
  },
  {
    key: 'portal.model.portfolio.booked.prep.body',
    label: 'Met afspraak — tekst over outfits / op tijd komen',
    hint: 'Instructies onder de afspraakgegevens.',
    defaultValue:
      'Breng enkele basisoutfits mee en kom op tijd. Tijdens de portfolio-afspraak maken we foto’s die gebruikt worden voor jouw profiel en voorstellen naar klanten.',
    rows: 4,
  },
] as const;
