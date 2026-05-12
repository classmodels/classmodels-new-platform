export type HomeContentCard = {
  kicker?: string;
  title: string;
  bullets?: string[];
  body?: string;
  ctaLabel?: string;
};

export type HomeNavPill = { id: string; label: string };

export type HomeNavSection = {
  id: string;
  label: string;
  kind: 'content' | 'auth' | 'catalog';
  pills?: HomeNavPill[];
  /** Keys = pill id, or "default" when there are no pills */
  cardsByPill: Record<string, HomeContentCard[]>;
};

export const MODELLEN_HOME_NAV: HomeNavSection[] = [
  {
    id: 'rooster',
    label: 'Modellen',
    kind: 'catalog',
    cardsByPill: { default: [] },
  },
  {
    id: 'model-worden',
    label: 'Model worden',
    kind: 'content',
    pills: [
      { id: 'fotoshoot', label: 'Gratis fotoshoot' },
      { id: 'casting', label: 'Casting' },
      { id: 'intake', label: 'Intakegesprek' },
    ],
    cardsByPill: {
      fotoshoot: [
        {
          kicker: 'Gratis testshoot',
          title: 'Professionele test-fotoshoot',
          bullets: [
            'Persoonlijke styling en begeleiding op set',
            'Selectie van beelden voor je startportfolio',
            'Geen verplichting na de shoot',
            'Planbaar op vrije momenten',
            'Eerlijk advies over je mogelijkheden',
          ],
          ctaLabel: 'Plan je gratis fotoshoot',
        },
        {
          kicker: 'Praktisch',
          title: 'Wat je meeneemt',
          bullets: ['Eén outfit die je goed zit', 'Eén extra look optioneel', 'Je eigen comfortniveau staat centraal'],
        },
      ],
      casting: [
        {
          kicker: 'Directe kansen',
          title: 'Doe mee aan de casting',
          bullets: [
            'Zichtbaarheid bij geselecteerde opdrachtgevers',
            'Duidelijke briefing per casting',
            'Terugkoppeling waar mogelijk',
            'Past bij zowel ervaren als nieuwe gezichten',
            'Altijd in overeenstemming met je beschikbaarheid',
          ],
          ctaLabel: 'Schrijf je in voor de casting',
        },
      ],
      intake: [
        {
          kicker: 'Persoonlijk advies',
          title: 'Intakegesprek',
          bullets: [
            'Vrijblijvend kennismakingsgesprek',
            'Doelen en verwachtingen in kaart',
            'Uitleg over werkwijze en planning',
            'Ruimte voor al je vragen',
            'Geen druk — wel duidelijkheid',
          ],
          ctaLabel: 'Boek je intakegesprek',
        },
      ],
    },
  },
  {
    id: 'auth',
    label: 'Inloggen & registreren',
    kind: 'auth',
    pills: [
      { id: 'model', label: 'Model' },
      { id: 'guest', label: 'Bezoeker' },
      { id: 'client', label: 'Klant' },
    ],
    cardsByPill: { default: [] },
  },
  {
    id: 'over',
    label: 'Over dit platform',
    kind: 'content',
    cardsByPill: {
      default: [
        {
          kicker: 'Class-Models',
          title: 'Jouw modellenplatform',
          body: 'Dit platform is je persoonlijke omgeving: profiel, portfolio, opdrachten en communicatie — strak en overzichtelijk.',
        },
      ],
    },
  },
];
