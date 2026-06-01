import { Injectable, Logger } from '@nestjs/common';
import { fetchTimeoutMs, withFetchTimeout } from './agenda-fetch-timeout';
import {
  CLASS_MODELS_OFFICE,
  formatGuestAddressFromFields,
  googleMapsDirectionsUrl,
} from './class-models-office';

export type AgendaTravelInfo = {
  visitorAddress: string;
  distanceKm: number;
  durationMinutes: number;
  mapsDirectionsUrl: string;
  mapsEmbedUrl: string;
  officeAddress: string;
  distanceLabel: string;
  /** Statische kaartafbeelding voor e-mail (OSM). */
  staticMapImageUrl: string;
  mapFrom?: LatLon;
  mapTo?: LatLon;
};

type LatLon = { lat: number; lon: number };

@Injectable()
export class AgendaTravelService {
  private readonly log = new Logger(AgendaTravelService.name);
  private readonly geocodeMs = fetchTimeoutMs('AGENDA_GEOCODE_TIMEOUT_MS', 5000);
  private readonly routeMs = fetchTimeoutMs('AGENDA_ROUTE_TIMEOUT_MS', 5000);

  async travelInfoForGuestFields(fields: Record<string, string>): Promise<AgendaTravelInfo | null> {
    const visitorAddress = formatGuestAddressFromFields(fields);
    if (!visitorAddress || visitorAddress.length < 6) return null;
    try {
      const from = await withFetchTimeout(this.geocode(visitorAddress), this.geocodeMs, null);
      const to = this.officeCoordinates();
      if (!from || !to) return null;
      const route = await withFetchTimeout(this.drivingRoute(from, to), this.routeMs, null);
      if (!route) return null;
      const distanceKm = Math.round((route.distanceM / 1000) * 10) / 10;
      const durationMinutes = Math.max(1, Math.round(route.durationS / 60));
      return {
        visitorAddress,
        distanceKm,
        durationMinutes,
        mapsDirectionsUrl: googleMapsDirectionsUrl(visitorAddress),
        mapsEmbedUrl: CLASS_MODELS_OFFICE.mapsEmbedUrl,
        officeAddress: CLASS_MODELS_OFFICE.fullAddress,
        distanceLabel: `ca. ${distanceKm} km (${durationMinutes} min met de auto)`,
        staticMapImageUrl: this.staticMapImageUrl(from, to),
        mapFrom: from,
        mapTo: to,
      };
    } catch (e) {
      this.log.warn(
        `Route niet berekend voor "${visitorAddress}": ${e instanceof Error ? e.message : String(e)}`,
      );
      return {
        visitorAddress,
        distanceKm: 0,
        durationMinutes: 0,
        mapsDirectionsUrl: googleMapsDirectionsUrl(visitorAddress),
        mapsEmbedUrl: CLASS_MODELS_OFFICE.mapsEmbedUrl,
        officeAddress: CLASS_MODELS_OFFICE.fullAddress,
        distanceLabel: '',
        staticMapImageUrl: '',
      };
    }
  }

  private staticMapImageUrl(from: LatLon, to: LatLon): string {
    const centerLat = ((from.lat + to.lat) / 2).toFixed(5);
    const centerLon = ((from.lon + to.lon) / 2).toFixed(5);
    const params = new URLSearchParams({
      center: `${centerLat},${centerLon}`,
      zoom: '11',
      size: '560x280',
      markers: `${from.lat},${from.lon},lightblue1|${to.lat},${to.lon},red`,
    });
    return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
  }

  private officeCoordinates(): LatLon {
    return { lat: CLASS_MODELS_OFFICE.lat, lon: CLASS_MODELS_OFFICE.lon };
  }

  private async geocode(query: string): Promise<LatLon | null> {
    const q = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=be`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ClassModelsAgenda/1.0 (class-models.be)' },
      signal: AbortSignal.timeout(this.geocodeMs),
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

  private async drivingRoute(
    from: LatLon,
    to: LatLon,
  ): Promise<{ distanceM: number; durationS: number } | null> {
    const path = `${from.lon},${from.lat};${to.lon},${to.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(this.routeMs) });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      routes?: Array<{ distance?: number; duration?: number }>;
    };
    const route = json.routes?.[0];
    if (!route || route.distance == null || route.duration == null) return null;
    return { distanceM: route.distance, durationS: route.duration };
  }
}
