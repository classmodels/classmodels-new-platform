export const RUBRIC_VERSION = 'cm-modelprofiel-1';

export type AgeGroup = 'adult' | 'child';

export type Score = {
  score: number | null;
  evidence: string;
  uncertainty: string;
  source: 'invoer' | 'meetmodule' | 'visuele interpretatie';
};

export type Point = { title: string; observation: string; meaning: string };

export type Direction = {
  label: string;
  score: number | null;
  provisional: boolean;
  qualification: string;
  why: string;
  limit: string;
  unknown: string;
};

export type MeasureRow = {
  part: string;
  value: string;
  unit: string;
  status: 'gemeten' | 'geschat' | 'niet vast te stellen';
  meaning: string;
};

export type ModelReport = {
  fictional: boolean;
  version: string;
  summary: string;
  overall: number | null;
  overallNote: string;
  included: string[];
  excluded: string[];
  strengths: Point[];
  weaker: Point[];
  directions: Direction[];
  measures: MeasureRow[];
  top: string[];
  forCandidate: string;
  forBureau: string;
  extra: string;
  heightScore: number | null;
};

export function lengthScore(cm: number) {
  const raw = 100 - Math.max(0, 170 - cm) * 5;
  return Math.min(100, Math.max(0, raw));
}

export function qualify(score: number | null) {
  if (score === null) return 'Aanvullende beoordeling nodig';
  if (score >= 85) return 'Sterke aansluiting';
  if (score >= 70) return 'Bruikbare aansluiting';
  if (score >= 55) return 'Beperkte aansluiting';
  return 'Zwakke aansluiting voor deze richting';
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

export function runwayMatch(parts: {
  length: number | null;
  proportions: number | null;
  posture: number | null;
  style: number | null;
}) {
  if ([parts.length, parts.proportions, parts.posture, parts.style].some((n) => n === null)) return null;
  return Math.round(parts.length! * 0.3 + parts.proportions! * 0.25 + parts.posture! * 0.25 + parts.style! * 0.2);
}

const ADULT = [
  ['people', 'People / karakter'],
  ['commercial', 'Commercial / reclame'],
  ['lifestyle', 'Lifestyle'],
  ['ecommerce', 'E-commerce / kledingpresentatie'],
  ['beauty', 'Beauty / portret'],
  ['fashion', 'Fashion / editorial'],
] as const;

const CHILD = [
  ['clothing', 'Kinderkleding / e-commerce'],
  ['family', 'Familie / lifestyle'],
  ['commercial', 'Commercial / reclame'],
  ['portrait', 'Kinderportret'],
  ['show', 'Kindermodeshows'],
] as const;

type AiPack = {
  summary?: string;
  strengths?: Point[];
  weaker?: Point[];
  subscores?: Record<string, { score?: unknown; evidence?: string; uncertainty?: string }>;
  why?: Record<string, string>;
  limit?: Record<string, string>;
  unknown?: Record<string, string>;
  forCandidate?: string;
  forBureau?: string;
  extra?: string;
};

function points(list: unknown): Point[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const row = item as Point;
      if (!row?.title || !row?.observation) return null;
      return {
        title: String(row.title),
        observation: String(row.observation),
        meaning: String(row.meaning || ''),
      };
    })
    .filter((row): row is Point => !!row)
    .slice(0, 4);
}

export function buildReport(input: {
  fictional: boolean;
  ageGroup: AgeGroup;
  heightCm: number | null;
  measures: MeasureRow[];
  ai: AiPack;
}): ModelReport {
  const child = input.ageGroup === 'child';
  const heightScore = !child && input.heightCm !== null ? lengthScore(input.heightCm) : null;
  const sub = input.ai.subscores || {};
  const take = (key: string): number | null => num(sub[key]?.score);

  const directions: Direction[] = [];
  if (child) {
    for (const [key, label] of CHILD) {
      const score = take(key);
      directions.push({
        label,
        score,
        provisional: key === 'show',
        qualification: qualify(score),
        why: input.ai.why?.[key] || sub[key]?.evidence || '',
        limit: input.ai.limit?.[key] || '',
        unknown:
          input.ai.unknown?.[key] ||
          (key === 'show' ? 'Beweging en deelname aan een show zijn nog niet beoordeeld.' : sub[key]?.uncertainty || ''),
      });
    }
  } else {
    for (const [key, label] of ADULT) {
      const score = take(key);
      directions.push({
        label,
        score,
        provisional: false,
        qualification: qualify(score),
        why: input.ai.why?.[key] || sub[key]?.evidence || '',
        limit: input.ai.limit?.[key] || '',
        unknown: input.ai.unknown?.[key] || sub[key]?.uncertainty || '',
      });
    }
    const runway = runwayMatch({
      length: heightScore,
      proportions: take('proportions'),
      posture: take('posture'),
      style: take('show_style'),
    });
    directions.push({
      label: 'Modeshows / mannequin',
      score: runway,
      provisional: true,
      qualification: runway === null ? 'Onvoldoende gegevens' : `${qualify(runway)} · voorlopig`,
      why:
        input.ai.why?.runway ||
        (heightScore === null
          ? ''
          : `Lengte telt voor 30% en krijgt in deze bureauregel ${Math.round(heightScore)}%.`),
      limit: input.ai.limit?.runway || sub.show_style?.evidence || '',
      unknown: 'Looptechniek en beweging zijn nog niet beoordeeld. Deze match is voorlopig.',
    });
  }

  const included = directions.filter((d) => d.score !== null);
  const excluded = directions.filter((d) => d.score === null);
  const overall = included.length
    ? Math.round(included.reduce((sum, d) => sum + (d.score as number), 0) / included.length)
    : null;
  const ranked = [...included].sort((a, b) => (b.score as number) - (a.score as number));

  return {
    fictional: input.fictional,
    version: RUBRIC_VERSION,
    summary: String(input.ai.summary || ''),
    overall,
    overallNote: excluded.length
      ? `Gemiddelde van ${included.map((d) => d.label).join(', ')}. Niet meegenomen wegens onvoldoende gegevens: ${excluded.map((d) => d.label).join(', ')}.`
      : `Gemiddelde van ${included.map((d) => d.label).join(', ')}.`,
    included: included.map((d) => d.label),
    excluded: excluded.map((d) => d.label),
    strengths: points(input.ai.strengths),
    weaker: points(input.ai.weaker),
    directions,
    measures: input.measures,
    top: ranked.slice(0, 3).map((d) => d.label),
    forCandidate: String(input.ai.forCandidate || ''),
    forBureau: String(input.ai.forBureau || ''),
    extra: String(input.ai.extra || (child ? 'Beweging en showdeelname beoordeelt het bureau samen met ouder of voogd.' : 'Loopwerk vraagt een aanvullende beoordeling.')),
    heightScore,
  };
}

export function fictionalPack(ageGroup: AgeGroup, heightCm: number | null): AiPack {
  if (ageGroup === 'child') {
    return {
      summary:
        'Fictief voorbeeld. Dit kinderprofiel leest fris en natuurlijk in de drie beelden. De sterkste aansluiting in dit voorbeeld ligt bij kinderkleding, familie en commercial.',
      strengths: [
        { title: 'Natuurlijke presentatie', observation: 'De blik is open en de houding ontspannen.', meaning: 'Dat sluit aan bij familie- en lifestylebeelden.' },
        { title: 'Bruikbaar voor kleding', observation: 'Het silhouet is rustig en goed te volgen.', meaning: 'Kinderkleding en e-commerce kunnen hierop verder bouwen.' },
      ],
      weaker: [
        { title: 'Weinig expressievariatie', observation: 'Er is één rustige expressie te zien.', meaning: 'Een commercial die een tweede blik vraagt, is hier nog niet te beoordelen.' },
      ],
      subscores: {
        clothing: { score: 84, evidence: 'Fictief: het silhouet leest duidelijk voor kleding.' },
        family: { score: 86, evidence: 'Fictief: de presentatie oogt natuurlijk.' },
        commercial: { score: 80, evidence: 'Fictief: de blik komt in de lens.' },
        portrait: { score: 78, evidence: 'Fictief: het gezicht is vrij en leesbaar.' },
        show: { score: null, evidence: '', uncertainty: 'Beweging is niet te zien.' },
      },
      why: { clothing: 'Fictief voorbeeld van een rustige kledinglijn.', family: 'Fictief voorbeeld van een toegankelijke familie-uitstraling.', commercial: 'Fictief voorbeeld van cameracontact.', portrait: 'Fictief voorbeeld van een leesbaar gezicht.' },
      limit: { clothing: 'Alleen zichtbaar in stilstaande beelden.', show: 'Geen loop of draai gezien.' },
      unknown: { show: 'Showdeelname is nog niet beoordeeld.' },
      forCandidate: 'Fictief voorbeeld. Dit laat zien hoe een kinderanalyse eruitziet, niet een oordeel over een echt kind.',
      forBureau: 'Fictief voorbeeld. Beoordeel beweging en de opdracht samen met ouder of voogd.',
      extra: 'Beweging en deelname aan een show moeten door het bureau, samen met ouder of voogd, aanvullend worden beoordeeld.',
    };
  }
  const tall = heightCm !== null && heightCm >= 170;
  return {
    summary: tall
      ? 'Fictief voorbeeld. Je hebt een frisse, toegankelijke uitstraling. Dit sluit in dit voorbeeld vooral aan bij people, lifestyle en commerciële opdrachten. Je lichaamsverhoudingen bieden daarnaast mogelijkheden voor kledingpresentatie.'
      : 'Fictief voorbeeld. Je hebt een frisse, toegankelijke uitstraling. People, lifestyle en commercial liggen in dit voorbeeld het dichtstbij. De mannequinmatch blijft voorlopig en hangt ook af van de opgegeven lengte.',
    strengths: [
      { title: 'Toegankelijke uitstraling', observation: 'De blik is rustig en de presentatie benaderbaar.', meaning: 'Dat sluit aan bij people, lifestyle en commercial.' },
      { title: 'Leesbare lijn', observation: 'Schouders en heupen volgen een rechte lijn.', meaning: 'Kledingpresentatie en e-commerce kunnen hierop steunen.' },
      { title: 'Herkendbaar gezicht', observation: 'Voor- en zijaanzicht blijven hetzelfde gezicht.', meaning: 'Beauty en portret zijn bespreekbaar, zonder dat een verhouding op zich schoonheid bewijst.' },
    ],
    weaker: [
      { title: 'Beperkte editorialspanning', observation: 'De expressie blijft zacht en in één register.', meaning: 'Een dramatische editorialstijl vraagt een uitgesproken presentatie die hier minder sterk aansluit.' },
      { title: 'Beweging onbekend', observation: 'Er is geen loop of draai te zien.', meaning: 'De mannequinmatch blijft voorlopig, ook als de lengte gunstig is.' },
    ],
    subscores: {
      people: { score: 84, evidence: 'Fictief: de presentatie oogt eigen en benaderbaar.' },
      commercial: { score: 86, evidence: 'Fictief: de blik komt aan in de lens.' },
      lifestyle: { score: 85, evidence: 'Fictief: de uitstraling blijft alledaags.' },
      ecommerce: { score: 82, evidence: 'Fictief: de lijn is te volgen voor kleding.' },
      beauty: { score: 80, evidence: 'Fictief: het gezicht is vrij en rustig.' },
      fashion: { score: 68, evidence: 'Fictief: er is contour, nog weinig spanning.' },
      proportions: { score: 78, evidence: 'Fictief: de zichtbare verhoudingen zijn regelmatig.' },
      posture: { score: 76, evidence: 'Fictief: de houding is recht genoeg.' },
      show_style: { score: 70, evidence: 'Fictief: de lijn kan een showbeeld dragen.' },
    },
    why: {
      people: 'Fictief voorbeeld van een eigen, toegankelijke presentatie.',
      commercial: 'Fictief voorbeeld van cameracontact.',
      lifestyle: 'Fictief voorbeeld van een benaderbare uitstraling.',
      ecommerce: 'Fictief voorbeeld van een volgbare kledinglijn.',
      beauty: 'Fictief voorbeeld van een rustig portretgezicht.',
      fashion: 'Fictief voorbeeld van een nog zachte mode-expressie.',
      runway: 'De lengtedeelscore staat los van deze totale, voorlopige mannequinmatch.',
    },
    limit: {
      fashion: 'Deze richting vraagt een dramatischere presentatie dan hier zichtbaar is.',
      runway: 'Beweging telt niet mee zolang die niet is beoordeeld.',
    },
    forCandidate: 'Fictief voorbeeld, zodat je de opbouw van het rapport ziet. Dit is geen oordeel over jouw beelden.',
    forBureau: 'Fictief voorbeeld. De lengtedeelscore volgt de bureauregel. De mannequinmatch is het gewogen gemiddelde en blijft voorlopig.',
    extra: 'Looptechniek is nog niet beoordeeld.',
  };
}
