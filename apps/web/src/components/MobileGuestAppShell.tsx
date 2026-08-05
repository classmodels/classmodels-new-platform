'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';

const BG = '#0e0d0d';
const CARD = '#1b1a1a';
const LINE = 'rgba(214, 202, 182, 0.12)';
const TEXT = '#ece6da';
const BAR = '#0e0d0d';
const BAR_TEXT = '#f3ead8';
const CTA_BG = '#d4af6a';
const CTA_TEXT = '#14110a';

const GUEST_MENU_LINKS = [
  { label: 'Gastenportaal (home)', href: '/?m=guest' },
  { label: 'Model worden', href: '/?m=guest&info=model-worden' },
  { label: 'Gratis testshoot', href: '/?m=guest&info=gratis-fotoshoot' },
  { label: 'Testshoot-foto’s', href: '/gasten/testshoot' },
  { label: 'Casting', href: '/?m=guest&info=casting' },
  { label: 'Intake gesprek', href: '/?m=guest&info=intake' },
  { label: 'Doelgroepen', href: '/?m=guest&info=doelgroepen' },
  { label: 'Veelgestelde vragen', href: '/?m=guest&info=faq' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Contact', href: '/?m=guest&info=contact' },
] as const;

export function MobileGuestAppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: BG, color: TEXT }}>
      <header
        className="cm-appbar-safe sticky top-0 z-40 shadow-md"
        style={{ background: BAR, color: BAR_TEXT }}
      >
        <div className="flex h-12 items-center gap-2 px-2">
          <button
            type="button"
            aria-label="Menu openen"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <span className="flex flex-col gap-[5px]">
              <span className="block h-[2px] w-5" style={{ background: BAR_TEXT }} />
              <span className="block h-[2px] w-5" style={{ background: BAR_TEXT }} />
              <span className="block h-[2px] w-5" style={{ background: BAR_TEXT }} />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="notranslate m-0 truncate text-sm font-bold uppercase leading-tight tracking-wide">{title}</p>
            <p className="m-0 truncate text-[11px] leading-tight" style={{ color: 'rgba(243,234,216,0.75)' }}>
              {subtitle}
            </p>
          </div>
          {user ? (
            <button
              type="button"
              onClick={() => logout()}
              className="shrink-0 rounded-full px-3 py-1 text-[12px]"
              style={{ color: BAR_TEXT, border: '1px solid rgba(243,234,216,0.4)' }}
            >
              Uitloggen
            </button>
          ) : null}
        </div>
      </header>

      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Gastenportaal menu"
        className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[320px] flex-col shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: BAR, borderRight: '1px solid rgba(243,234,216,0.15)' }}
      >
        <div className="cm-appbar-safe shrink-0" style={{ borderBottom: '1px solid rgba(243,234,216,0.15)' }}>
          <div className="flex h-12 items-center justify-between gap-2 pl-4 pr-1">
            <p className="notranslate m-0 truncate text-sm font-bold uppercase tracking-wide" style={{ color: BAR_TEXT }}>
              Gastenportaal
            </p>
            <button
              type="button"
              aria-label="Menu sluiten"
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl leading-none"
              style={{ color: BAR_TEXT }}
            >
              ×
            </button>
          </div>
        </div>
        <nav className="cm-safe-bottom min-h-0 flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
          {GUEST_MENU_LINKS.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="flex items-center justify-between gap-2 px-4 py-3 text-[14.5px] font-medium"
              style={{ color: '#e8e0cf', borderBottom: '1px solid rgba(243,234,216,0.1)' }}
            >
              <span>{m.label}</span>
              <span aria-hidden style={{ color: 'rgba(243,234,216,0.5)' }}>
                ›
              </span>
            </Link>
          ))}
          <Link
            href={user ? '/modellen' : '/?m=model'}
            className="flex items-center justify-between gap-2 px-4 py-3 text-[14.5px] font-semibold"
            style={{
              color: BAR_TEXT,
              borderBottom: '1px solid rgba(243,234,216,0.1)',
              background: 'rgba(243,234,216,0.08)',
            }}
          >
            <span>Modellenportaal</span>
            <span aria-hidden style={{ color: 'rgba(243,234,216,0.5)' }}>
              ›
            </span>
          </Link>
          <Link
            href={user ? '/klanten' : '/?m=client'}
            className="flex items-center justify-between gap-2 px-4 py-3 text-[14.5px] font-semibold"
            style={{
              color: BAR_TEXT,
              borderBottom: '1px solid rgba(243,234,216,0.1)',
              background: 'rgba(243,234,216,0.08)',
            }}
          >
            <span>Klantenportaal</span>
            <span aria-hidden style={{ color: 'rgba(243,234,216,0.5)' }}>
              ›
            </span>
          </Link>
        </nav>
      </aside>

      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10">
        <div
          className="sticky z-30 -mx-4 flex items-center justify-between gap-2.5 px-4 py-2.5"
          style={{
            top: 'calc(48px + env(safe-area-inset-top, 0px))',
            background: BG,
            borderBottom: `1px solid ${LINE}`,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) router.back();
              else router.push('/?m=guest');
            }}
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
            style={{ color: TEXT, border: `1px solid ${LINE}`, background: CARD }}
          >
            ← Terug
          </button>
          <Link
            href="/?m=guest"
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
            style={{ color: CTA_TEXT, background: CTA_BG, border: `1px solid ${CTA_BG}` }}
          >
            Beginpagina
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
