/** Vaste catalogus voor rollen-UI en validatie (NL-labels). */
export const PERMISSION_CATALOG: {
  id: string;
  label: string;
  items: { id: string; label: string }[];
}[] = [
  {
    id: 'admin',
    label: 'Backoffice',
    items: [
      { id: 'admin.users.read', label: 'Gebruikers bekijken' },
      { id: 'admin.users.write', label: 'Gebruikers bewerken / aanmaken' },
      { id: 'admin.roles.read', label: 'Rollen bekijken' },
      { id: 'admin.roles.write', label: 'Rollen en permissies wijzigen' },
      { id: 'admin.menus.read', label: "Menu's bekijken" },
      { id: 'admin.menus.write', label: "Menu's beheren" },
      { id: 'admin.reviews.read', label: 'Reviews bekijken' },
      { id: 'admin.reviews.write', label: 'Reviews beheren' },
      { id: 'admin.media.read', label: 'Media (admin) bekijken' },
      { id: 'admin.media.write', label: 'Media uploaden / verwijderen' },
      { id: 'admin.billing.read', label: 'Mollie / prijzen bekijken' },
      { id: 'admin.billing.write', label: 'Mollie-keys en prijs wijzigen' },
      { id: 'admin.audit.read', label: 'Auditlog bekijken' },
      { id: 'admin.subscriptions.read', label: 'Abonnementen bekijken' },
      { id: 'admin.snippets.read', label: 'Snippets bekijken' },
      { id: 'admin.briefs.read', label: 'Casting-aanvragen bekijken' },
      { id: 'admin.briefs.write', label: 'Casting-aanvragen beheren' },
      { id: 'admin.testshoot.read', label: 'Testshoot bekijken' },
      { id: 'admin.testshoot.write', label: 'Testshoot beheren (foto’s, modellen, feedback)' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [{ id: 'content.strings.write', label: 'CMS-teksten wijzigen' }],
  },
  {
    id: 'portal',
    label: 'Portaal (gebruikers)',
    items: [
      { id: 'portal.client.briefs.read', label: 'Eigen aanvragen bekijken' },
      { id: 'portal.client.briefs.write', label: 'Aanvragen indienen' },
      { id: 'portal.model.briefs.read', label: 'Open aanvragen bekijken' },
      { id: 'portal.model.briefs.respond', label: 'Interesse tonen bij aanvraag' },
      { id: 'portal.model.media.read', label: 'Eigen media bekijken' },
      { id: 'portal.model.media.upload', label: 'Eigen media uploaden' },
      { id: 'portal.model.agenda.read', label: 'Eigen opleidingsafspraak bekijken' },
      { id: 'portal.model.agenda.book', label: 'Opleidingsafspraak boeken of wijzigen' },
    ],
  },
  {
    id: 'payments',
    label: 'Betalingen',
    items: [{ id: 'payments.checkout', label: 'Premium afrekenen (Mollie)' }],
  },
];

export const ALL_KNOWN_PERMISSION_IDS: string[] = PERMISSION_CATALOG.flatMap((g) =>
  g.items.map((i) => i.id),
);
