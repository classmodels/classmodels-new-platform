export const runtime = 'nodejs';

export async function POST() {
  return Response.json(
    { error: 'De volledige analyse kost € 4,99. Start de analyse op de pagina, dan volgt de betaling.' },
    { status: 402 },
  );
}
