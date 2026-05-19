/** Modellenportaal: downloads try-out modeshow (configureerbaar via env). */

export function modeshowFilmAvailableFrom(): Date {
  const raw =
    process.env.MODEL_MODESHOW_FILM_FROM?.trim() || '2026-05-21T00:00:00+02:00';
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : new Date('2026-05-21T00:00:00+02:00');
}

export function modeshowPhotosFolderSlug(): string {
  const raw = process.env.MODEL_MODESHOW_PHOTOS_FOLDER?.trim();
  return raw || 'fotomodeshow-klein';
}

/** Optioneel: vaste bestandsnaam voor de film; anders nieuwste video in de map. */
export function modeshowFilmOriginalName(): string | null {
  const raw = process.env.MODEL_MODESHOW_FILM_NAME?.trim();
  return raw || null;
}

export function formatModeshowNlDate(d: Date): string {
  return d.toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function assertModeshowFilmAvailable(now = new Date()): void {
  const from = modeshowFilmAvailableFrom();
  if (now < from) {
    throw new Error(`MODESHOW_FILM_NOT_YET:${formatModeshowNlDate(from)}`);
  }
}
