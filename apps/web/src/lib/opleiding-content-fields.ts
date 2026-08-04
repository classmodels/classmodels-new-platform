/** Vaste opleidingsteksten — te bewerken via Admin → Teksten (modelportaal). */
export const OPLEIDING_CONTENT_FIELDS = [
  {
    key: 'portal.model.opleiding.info.title',
    label: 'Knop “Info opleiding” — titel in het kader',
    hint: 'Verschijnt als iemand op Info opleiding klikt.',
    defaultValue: 'INFO OPLEIDING',
    rows: 1,
  },
  {
    key: 'portal.model.opleiding.info.body',
    label: 'Knop “Info opleiding” — tekst eronder',
    hint: 'Volledige uitleg over de basisopleiding (zelfde tekst op site en gsm).',
    defaultValue: `Inschrijven voor de basisopleiding
Model, Mannequin & Dressman

Een praktijkgerichte eerste stap in de mode- en modellenwereld.

Bent u klaar om uw eerste stappen te zetten in de modellenwereld? Bij Class-Models volgt u een doelgerichte basisopleiding waarin u de essentiële vaardigheden, kennis en professionele houding ontwikkelt die nodig zijn voor opdrachten in de mode- en modellenbranche.

Begeleiding door een ervaren professional
De opleiding wordt verzorgd door een ervaren model dat al jarenlang actief is binnen de internationale modellenwereld. Zij deelt haar kennis, ervaring en passie vrijwillig en onbezoldigd met de deelnemers. Vanuit haar betrokkenheid bij het vak begeleidt zij u persoonlijk en helpt zij u om met meer zelfvertrouwen, inzicht en professionaliteit aan uw ontwikkeling als model te werken.

Wat leert u tijdens de opleiding?

1. Catwalktraining
U leert hoe u zich zelfverzekerd, natuurlijk en professioneel over de catwalk beweegt. Bij mannequins ligt de nadruk op elegantie, houding en finesse. Dressmen leren een krachtige, stijlvolle en mannelijke presentatie neer te zetten.

2. Poseren voor foto en show
U maakt kennis met verschillende poses en leert hoe u uw lichaam, houding en gezichtsuitdrukking doelgericht inzet tijdens fotoshoots, castings en modeshows.

3. Voorbereiding op opdrachten
U krijgt praktische informatie over wat er van u verwacht wordt bij een modeshow, fotoshoot, reclamecampagne, televisieopname of andere modellenopdracht. U leert hoe u zich voorbereidt, waarop u moet letten en hoe u zich professioneel opstelt tegenover opdrachtgevers en medewerkers.

4. Persoonlijke feedback
De docente observeert uw houding, uitstraling en bewegingen, benoemt uw sterke punten en geeft gerichte tips om deze verder te ontwikkelen.

Kort, intensief en doelgericht
Wij kiezen bewust voor een compacte en praktijkgerichte basisopleiding. U krijgt in korte tijd de belangrijkste technieken en inzichten aangereikt, zonder overbodige theorie. Zo beschikt u over een sterke basis en bent u beter voorbereid op de volgende stap binnen uw modellenloopbaan.

Vervolgtraject: Try-Out Modeshow en oefenlessen
Na de basisopleiding kunt u deelnemen aan de Try-Out Modeshow, onze praktische examenshow. Deelnemers aan deze show krijgen bovendien toegang tot drie extra oefenlessen. Tijdens deze lessen wordt de volledige choreografie stap voor stap aangeleerd en ingeoefend, zodat u goed voorbereid, zelfverzekerd en met de juiste uitstraling het podium opgaat.

Klaar voor uw eerste stap?
Schrijf u in voor de basisopleiding en ontdek hoe u uw houding, uitstraling en talent professioneel kunt ontwikkelen.

Praktisch
Het opleidingsmoment duurt drie uur: 14:00 tot 17:00. Breng een notitieboekje, comfortabele schoenen en eventueel enkele basisoutfits mee.`,
    rows: 24,
  },
  {
    key: 'portal.model.opleiding.booked.prep.title',
    label: 'Met afspraak — kop “Voorzien voor opleiding”',
    hint: 'Als er al een opleidingsafspraak staat ingeboekt.',
    defaultValue: 'Voorzien voor opleiding',
    rows: 1,
  },
  {
    key: 'portal.model.opleiding.booked.prep.body',
    label: 'Met afspraak — korte praktische tip',
    hint: 'Korte tip onder de afspraakgegevens.',
    defaultValue:
      'Tijdens de opleiding overlopen we de werking van Class-Models, houding, presentatie, opdrachten en verwachtingen. Breng een notitieboekje, comfortabele schoenen en eventueel enkele basisoutfits mee. Het moment duurt drie uur: 14:00 tot 17:00.',
    rows: 4,
  },
] as const;

export const OPLEIDING_INFO_TITLE_FALLBACK = OPLEIDING_CONTENT_FIELDS[0].defaultValue;
export const OPLEIDING_INFO_BODY_FALLBACK = OPLEIDING_CONTENT_FIELDS[1].defaultValue;
