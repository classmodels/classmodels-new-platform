import { NextResponse } from 'next/server';

/** Class-Models kantoor (Provinciebaan 3, 2235 Hulshout). */
const OFFICE = { lat: 51.0745, lon: 4.7908 };

type LatLon = { lat: number; lon: number };

async function geocodeBe(query: string): Promise<LatLon | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=be`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ClassModelsWeb/1.0 (class-models.be)' },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
  const hit = rows[0];
  if (!hit) return null;
  const lat = parseFloat(hit.lat);
  const lon = parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

async function drivingKm(from: LatLon, to: LatLon): Promise<number | null> {
  const path = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = (await res.json()) as { routes?: Array<{ distance?: number }> };
  const m = json.routes?.[0]?.distance;
  if (!m || !Number.isFinite(m)) return null;
  return Math.round(m / 100) / 10;
}

export async function POST(req: Request) {
  let body: {
    straat?: string;
    nr?: string;
    postcode?: string;
    gemeente?: string;
    adres?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Ongeldige aanvraag.' }, { status: 400 });
  }

  const composed =
    body.adres?.trim() ||
    [body.straat, body.nr].filter(Boolean).join(' ') +
      (body.postcode || body.gemeente
        ? `, ${[body.postcode, body.gemeente].filter(Boolean).join(' ')}`
        : '');

  const adres = composed.replace(/^,\s*/, '').trim();
  if (adres.length < 6) {
    return NextResponse.json(
      { message: 'Vul straat, nummer, postcode en gemeente in.' },
      { status: 400 },
    );
  }

  const to = await geocodeBe(`${adres}, België`);
  if (!to) {
    return NextResponse.json(
      { message: 'Adres niet gevonden. Controleer straat, nummer, postcode en gemeente.' },
      { status: 400 },
    );
  }

  const km = await drivingKm(OFFICE, to);
  if (km == null) {
    return NextResponse.json(
      { message: 'Afstand kon niet worden berekend. Probeer opnieuw.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    km,
    label: `${km} km enkele rit — heen en terug × € 0,70/km`,
  });
}
