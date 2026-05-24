/** Relatief pad voor agenda-uploads (statisch via `/uploads/` in main.ts). */
export function agendaUploadRelativeUrl(filename: string): string {
  const base = filename.replace(/^\/+/, '').replace(/^uploads\/agenda\//, '');
  return `/uploads/agenda/${base}`;
}
