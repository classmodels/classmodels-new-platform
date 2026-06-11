'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';

type Tone = 'burgundy' | 'dark';

/** Vaste links onderaan het uitklapmenu: portalen wisselen + in-/uitloggen. */
function DrawerFooterLinks({ tone, onNavigate }: { tone: Tone; onNavigate: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const linkClass =
    tone === 'dark'
      ? 'block py-2 text-[13px] text-zinc-300 hover:text-white'
      : 'block py-2 text-[13px] text-ink hover:text-burgundy';

  return (
    <div
      className={`border-t px-4 py-3 ${
        tone === 'dark' ? 'border-white/10 bg-[#1e2329]' : 'border-line bg-panel'
      }`}
    >
      <p
        className={`pb-1 text-[10px] font-bold uppercase tracking-[0.15em] ${
          tone === 'dark' ? 'text-zinc-500' : 'text-muted'
        }`}
      >
        Class-Models
      </p>
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
          className={`${linkClass} w-full text-left font-semibold`}
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
        <Link href="/" className={`${linkClass} font-semibold`}>
          Inloggen
        </Link>
      )}
    </div>
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
  /** Optioneel element rechts in de balk (bv. badge of uitlogknop). */
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
  const drawerBg = tone === 'dark' ? 'bg-[#1e2329] text-white' : 'bg-white text-ink';
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
          {rightSlot ? <div className="flex shrink-0 items-center pr-1">{rightSlot}</div> : null}
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
          className="cm-safe-bottom min-h-0 flex-1 overflow-y-auto"
          onClick={(e) => {
            // Sluit het menu zodra er op een link of knop in het menu wordt geklikt,
            // behalve bij open/dichtklap-knoppen van submenu's (aria-expanded).
            const el = (e.target as HTMLElement).closest('a, button');
            if (el && !el.hasAttribute('aria-expanded')) close();
          }}
        >
          {menuContent}
          <DrawerFooterLinks tone={tone} onNavigate={close} />
        </div>
      </aside>
    </div>
  );
}
