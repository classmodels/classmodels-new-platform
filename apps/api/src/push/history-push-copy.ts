/** Nederlandse titel + tekst voor historiek → push (zelfde gebeurtenissen als tab Historiek). */
export function historyKindToPushMessage(
  kind: string,
  meta?: Record<string, unknown>,
): { title: string; body: string } {
  const velden =
    Array.isArray(meta?.velden) && meta.velden.every((x) => typeof x === 'string')
      ? (meta!.velden as string[]).join(', ')
      : typeof meta?.velden === 'string'
        ? meta.velden
        : '';

  switch (kind) {
    case 'agenda_booked':
      return {
        title: 'Afspraak geboekt',
        body: 'Je hebt een afspraak in de agenda geplaatst.',
      };
    case 'agenda_cancelled':
      return {
        title: 'Afspraak geannuleerd',
        body: 'Een agenda-afspraak werd geannuleerd.',
      };
    case 'agenda_cancelled_via_link':
      return {
        title: 'Afspraak geannuleerd',
        body: 'Een agenda-afspraak werd geannuleerd via de link in de mail.',
      };
    case 'agenda_attendance_confirmed':
      return {
        title: 'Aanwezigheid bevestigd',
        body: 'Je aanwezigheid voor een afspraak werd bevestigd.',
      };
    case 'profile_updated':
      return {
        title: 'Profiel bijgewerkt',
        body: velden ? `Velden: ${velden}.` : 'Je modellenprofiel werd bijgewerkt.',
      };
    case 'premium_paid':
      return {
        title: 'Premium geactiveerd',
        body: 'Je premium werd verwerkt. Bedankt!',
      };
    case 'premium_revoked':
      return {
        title: 'Premium aangepast',
        body: 'Je premium-status werd gewijzigd.',
      };
    case 'brief_interest_submitted':
      return {
        title: 'Interesse bij opdracht',
        body: 'Je interesse voor een opdracht werd geregistreerd.',
      };
    case 'brief_interest_withdrawn':
      return {
        title: 'Interesse ingetrokken',
        body: 'Je interesse voor een opdracht werd ingetrokken.',
      };
    case 'portfolio_photo_uploaded':
      return {
        title: 'Portfolio-foto',
        body: 'Er werd een nieuwe foto in je portfolio geplaatst.',
      };
    case 'portfolio_download_ack':
      return {
        title: 'Download bevestigd',
        body: 'Je download van portfolio-materiaal werd bevestigd.',
      };
    default:
      return {
        title: 'Activiteit op je account',
        body: `Nieuwe registratie in je historiek (${kind}).`,
      };
  }
}
