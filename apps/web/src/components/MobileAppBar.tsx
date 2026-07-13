'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';

type Tone = 'burgundy' | 'dark';

/**
 * Onderste deel van hetzelfde menu: de drie portalen in dezelfde grijze stijl,
 * met daaronder "Uitloggen" in het rood. Geen aparte sectie of titel.
 */
function DrawerPortalRows({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  /** De drie portalen: rode achtergrond, witte tekst. */
  const portalRowClass =
    'flex w-full items-center justify-between gap-2 border-t border-white/20 bg-burgundy py-3.5 pl-3 pr-3 text-left text-[13.5px] font-semibold text-white hover:bg-burgundyDeep';
  const logoutRowClass =
    'flex w-full items-center justify-between gap-2 border-t border-white/[0.14] py-3.5 pl-3 pr-3 text-left text-[13.5px] font-semibold text-red-400 hover:bg-white/[0.07]';

  return (
    <div>
      <Link href="/?m=guest" className={portalRowClass}>
        <span>Gastenportaal</span>
        <span className="text-white/70" aria-hidden>
          ›
        </span>
      </Link>
      <Link href={user ? '/portal/model' : '/?m=model'} className={portalRowClass}>
        <span>Modellenportaal</span>
        <span className="text-white/70" aria-hidden>
          ›
        </span>
      </Link>
      {/* Klantenportaal is nog niet actief — zichtbaar maar niet aanklikbaar. */}
      <div aria-disabled="true" className={`${portalRowClass} cursor-default opacity-60 hover:bg-burgundy`}>
        <span>Klantenportaal (binnenkort)</span>
      </div>
      {user ? (
        <button
          type="button"
          className={logoutRowClass}
          onClick={() => {
            onNavigate();
            logout();
            router.push('/');
            router.refresh();
          }}
        >
          <span>Uitloggen</span>
        </button>
      ) : (
        <Link href="/?m=model" className={logoutRowClass}>
          <span>Inloggen</span>
        </Link>
      )}
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
 * Mobiele app-balk (alleen zichtbaar onder lg): vaste gekleurde balk bovenaan
 * (scrolt niet mee) met hamburger die een menu van links laat openklappen.
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
  const drawerBg = tone === 'dark' ? 'bg-[#1e2329] text-zinc-200' : 'cm-drawer-dark bg-[#1c1c20] text-[#d4d4d8]';
  const drawerHead = tone === 'dark' ? 'bg-[#171b20] text-white' : 'bg-burgundy text-white';

  return (
    <div className="lg:hidden">
      {/* Vaste app-balk bovenaan — scrolt niet mee */}
      <header className={`cm-appbar-safe fixed inset-x-0 top-0 z-40 ${barBg} text-white shadow-md`}>
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
      {/* Spacer: houdt de inhoud onder de vaste balk (zelfde hoogte + notch). */}
      <div aria-hidden className="cm-appbar-safe">
        <div className="h-12" />
      </div>

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
          className="cm-safe-bottom min-h-0 flex-1 overflow-y-auto"
          onClick={(e) => {
            // Sluit het menu zodra er op een link of knop in het menu wordt geklikt,
            // behalve bij open/dichtklap-knoppen van submenu's (aria-expanded).
            const el = (e.target as HTMLElement).closest('a, button');
            if (el && !el.hasAttribute('aria-expanded')) close();
          }}
        >
          {menuContent}
          <DrawerPortalRows onNavigate={close} />
        </div>
      </aside>
    </div>
  );
}
