import { Logger } from '@nestjs/common';

const log = new Logger('AgendaMailRouteMap');

export const ROUTE_MAP_EMAIL_CID = 'cm-route-map@classmodels';

export type RouteMapCoords = { lat: number; lon: number };

export type SmtpInlineAttachment = {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
};

function escHtmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function googleStaticMapUrl(from: RouteMapCoords, to: RouteMapCoords, apiKey: string): string {
  const path = `${from.lat},${from.lon}|${to.lat},${to.lon}`;
  const params = new URLSearchParams({
    size: '520x260',
    scale: '2',
    maptype: 'roadmap',
    key: apiKey,
  });
  params.append('markers', `color:0x2563eb|${from.lat},${from.lon}`);
  params.append('markers', `color:0x6f121b|${to.lat},${to.lon}`);
  params.append('path', `color:0x6f121bff|weight:4|${path}`);
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function osmStaticMapUrls(from: RouteMapCoords, to: RouteMapCoords): string[] {
  const centerLat = ((from.lat + to.lat) / 2).toFixed(5);
  const centerLon = ((from.lon + to.lon) / 2).toFixed(5);
  const markers = `${from.lat},${from.lon},lightblue1|${to.lat},${to.lon},red`;
  const q = new URLSearchParams({
    center: `${centerLat},${centerLon}`,
    zoom: '11',
    size: '560x280',
    markers,
  });
  const qs = q.toString();
  return [
    `https://staticmap.openstreetmap.de/staticmap.php?${qs}`,
    `https://staticmap.openstreetmap.fr/staticmap.php?${qs}`,
  ];
}

async function fetchMapImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ClassModelsAgenda/1.0 (class-models.be; mail-inline-map)' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      log.debug(`Kaart-URL HTTP ${res.status}: ${url.slice(0, 80)}…`);
      return null;
    }
    const ct = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!ct.includes('image')) {
      log.debug(`Kaart-URL geen afbeelding (${ct}): ${url.slice(0, 80)}…`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return null;
    return buf;
  } catch (e) {
    log.debug(`Kaart ophalen mislukt: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** Haalt routekaart op (Google Static indien key, anders OSM-mirrors). */
export async function fetchRouteMapImageBuffer(
  primaryUrl: string | undefined,
  from?: RouteMapCoords,
  to?: RouteMapCoords,
): Promise<Buffer | null> {
  const urls: string[] = [];
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (key && from && to) urls.push(googleStaticMapUrl(from, to, key));
  if (primaryUrl?.trim()) urls.push(primaryUrl.trim());
  if (from && to) urls.push(...osmStaticMapUrls(from, to));

  const seen = new Set<string>();
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    const buf = await fetchMapImageBuffer(url);
    if (buf) return buf;
  }
  return null;
}

/**
 * Vervangt externe kaart-URL in HTML door inline CID (betrouwbaar in Gmail/Outlook).
 * Zonder afbeelding: kapotte &lt;img&gt; verwijderen, link naar Google Maps blijft.
 */
export async function embedRouteMapInEmailHtml(
  html: string,
  opts: {
    staticMapImageUrl?: string;
    mapFrom?: RouteMapCoords;
    mapTo?: RouteMapCoords;
  },
): Promise<{ html: string; inlineAttachments: SmtpInlineAttachment[] }> {
  const mapUrl = opts.staticMapImageUrl?.trim();
  if (!mapUrl || !html.includes('Route naar Class-Models')) {
    return { html, inlineAttachments: [] };
  }

  const image = await fetchRouteMapImageBuffer(mapUrl, opts.mapFrom, opts.mapTo);
  if (!image) {
    const withoutImg = html.replace(
      /<p[^>]*>\s*<a[^>]*>\s*<img[^>]*alt="Route naar Class-Models"[^>]*\/?>\s*<\/a>\s*<\/p>/gi,
      '',
    );
    return { html: withoutImg, inlineAttachments: [] };
  }

  const cid = ROUTE_MAP_EMAIL_CID;
  const escaped = escHtmlAttr(mapUrl);
  let out = html;
  if (out.includes(escaped)) out = out.split(escaped).join(`cid:${cid}`);
  else if (out.includes(mapUrl)) out = out.split(mapUrl).join(`cid:${cid}`);

  return {
    html: out,
    inlineAttachments: [
      {
        filename: 'route-kaart.png',
        content: image,
        cid,
        contentType: 'image/png',
      },
    ],
  };
}
