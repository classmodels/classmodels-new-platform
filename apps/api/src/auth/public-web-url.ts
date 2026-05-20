/** Publieke URL van de Next-site (reset-links, agenda-mail, …). */
export function resolvePublicWebUrl(): string {
  const base = (
    process.env.WEB_PUBLIC_URL ||
    process.env.WEB_APP_URL ||
    process.env.APP_PUBLIC_URL ||
    'https://www.class-models.be'
  ).replace(/\/$/, '');
  const path = (process.env.APP_PUBLIC_BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || '')
    .trim()
    .replace(/\/$/, '');
  if (path && !path.startsWith('/')) return `${base}/${path}`;
  return `${base}${path}`;
}

export function resetPasswordPageUrl(rawToken: string): string {
  const root = resolvePublicWebUrl();
  const token = encodeURIComponent(rawToken);
  return `${root}/reset-password/${token}`;
}
