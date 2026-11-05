import { buildReport, type AgeGroup, type MeasureRow, type ModelReport } from '@/lib/model-analyse';
import { openaiKey } from '@/lib/model-intake-store';

export async function runModelAnalysis(input: {
  ageGroup: AgeGroup;
  gender?: string;
  heightCm: number | null;
  childAge: number | null;
  images: string[];
  measures: MeasureRow[];
}): Promise<ModelReport> {
  const aiKey = await openaiKey();
  if (!aiKey) throw new Error('De analyse is nu niet beschikbaar. Vul in de backsite de OpenAI-sleutel in.');
  const child = input.ageGroup === 'child';
  const prompt = [
    'Je beoordeelt een MODELPROFIEL voor Class-Models, in het Nederlands.',
    'Bespreek zichtbare lichaamsverhoudingen, presentatie, uitstraling en aansluiting bij modelrichtingen.',
    'Bespreek geen belichting, scherpte, achtergrond, uitsnede of fotografische kwaliteit.',
    'Leid geen persoonlijkheid, gezondheid, discipline of werkhouding af.',
    'Noem een gezichtsverhouding nooit een bewijs van schoonheid of succes. Vergelijk niet met andere mensen.',
    'Verzin geen centimeters en geen percentage. Geef per deelscore een getal van 0 tot 100 of null als het niet zichtbaar is.',
    child
      ? 'Dit is een kind of minderjarige. Geen volwassen beautycriteria, geen aantrekkelijkheidsscore, geen minpunt omdat het kind kleiner is dan 170 cm. Richtingen: clothing, family, commercial, portrait, show. Zet show op null.'
      : 'Dit is een volwassene. Deelscores: people, commercial, lifestyle, ecommerce, beauty, fashion, proportions, posture, show_style.',
    `Leeftijdsgroep: ${input.ageGroup}. Geslacht zoals opgegeven: ${input.gender || 'niet opgegeven'}. Lengte: ${input.heightCm ?? 'niet opgegeven'}. Leeftijd kind: ${input.childAge ?? 'n.v.t.'}.`,
    'Antwoord alleen met JSON: summary, strengths[{title,observation,meaning}], weaker[{title,observation,meaning}], subscores{sleutel:{score,evidence,uncertainty}}, why{}, limit{}, unknown{}, forCandidate, forBureau, extra.',
  ].join(' ');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${aiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...input.images.map((url) => ({ type: 'image_url', image_url: { url } })),
        ],
      }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('De analyse is niet gelukt.');
  const ai = JSON.parse(data?.choices?.[0]?.message?.content);
  return buildReport({
    fictional: false,
    ageGroup: input.ageGroup,
    heightCm: input.heightCm,
    measures: input.measures,
    ai,
  });
}
