'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { MODEL_PORTAL_TABS } from '@/components/model-portal/model-portal-nav';
import type { Quad } from '@/components/model-portal/model-gallery-3d/quadTransform';
import {
  quadMatrix3d,
  quadSourceSize,
} from '@/components/model-portal/model-gallery-3d/quadTransform';
import layout from '@/components/model-portal/showroom-room-layout.json';

/** 3x supersampling: groot renderen, door de homografie verkleinen → gestoken scherpe tekst. */
const SS = 3;

/** Hoeken exact op de binnenrand van de LED-lijnen gemeten (lijn-fit per rand). */
const MENU_QUAD = layout.deskMenu as Quad;
const MENU_SRC = quadSourceSize(MENU_QUAD);
const MENU_W = Math.round(MENU_SRC.w * SS);
const MENU_H = Math.round(MENU_SRC.h * SS);

type MenuItem = { id: string; label: string; href: string };

/** Vlakke knoppen zoals het referentiebeeld: egaal donkergrijs, geen randen of gradiënten. */
const BTN_BG = '#26231f';
const BTN_BG_HOVER = '#38332c';
const BTN_BG_ACTIVE = '#443a2a';

/**
 * Menubord op de kiosk, naar het referentiebeeld: gouden "Welkom" (met de
 * voornaam van het ingelogde model eronder), "Kies een onderwerp:" en vlakke,
 * rustige knoppen in twee kolommen; de laatste knop over de volle breedte.
 */
export function ShowroomDeskMenu({
  currentPage,
}: {
  /** 'fiche' markeert "Uw fiche", 'modellen' markeert "Alle modellen" als actief. */
  currentPage?: 'fiche' | 'modellen';
}) {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = (user?.firstName ?? '').trim();

  const items: MenuItem[] = [
    { id: 'fiche', label: 'Uw fiche', href: '/portal/model/showroom?demo=0' },
    { id: 'alle-modellen', label: 'Alle modellen', href: '/portal/model/modellenwand' },
    ...MODEL_PORTAL_TABS.filter((t) => t.id !== 'modellen').map((t) => ({
      id: t.id,
      label: t.label,
      href: `/portal/model?tab=${t.id}`,
    })),
  ];

  return (
    <div className="absolute inset-0 z-30" style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: MENU_W,
          height: MENU_H,
          transform: quadMatrix3d(MENU_W, MENU_H, MENU_QUAD),
          transformOrigin: '0 0',
          pointerEvents: 'auto',
          background: '#0d0c0b',
          borderRadius: 22,
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.75)',
          padding: '52px 44px 40px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Kop zoals het referentiebeeld: gouden serif, rustig gecentreerd */}
        <div className="shrink-0 text-center">
          <p
            className="m-0 whitespace-nowrap font-serif"
            style={{ fontSize: 60, lineHeight: 1.1, color: '#e9c780' }}
          >
            Welkom
          </p>
          {firstName ? (
            <p
              className="m-0 mt-2 whitespace-nowrap font-serif"
              style={{ fontSize: 38, lineHeight: 1.2, color: '#e9c780' }}
            >
              {firstName}
            </p>
          ) : null}
        </div>

        <p
          className="m-0 mt-12 shrink-0 text-center font-sans"
          style={{ fontSize: 30, color: 'rgba(255,255,255,0.95)' }}
        >
          Kies een onderwerp:
        </p>

        {/* Scrollbaar knoppenrooster; laatste knop over de volle breedte */}
        <div className="mt-9 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-2" style={{ columnGap: 26, rowGap: 26 }}>
            {items.map((item, idx) => {
              const active =
                (currentPage === 'fiche' && item.id === 'fiche') ||
                (currentPage === 'modellen' && item.id === 'alle-modellen');
              const fullWidth = idx === items.length - 1 && items.length % 2 === 1;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`cursor-pointer rounded-xl px-4 text-center outline-none transition-colors duration-150 ${
                    fullWidth ? 'col-span-2' : ''
                  }`}
                  style={{
                    minHeight: 118,
                    background: active ? BTN_BG_ACTIVE : BTN_BG,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = BTN_BG_HOVER;
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = BTN_BG;
                  }}
                >
                  <span
                    className="font-sans"
                    style={{
                      fontSize: 33,
                      lineHeight: 1.22,
                      fontWeight: 400,
                      color: active ? '#f0cc8c' : 'rgba(255,255,255,0.97)',
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
