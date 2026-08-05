'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { parseKlantenTab, type KlantenTabId } from '@/components/nieuw/KlantenPortalClient';

const BG = '#08080b';
const CARD = '#1b1a1a';
const LINE = 'rgba(214, 202, 182, 0.14)';
const TEXT = '#f3eee6';
const BAR = '#0e0d0d';
const BAR_TEXT = '#f3ead8';
const CTA_BG = '#d4af6a';
const CTA_TEXT = '#14110a';

const KLANTEN_TABS: { id: KlantenTabId; label: string; href: string }[] = [
  { id: 'waar-staat', label: 'Waar staat Class-Models voor?', href: '/klanten' },
  { id: 'wat-bieden', label: 'Wat bieden we aan', href: '/klanten?tab=wat-bieden' },
  { id: 'modellen-boeken', label: 'Modellen boeken / tarieven', href: '/klanten?tab=modellen-boeken' },
  { id: 'event', label: 'Een event organiseren?', href: '/klanten?tab=event' },
  { id: 'modellen', label: 'Modellen', href: '/klanten?tab=modellen' },
  { id: 'gekozen', label: 'Gekozen', href: '/klanten?tab=gekozen' },
  { id: 'aanvraag', label: 'Casting aanvragen', href: '/klanten?tab=aanvraag' },
  { id: 'aanvragen', label: 'Mijn aanvragen', href: '/klanten?tab=aanvragen' },
];

export function MobileClientAppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = pathname?.startsWith('/klanten/registreren')
    ? null
    : parseKlantenTab(searchParams.get('tab'));
  const [open, setOpen] = useState(false);

  const title =
    pathname?.startsWith('/klanten/registreren')
      ? 'Account aanmaken'
      : KLANTEN_TABS.find((t) => t.id === tab)?.label ?? 'Klantenportaal';

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden" style={{ background: BG, color: TEXT }}>
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
            <p className="notranslate m-0 truncate text-sm font-bold uppercase leading-tight tracking-wide">
              Klantenportaal
            </p>
            <p className="m-0 truncate text-[11px] leading-tight" style={{ color: 'rgba(243,234,216,0.75)' }}>
              {title}
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
        aria-label="Klantenportaal menu"
        className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[320px] flex-col shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: BAR, borderRight: '1px solid rgba(243,234,216,0.15)' }}
      >
        <div className="cm-appbar-safe shrink-0" style={{ borderBottom: '1px solid rgba(243,234,216,0.15)' }}>
          <div className="flex h-12 items-center justify-between gap-2 pl-4 pr-1">
            <p className="notranslate m-0 truncate text-sm font-bold uppercase tracking-wide" style={{ color: BAR_TEXT }}>
              Menu
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
          {KLANTEN_TABS.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className="flex items-center justify-between gap-2 px-4 py-3 text-[14px] font-medium"
              style={{
                color: t.id === tab ? BAR_TEXT : '#e8e0cf',
                borderBottom: '1px solid rgba(243,234,216,0.1)',
                background: t.id === tab ? 'rgba(243,234,216,0.12)' : undefined,
              }}
            >
              <span>{t.label}</span>
              <span aria-hidden style={{ color: 'rgba(243,234,216,0.5)' }}>
                ›
              </span>
            </Link>
          ))}
          {!user ? (
            <Link
              href="/?m=client"
              className="flex items-center justify-between gap-2 px-4 py-3 text-[14px] font-medium"
              style={{ color: '#e8e0cf', borderBottom: '1px solid rgba(243,234,216,0.1)' }}
            >
              <span>Inloggen / account</span>
              <span aria-hidden style={{ color: 'rgba(243,234,216,0.5)' }}>
                ›
              </span>
            </Link>
          ) : null}
          <Link
            href="/?m=guest"
            className="flex items-center justify-between gap-2 px-4 py-3 text-[14px] font-semibold"
            style={{
              color: BAR_TEXT,
              borderBottom: '1px solid rgba(243,234,216,0.1)',
              background: 'rgba(243,234,216,0.08)',
            }}
          >
            <span>Gastenportaal</span>
            <span aria-hidden>›</span>
          </Link>
          <Link
            href={user ? '/modellen' : '/?m=model'}
            className="flex items-center justify-between gap-2 px-4 py-3 text-[14px] font-semibold"
            style={{
              color: BAR_TEXT,
              borderBottom: '1px solid rgba(243,234,216,0.1)',
              background: 'rgba(243,234,216,0.08)',
            }}
          >
            <span>Modellenportaal</span>
            <span aria-hidden>›</span>
          </Link>
        </nav>
      </aside>

      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-3 pb-10 pt-2">
        <div
          className="sticky z-30 -mx-3 mb-3 flex items-center justify-between gap-2.5 px-3 py-2.5"
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
              else router.push('/');
            }}
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
            style={{ color: TEXT, border: `1px solid ${LINE}`, background: CARD }}
          >
            ← Terug
          </button>
          <Link
            href="/"
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
