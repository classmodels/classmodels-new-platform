/** Kantoor Class-Models — gebruikt voor route/afstand en mail-placeholders. */
export const CLASS_MODELS_OFFICE = {
  label: 'Class-Models',
  street: 'Provinciebaan 3',
  postalCode: '2235',
  city: 'Hulshout',
  country: 'België',
  fullAddress: 'Provinciebaan 3, 2235 Hulshout, België',
  mapsEmbedUrl:
    'https://maps.google.com/maps?q=Provinciebaan+3,+2235+Hulshout,+Belgi%C3%AB&hl=nl&z=16&output=embed',
  mapsPlaceUrl:
    'https://www.google.com/maps/search/?api=1&query=Provinciebaan+3,+2235+Hulshout,+Belgium',
} as const;

export function formatGuestAddressFromFields(fields: Record<string, string>): string {
  const straat = (fields.straat ?? '').trim();
  const nr = (fields.nr ?? '').trim();
  const postcode = (fields.postcode ?? '').trim();
  const gemeente = (fields.gemeente ?? '').trim();
  const line1 = [straat, nr].filter(Boolean).join(' ');
  const line2 = [postcode, gemeente].filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join(', ');
}

export function googleMapsDirectionsUrl(originAddress: string): string {
  const origin = encodeURIComponent(originAddress);
  const dest = encodeURIComponent(CLASS_MODELS_OFFICE.fullAddress);
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
}
