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

export const MODEL_WORDEN_EXTRA_CHECKLIST = [
  'Diversiteit centraal: alle leeftijden, maten en achtergronden zijn welkom.',
  'Flexibiliteit: jij beslist welke opdrachten je aanneemt en wanneer je werkt.',
  'Persoonlijke begeleiding: wij helpen je stap voor stap op weg.',
  'Extra inkomsten: modellenwerk is perfect te combineren met studie of werk.',
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
