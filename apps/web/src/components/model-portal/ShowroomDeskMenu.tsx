'use client';

import type { MouseEvent } from 'react';
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
const BACK_QUAD = layout.deskBack as Quad;
const MENU_SRC = quadSourceSize(MENU_QUAD);
const BACK_SRC = quadSourceSize(BACK_QUAD);
const MENU_W = Math.round(MENU_SRC.w * SS);
const MENU_H = Math.round(MENU_SRC.h * SS);
const BACK_W = Math.round(BACK_SRC.w * SS);
const BACK_H = Math.round(BACK_SRC.h * SS);

type MenuItem = { id: string; label: string; href: string };

/**
 * Keycap-3D: harde offset-schaduw als zichtbare zijkant van de knop, met een
 * lichtvang bovenop. Bij hover drukt de knop in (translateY + kortere zijkant).
 */
const KEY_SIDE = 9;
const BTN_SHADOW = [
  `0 ${KEY_SIDE}px 0 #0a0705`,
  `0 ${KEY_SIDE + 1}px 0 1px rgba(0,0,0,0.7)`,
  `0 ${KEY_SIDE + 9}px 16px rgba(0,0,0,0.65)`,
  'inset 0 3px 3px rgba(255,255,255,0.22)',
  'inset 0 -4px 8px rgba(0,0,0,0.42)',
].join(', ');
const BTN_SHADOW_PRESSED = [
  '0 3px 0 #0a0705',
  '0 4px 0 1px rgba(0,0,0,0.7)',
  '0 8px 12px rgba(0,0,0,0.55)',
  '0 0 30px rgba(240,204,140,0.4)',
  'inset 0 3px 3px rgba(255,255,255,0.2)',
  'inset 0 -4px 8px rgba(0,0,0,0.4)',
].join(', ');
const BTN_BG = 'linear-gradient(180deg, #52463a 0%, #322a22 48%, #1d1712 100%)';
const BTN_BG_ACTIVE = 'linear-gradient(180deg, #6b5433 0%, #45371f 48%, #291d10 100%)';

function press(e: MouseEvent<HTMLButtonElement>, gold: boolean) {
  e.currentTarget.style.transform = `translateY(${KEY_SIDE - 3}px)`;
  e.currentTarget.style.boxShadow = BTN_SHADOW_PRESSED;
  if (gold) e.currentTarget.style.border = '2px solid rgba(240,204,140,0.9)';
}

function release(e: MouseEvent<HTMLButtonElement>, border: string) {
  e.currentTarget.style.transform = 'translateY(0)';
  e.currentTarget.style.boxShadow = BTN_SHADOW;
  e.currentTarget.style.border = border;
}

/**
 * Menubord op de kiosk: compacte kop ("Welkom" + voornaam van het ingelogde
 * model), 3D-knoppen die doorlopen tot net boven de onderste lichtlijn, en
 * een back-knop op de voet van de kiosk.
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
      {/* Menubord binnen de LED-rand */}
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
          background: 'linear-gradient(165deg, #141110 0%, #0c0a09 60%, #131010 100%)',
          borderRadius: 20,
          boxShadow: 'inset 0 0 70px rgba(0,0,0,0.9)',
          padding: '30px 36px 20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Compacte kop: Welkom op één regel, voornaam op één regel */}
        <div className="shrink-0 text-center">
          <p
            className="m-0 whitespace-nowrap font-serif"
            style={{
              fontSize: 52,
              lineHeight: 1.08,
              color: '#e9c780',
              textShadow: '0 0 24px rgba(233,199,128,0.35)',
            }}
          >
            Welkom
          </p>
          {firstName ? (
            <p
              className="m-0 mt-1 whitespace-nowrap font-serif"
              style={{ fontSize: 32, lineHeight: 1.15, color: '#f3e2c0' }}
            >
              {firstName}
            </p>
          ) : null}
        </div>

        <p
          className="m-0 mt-5 shrink-0 text-center font-sans"
          style={{ fontSize: 24, color: 'rgba(255,255,255,0.94)' }}
        >
          Kies een onderwerp:
        </p>

        {/* Scrollbaar knoppenrooster — loopt door tot net boven de onderste lichtlijn */}
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-2 pt-1" style={{ columnGap: 34, rowGap: 32 }}>
            {items.map((item) => {
              const active =
                (currentPage === 'fiche' && item.id === 'fiche') ||
                (currentPage === 'modellen' && item.id === 'alle-modellen');
              const border = active
                ? '2px solid rgba(240,204,140,0.9)'
                : '2px solid rgba(255,255,255,0.2)';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className="cursor-pointer rounded-2xl px-3 text-center outline-none transition-all duration-150"
                  style={{
                    minHeight: 118,
                    background: active ? BTN_BG_ACTIVE : BTN_BG,
                    border,
                    borderTopColor: 'rgba(255,255,255,0.32)',
                    boxShadow: BTN_SHADOW,
                  }}
                  onMouseEnter={(e) => press(e, true)}
                  onMouseLeave={(e) => release(e, border)}
                >
                  <span
                    className="font-sans"
                    style={{
                      fontSize: 27,
                      lineHeight: 1.22,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.97)',
                      textShadow: '0 2px 4px rgba(0,0,0,0.7)',
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

      {/* Back-knop op de voet van de kiosk, onder de onderste lichtlijn */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: BACK_W,
          height: BACK_H,
          transform: quadMatrix3d(BACK_W, BACK_H, BACK_QUAD),
          transformOrigin: '0 0',
          pointerEvents: 'auto',
          padding: `0 0 ${KEY_SIDE + 4}px`,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="h-full w-full cursor-pointer rounded-2xl text-center outline-none transition-all duration-150"
          style={{
            background: 'linear-gradient(180deg, #55462f 0%, #372b1b 48%, #1e1509 100%)',
            border: '2px solid rgba(214,178,124,0.65)',
            borderTopColor: 'rgba(255,232,190,0.5)',
            boxShadow: BTN_SHADOW,
          }}
          onMouseEnter={(e) => press(e, true)}
          onMouseLeave={(e) => release(e, '2px solid rgba(214,178,124,0.65)')}
        >
          <span
            className="font-sans"
            style={{
              fontSize: 34,
              letterSpacing: '0.08em',
              fontWeight: 500,
              color: 'rgba(255,244,222,0.97)',
              textShadow: '0 2px 4px rgba(0,0,0,0.7)',
            }}
          >
            ← Back
          </span>
        </button>
      </div>
    </div>
  );
}
