export default function AdminPortalenPage() {
  return (
    <div className="max-w-2xl space-y-4 text-sm">
      <h1 className="text-xl font-semibold text-ink">Portalen</h1>
      <ul className="list-inside list-disc space-y-2 text-muted">
        <li>
          <strong className="text-ink">Gast</strong> —{' '}
          <code className="text-xs">/portal/guest</code> en home; menu&apos;s met portal{' '}
          <code className="text-xs">guest</code>.
        </li>
        <li>
          <strong className="text-ink">Model</strong> — <code className="text-xs">/portal/model</code>, eigen
          menu&apos;s en content-sleutels <code className="text-xs">portal.model.*</code>.
        </li>
        <li>
          <strong className="text-ink">Klant</strong> — <code className="text-xs">/portal/client</code>, idem met{' '}
          <code className="text-xs">portal.client.*</code>.
        </li>
        <li>
          <strong className="text-ink">Administrator</strong> — backoffice en (optioneel) content bewerken. Toegang
          tot schermen volgt <strong className="text-ink">permissies</strong> (ster <code className="text-xs">*</code>{' '}
          of lijst zoals <code className="text-xs">admin.users.read</code>).
        </li>
      </ul>
    </div>
  );
}
