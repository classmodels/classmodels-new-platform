'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useContent } from '@/context/content-context';
import { readContentEditableValue } from '@/lib/cm-text-persist';

export function AdminBar() {
  const { user, hasBackofficeAccess, can, token } = useAuth();
  const { editMode, setEditMode, patchKeyImmediate } = useContent();
  const pathname = usePathname();
  const router = useRouter();

  const show =
    !!user && (hasBackofficeAccess || can('content.strings.write'));
  if (!show) return null;

  const leaveAdmin = () => {
    const prev = sessionStorage.getItem('cm_pre_admin_path') ?? '/';
    router.push(prev);
  };

  const onPortal = (p: string) => {
    if (p === 'guest') router.push('/portal/guest');
    if (p === 'model') router.push('/portal/model');
    if (p === 'client') router.push('/portal/client');
  };

  const flushAllInlineEdits = () => {
    if (!token || !can('content.strings.write')) return;
    document.querySelectorAll<HTMLElement>('[data-cm-text][contenteditable="true"]').forEach((el) => {
      const key = el.getAttribute('data-cm-text');
      if (!key) return;
      void patchKeyImmediate(key, readContentEditableValue(el));
    });
  };

  const toggleInlineEdit = () => {
    if (editMode) flushAllInlineEdits();
    const next = !editMode;
    setEditMode(next);
    if (!next) return;
    window.requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>('[contenteditable="true"]');
      if (first) first.focus();
    });
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex h-10 items-center gap-4 border-b border-white/10 bg-ink px-4 text-[13px] text-white shadow-sm">
      <span className="font-medium text-white/90">Admin</span>
      {can('content.strings.write') ? (
        <>
          <button
            type="button"
            className="rounded px-2 py-0.5 hover:bg-white/10"
            onClick={toggleInlineEdit}
            title="Klik op tekst op de pagina om die aan te passen"
          >
            {editMode ? 'Tekst bewerken (aan)' : 'Tekst bewerken'}
          </button>
          <Link
            href="/admin/content/portfolio"
            className="rounded px-2 py-0.5 text-white/90 hover:bg-white/10"
            title="Portfolio afspraak — alle teksten in één formulier"
          >
            Portfolio-teksten
          </Link>
        </>
      ) : null}
      {hasBackofficeAccess ? (
        <div className="flex items-center gap-1 text-white/80">
          <span className="text-white/50">Portaal</span>
          <select
            className="ml-1 max-w-[140px] rounded border border-white/20 bg-ink px-2 py-0.5 text-white"
            aria-label="Portaal wisselen"
            onChange={(e) => onPortal(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>
              Kies…
            </option>
            <option value="guest">Gast</option>
            <option value="model">Model</option>
            <option value="client">Klant</option>
          </select>
        </div>
      ) : null}
      {hasBackofficeAccess ? (
        pathname?.startsWith('/admin') ? (
          <button type="button" className="rounded px-2 py-0.5 hover:bg-white/10" onClick={leaveAdmin}>
            Backsite sluiten
          </button>
        ) : (
          <Link
            href="/admin/dashboard"
            prefetch={false}
            className="rounded px-2 py-0.5 hover:bg-white/10"
            onClick={() => sessionStorage.setItem('cm_pre_admin_path', pathname || '/')}
          >
            Backsite
          </Link>
        )
      ) : null}
    </div>
  );
}
