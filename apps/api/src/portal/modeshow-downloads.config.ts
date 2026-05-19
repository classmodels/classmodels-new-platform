/** Modellenportaal: downloads modeshow 28 maart (configureerbaar via env). */
export function modeshowDownloadsAvailableFrom(): Date {
  const raw =
    process.env.MODEL_MODESHOW_DOWNLOAD_FROM?.trim() || '2026-05-20T00:00:00+02:00';
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : new Date('2026-05-20T00:00:00+02:00');
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

export function assertModeshowDownloadsAvailable(now = new Date()): void {
  if (now < modeshowDownloadsAvailableFrom()) {
    const from = modeshowDownloadsAvailableFrom().toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    throw new Error(`MODESHOW_NOT_YET:${from}`);
  }
}
