'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';

type Tone = 'burgundy' | 'dark';

/** Donkerrood portaalblok onderaan het uitklapmenu: portalen wisselen + inloggen. */
function DrawerFooterLinks({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const linkClass = 'block py-2.5 text-[13.5px] font-semibold text-white hover:text-white/80';

  return (
    <div className="bg-[#53080f] px-4 pb-4 pt-3">
      <p className="notranslate border-b border-white/20 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
        Portaal menu
      </p>
      <div className="divide-y divide-white/10">
        <Link href="/portal/guest" className={linkClass}>
          Gastenportaal
        </Link>
        <Link href={user ? '/portal/model' : '/'} className={linkClass}>
          Modellenportaal
        </Link>
        <Link href="/portal/client" className={linkClass}>
          Klantenportaal
        </Link>
        <Link href="/reviews" className={linkClass}>
          Reviews
        </Link>
        <Link href="/portal/guest?p=contact" className={linkClass}>
          Contact
        </Link>
        {user ? (
          <button
            type="button"
            className={`${linkClass} w-full text-left`}
            onClick={() => {
              onNavigate();
              logout();
              router.push('/');
              router.refresh();
            }}
          >
            Uitloggen
          </button>
        ) : (
          <Link href="/" className={linkClass}>
            Inloggen
          </Link>
        )}
      </div>
    </div>
  );
}

/** Uitlogknop rechtsboven in de app-balk (alleen voor ingelogde gebruikers). */
function AppBarLogout() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;
  return (
    <button
      type="button"
      onClick={() => {
        logout();
        router.push('/');
        router.refresh();
      }}
      className="flex h-9 items-center gap-1.5 border border-white/40 px-2.5 text-[11px] font-semibold text-white hover:bg-white/10"
      aria-label="Uitloggen"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Uitloggen
    </button>
  );
}

type Props = {
  /** Portaalnaam in de balk, bv. "Gastenportaal". */
  title: string;
  /** Optionele tweede regel (huidige sectie), klein onder de titel. */
  subtitle?: string;
  /** Titel bovenaan het uitklapmenu (standaard = title). */
  menuTitle?: string;
  /** Inhoud van het uitklapmenu (navigatie). Een klik op een link/knop sluit het menu. */
  menuContent: React.ReactNode;
  /** Optioneel extra element rechts in de balk (vóór de uitlogknop). */
  rightSlot?: React.ReactNode;
  tone?: Tone;
};

/**
 * Mobiele app-balk (alleen zichtbaar onder lg): compacte gekleurde balk met
 * hamburger die een menu van links laat openklappen, zoals in een native app.
 */
export function MobileAppBar({
  title,
  subtitle,
  menuTitle,
  menuContent,
  rightSlot,
  tone = 'burgundy',
}: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const barBg = tone === 'dark' ? 'bg-[#1e2329]' : 'bg-burgundy';
  /** Drawer altijd donkergrijs (app-stijl); admin-nav heeft eigen donkere kleuren. */
  const drawerBg = tone === 'dark' ? 'bg-[#1e2329] text-zinc-200' : 'cm-drawer-dark bg-[#26262b] text-zinc-300';
  const drawerHead = tone === 'dark' ? 'bg-[#171b20] text-white' : 'bg-burgundy text-white';

  return (
    <div className="lg:hidden">
      {/* Vaste app-balk bovenaan */}
      <header className={`cm-appbar-safe sticky top-0 z-40 ${barBg} text-white shadow-md`}>
        <div className="flex h-12 items-center gap-2 px-2">
          <button
            type="button"
            aria-label="Menu openen"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <span className="flex flex-col gap-[5px]">
              <span className="block h-[2px] w-5 bg-white" />
              <span className="block h-[2px] w-5 bg-white" />
              <span className="block h-[2px] w-5 bg-white" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="notranslate truncate text-sm font-bold uppercase tracking-wide leading-tight">
              {title}
            </p>
            {subtitle ? (
              <p className="truncate text-[11px] leading-tight text-white/80">{subtitle}</p>
            ) : null}
          </div>
          {rightSlot ? <div className="flex shrink-0 items-center">{rightSlot}</div> : null}
          <div className="flex shrink-0 items-center pr-1">
            <AppBarLogout />
          </div>
        </div>
      </header>

      {/* Overlay */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Uitklapmenu links */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${menuTitle ?? title} menu`}
        className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[320px] flex-col ${drawerBg} shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`cm-appbar-safe shrink-0 ${drawerHead}`}>
          <div className="flex h-12 items-center justify-between gap-2 pl-4 pr-1">
            <p className="notranslate truncate text-sm font-bold uppercase tracking-wide">
              {menuTitle ?? title}
            </p>
            <button
              type="button"
              aria-label="Menu sluiten"
              onClick={close}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
        <div
          className="cm-safe-bottom flex min-h-0 flex-1 flex-col overflow-y-auto"
          onClick={(e) => {
            // Sluit het menu zodra er op een link of knop in het menu wordt geklikt,
            // behalve bij open/dichtklap-knoppen van submenu's (aria-expanded).
            const el = (e.target as HTMLElement).closest('a, button');
            if (el && !el.hasAttribute('aria-expanded')) close();
          }}
        >
          <div className="min-h-0">{menuContent}</div>
          <div className="mt-auto">
            <DrawerFooterLinks onNavigate={close} />
          </div>
        </div>
      </aside>
    </div>
  );
}
