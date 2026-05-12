/** Vaste inhoud gastenportaal — teksten conform aangeleverde ontwerpen. */

export type GuestMenuId =
  | 'model-worden'
  | 'gratis-fotoshoot'
  | 'casting'
  | 'intake-gesprek'
  | 'doelgroepen'
  | 'veelgestelde-vragen'
  | 'contact'
  | 'testshoot';

export const GUEST_MENU: { id: GuestMenuId; label: string }[] = [
  { id: 'model-worden', label: 'Model worden' },
  { id: 'gratis-fotoshoot', label: 'Gratis fotoshoot' },
  { id: 'casting', label: 'Casting' },
  { id: 'intake-gesprek', label: 'Intake gesprek' },
  { id: 'doelgroepen', label: 'Doelgroepen' },
  { id: 'veelgestelde-vragen', label: 'Veelgestelde vragen' },
  { id: 'contact', label: 'Contact' },
  { id: 'testshoot', label: 'Testshoot' },
];

/** Linkermenu — zonder Contact (die staat in de site-header). */
export const GUEST_SIDEBAR_MENU: { id: GuestMenuId; label: string }[] = GUEST_MENU.filter(
  (m) => m.id !== 'contact',
);

export const CARD_MODEL_WORDEN = [
  {
    kicker: 'GRATIS TESTSHOOT',
    title: 'Gratis professionele test-fotoshoot',
    bullets: [
      'Doe mee aan een gratis professionele testshoot.',
      'Ervaar hoe het is om voor de camera te staan.',
      'Geen ervaring nodig, wij begeleiden je stap voor stap.',
      "Je ontvangt je foto's zonder kosten.",
      'Wil je daarna als model aan de slag, dan krijg je een vrijblijvend intakegesprek.',
    ],
    cta: 'Plan je gratis fotoshoot',
  },
  {
    kicker: 'DIRECTE KANSEN',
    title: 'Doe mee aan de casting',
    bullets: [
      'Schrijf je in voor een casting voor echte opdrachten.',
      'Ontdek of jouw uitstraling past bij campagnes, fotoshoots of events.',
      'Ervaring is niet vereist, wij zoeken vooral natuurlijke en spontane mensen.',
      'De casting is bedoeld voor uiteenlopende profielen en leeftijden.',
      'Bij een match kan je worden opgenomen voor toekomstige boekingen.',
    ],
    cta: 'Schrijf je in voor de casting',
  },
  {
    kicker: 'PERSOONLIJK ADVIES',
    title: 'Intake gesprek',
    bullets: [
      'Kom langs voor een vrijblijvend intakegesprek.',
      'Ontdek of jij het potentieel hebt om als model aan de slag te gaan.',
      'We bespreken jouw uitstraling, profiel en mogelijkheden.',
      'Samen bekijken we welke kansen het best bij jou passen.',
      'Zo begin je goed voorbereid aan jouw eerste stappen als model.',
    ],
    cta: 'Boek nu je intake gesprek',
  },
] as const;

/** Onder de drie kolommen — twee regels per item, zoals het ontwerp. */
export const MODEL_WORDEN_TRUST_BAR = [
  { icon: 'star' as const, line1: 'Professionele', line2: 'begeleiding' },
  { icon: 'heart' as const, line1: 'Eerlijke kansen', line2: 'voor iedereen' },
  { icon: 'circle' as const, line1: 'Hoogwaardige', line2: "portfolio's" },
  { icon: 'diamond' as const, line1: 'Veelzijdige', line2: 'opdrachten' },
  { icon: 'check' as const, line1: 'Betrouwbaar &', line2: 'persoonlijk' },
] as const;

export const MODEL_WORDEN_STATS = [
  { value: '20+', label: 'Jaar ervaring' },
  { value: '450+', label: 'Inschrijvingen' },
  { value: '98%', label: 'Tevredenheid' },
  { value: '6', label: 'Doelgroepen' },
] as const;

export const WAAROM_PARAGRAPHS = [
  'Bij Class-Models geloven we dat modellenwerk toegankelijk moet zijn voor iedereen met uitstraling, motivatie en authenticiteit.',
  'Of je nu jong bent of al wat levenservaring hebt, met of zonder ervaring, klassiek of net heel herkenbaar: bij ons is iedereen welkom. Niet perfecte maten, maar persoonlijkheid, uitstraling en charme maken het verschil.',
  'Modellenwerk is bovendien ideaal als extra bron van inkomsten en perfect te combineren met studie, werk of andere verplichtingen. Jij beheert je eigen agenda en kiest alleen de opdrachten die bij jou passen.',
] as const;

export const WAAROM_CHECKLIST = [
  'Toegankelijk voor iedereen: geen ervaring nodig, iedereen maakt kans.',
  'Diversiteit centraal: alle leeftijden, maten en achtergronden zijn welkom.',
  'Flexibiliteit: jij beslist welke opdrachten je aanneemt en wanneer je werkt.',
  'Persoonlijke begeleiding: wij helpen je stap voor stap op weg.',
  'Extra inkomsten: modellenwerk is perfect te combineren met studie of werk.',
] as const;

export const DOELGROEPEN_INTRO =
  'Wij zoeken uiteenlopende profielen voor campagnes, events, reclame en fotoshoots.';

export const DOELGROEPEN_CARDS = [
  { title: 'Kinderen', body: 'Voor campagnes gericht op de jongste doelgroep' },
  { title: 'Tieners', body: 'Fris, energiek en perfect voor de laatste mode' },
  { title: 'Volwassenen', body: 'Diverse leeftijden en stijlen, van elegant tot casual' },
  { title: 'Maatje meer', body: 'Voor een representatieve en inclusieve uitstraling' },
  { title: '60+', body: 'Voor campagnes gericht op een volwassen doelgroep' },
  { title: 'Mannen', body: 'Voor campagnes gericht op een mannelijke doelgroep' },
] as const;

/** Veelgestelde vragen — gastenportaal. */
export const GUEST_FAQ = [
  {
    q: 'Moet ik ervaring hebben?',
    a: 'Nee. Wij zoeken echte mensen van alle leeftijden, maten en achtergronden. Ervaring is niet nodig.',
  },
  {
    q: 'Wie zoeken jullie precies?',
    a: 'Mannen, vrouwen, tieners, kinderen, 60-plussers en mensen met een maatje meer. Uitstraling, motivatie en authenticiteit zijn belangrijker dan perfecte maten.',
  },
  {
    q: 'Wat kan ik verwachten tijdens een intake of casting?',
    a: 'Je wordt vriendelijk ontvangen, krijgt uitleg over mogelijke opdrachten en samen bekijken we welke kansen het best bij jou passen.',
  },
  {
    q: 'Kan ik iemand meenemen?',
    a: 'Ja. Voor minderjarigen, thuiswonenden of studenten is een ouder of voogd verplicht aanwezig.',
  },
  {
    q: 'Kan ik modellenwerk combineren met mijn studie of job?',
    a: 'Zeker. Jij beheert je eigen agenda en kiest de opdrachten die in jouw planning passen.',
  },
] as const;

/** Pagina “Intake gesprek” — twee kolommen + CTA. */
export const INTAKE_GESPREK_PAGE = {
  /** Agenda slug (Agenda Pro equivalent) voor online boeking in het nieuwe platform. */
  agendaSlug: 'intake-gesprek',
  howTitle: 'Hoe werkt het?',
  whyTitle: 'Waarom kiezen voor Class-Models?',
  bookingSubject: 'Afspraak intakegesprek',
  ctaButton: 'Online afspraak maken intake gesprek',
  steps: [
    'Boek eenvoudig online een afspraak via de knop hieronder.',
    'We leren jou en jouw uitstraling beter kennen.',
    'Je krijgt eerlijk en professioneel advies over jouw kansen.',
    'Daarna kies jij zelf of je verder wil gaan.',
  ],
} as const;

/** Pagina “Testshoot” — galerij + feedback vóór download (los van gratis-fotoshoot boeking). */
export const TESTSHOOT_PAGE = {
  kicker: 'Testshoot',
  title: 'Jouw testshoot-foto’s',
  intro:
    'Hier vind je de foto’s van je testshoot. Geef eerst kort feedback; daarna kun je alle foto’s in volle kwaliteit als zip downloaden. Na een geslaagde download verdwijnen ze van deze pagina (ze worden van de publieke site gehaald).',
} as const;

/** Pagina “Gratis fotoshoot” — inhoud + doelgroepen-kolom + CTA. */
export const GRATIS_FOTOSHOOT_PAGE = {
  agendaSlug: 'gratis-fotoshoot',
  expectTitle: 'Wat mag je verwachten?',
  expectBullets: [
    'Volledig gratis en zonder verplichtingen.',
    "Je ontvangt je foto's zonder kosten.",
    'Geschikt voor kinderen, tieners, volwassenen, 60-plussers en maatje meer.',
    'Perfect om te ontdekken of modellenwerk iets voor jou is.',
    'Na de shoot kunnen we, indien jij dat wil, een vrijblijvend intakegesprek plannen.',
  ],
  whyTitle: 'Waarom deelnemen?',
  whyParagraph:
    'Bij Class-Models draait het om jouw uitstraling, jouw verhaal en jouw potentieel. We zoeken geen perfectie, wel authenticiteit, spontaniteit en charisma.',
  bookingSubject: 'Afspraak gratis fotoshoot',
  ctaButton: 'Online afspraak maken gratis fotoshoot',
} as const;

/** Pagina “Casting” — inhoud + doelgroepen-kolom + CTA. */
export const CASTING_PAGE = {
  agendaSlug: 'casting',
  expectTitle: 'Wat mag je verwachten?',
  expectBullets: [
    'Geen ervaring nodig: iedereen met de juiste uitstraling kan meedoen.',
    'We zoeken natuurlijke, spontane profielen — perfectie is niet nodig.',
    'De casting sluit aan bij uiteenlopende campagnes, fotoshoots en events.',
    'Je ontdekt of jouw look past bij opdrachten voor merken en klanten.',
    'Bij een match word je opgenomen in ons bestand voor toekomstige boekingen.',
  ],
  whyTitle: 'Waarom deelnemen?',
  whyParagraph:
    'Bij Class-Models focussen we op charisma en authenticiteit in plaats van perfecte maten. We geloven dat jouw persoonlijkheid en spontaniteit het verschil maken.',
  bookingSubject: 'Inschrijving casting',
  ctaButton: 'Online afspraak maken casting',
} as const;

/** Publieke contactgegevens (gastenportaal). */
export const GUEST_CONTACT_INFO = {
  company: 'Class-Models',
  street: 'Provinciebaan 3',
  cityLine: '2235 Hulshout',
  email: 'info@class-models.be',
  phoneDisplay: '0032 (0) 485 322 307',
  phoneTel: '+32485322307',
  bankLabel: 'Argenta',
  iban: 'BE85 9734 6507 0706',
  vat: 'BE 0504.801.460',
  mapsEmbedUrl:
    'https://maps.google.com/maps?q=Provinciebaan+3,+2235+Hulshout,+België&hl=nl&z=16&output=embed',
  mapsOpenUrl: 'https://www.google.com/maps/search/?api=1&query=Provinciebaan+3,+2235+Hulshout,+Belgium',
} as const;
