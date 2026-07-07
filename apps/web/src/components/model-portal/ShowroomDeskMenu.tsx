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

const MENU_QUAD = layout.deskMenu as Quad;
const BACK_QUAD = layout.deskBack as Quad;
const MENU_SRC = quadSourceSize(MENU_QUAD);
const BACK_SRC = quadSourceSize(BACK_QUAD);
const MENU_W = Math.round(MENU_SRC.w * SS);
const MENU_H = Math.round(MENU_SRC.h * SS);
const BACK_W = Math.round(BACK_SRC.w * SS);
const BACK_H = Math.round(BACK_SRC.h * SS);

type MenuItem = { id: string; label: string; href: string };

/** 3D-reliëf voor de menuknoppen: licht bovenop, diepe schaduw eronder. */
const BTN_SHADOW = [
  '0 10px 16px rgba(0,0,0,0.55)',
  '0 3px 5px rgba(0,0,0,0.4)',
  'inset 0 2px 1px rgba(255,255,255,0.16)',
  'inset 0 -9px 14px rgba(0,0,0,0.5)',
].join(', ');
const BTN_SHADOW_HOVER = [
  '0 14px 22px rgba(0,0,0,0.6)',
  '0 0 26px rgba(240,204,140,0.35)',
  'inset 0 2px 1px rgba(255,255,255,0.18)',
  'inset 0 -9px 14px rgba(0,0,0,0.45)',
].join(', ');
const BTN_BG = 'linear-gradient(180deg, #3b332b 0%, #26201a 45%, #171310 100%)';
const BTN_BG_ACTIVE = 'linear-gradient(180deg, #57422a 0%, #3c2e1d 50%, #241a10 100%)';

/**
 * Menubord op de kiosk: "Welkom" met daaronder de naam van het ingelogde
 * model, knoppen in twee kolommen met 3D-reliëf, en een back-knop op de voet
 * van de kiosk (onder de onderste witte lichtlijn).
 */
export function ShowroomDeskMenu({
  currentPage,
}: {
  /** 'fiche' markeert "Uw fiche", 'modellen' markeert "Alle modellen" als actief. */
  currentPage?: 'fiche' | 'modellen';
}) {
  const router = useRouter();
  const { user } = useAuth();
  const modelName = [user?.firstName ?? '', user?.lastName ?? '']
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');

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
          borderRadius: 18,
          boxShadow: 'inset 0 0 66px rgba(0,0,0,0.9)',
          padding: '42px 34px 30px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="shrink-0 text-center">
          <p
            className="m-0 font-serif"
            style={{
              fontSize: 62,
              lineHeight: 1.12,
              color: '#e9c780',
              textShadow: '0 0 26px rgba(233,199,128,0.35)',
            }}
          >
            Welkom
          </p>
          {modelName ? (
            <p
              className="m-0 mt-2 font-serif"
              style={{ fontSize: 33, lineHeight: 1.25, color: '#f3e2c0' }}
            >
              {modelName}
            </p>
          ) : null}
        </div>

        <p
          className="m-0 mt-9 shrink-0 text-center font-sans"
          style={{ fontSize: 26, color: 'rgba(255,255,255,0.94)' }}
        >
          Kies een onderwerp:
        </p>

        {/* Scrollbaar knoppenrooster in twee kolommen */}
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-2" style={{ columnGap: 30, rowGap: 26 }}>
            {items.map((item) => {
              const active =
                (currentPage === 'fiche' && item.id === 'fiche') ||
                (currentPage === 'modellen' && item.id === 'alle-modellen');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className="cursor-pointer rounded-2xl px-3 text-center outline-none transition-all duration-200"
                  style={{
                    minHeight: 104,
                    background: active ? BTN_BG_ACTIVE : BTN_BG,
                    border: active
                      ? '2.5px solid rgba(240,204,140,0.9)'
                      : '2px solid rgba(255,255,255,0.16)',
                    boxShadow: active
                      ? BTN_SHADOW_HOVER
                      : BTN_SHADOW,
                  }}
                  onMouseEnter={(e) => {
                    if (active) return;
                    e.currentTarget.style.border = '2px solid rgba(240,204,140,0.85)';
                    e.currentTarget.style.boxShadow = BTN_SHADOW_HOVER;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    if (active) return;
                    e.currentTarget.style.border = '2px solid rgba(255,255,255,0.16)';
                    e.currentTarget.style.boxShadow = BTN_SHADOW;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span
                    className="font-sans"
                    style={{
                      fontSize: 27,
                      lineHeight: 1.22,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.96)',
                      textShadow: '0 2px 4px rgba(0,0,0,0.65)',
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

      {/* Back-knop op de voet van de kiosk, onder de onderste witte lichtlijn */}
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
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="h-full w-full cursor-pointer rounded-2xl text-center outline-none transition-all duration-200"
          style={{
            background: 'linear-gradient(180deg, #453a2d 0%, #2c2318 50%, #191309 100%)',
            border: '2px solid rgba(214,178,124,0.6)',
            boxShadow: BTN_SHADOW,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.border = '2px solid rgba(240,204,140,0.95)';
            e.currentTarget.style.boxShadow = BTN_SHADOW_HOVER;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.border = '2px solid rgba(214,178,124,0.6)';
            e.currentTarget.style.boxShadow = BTN_SHADOW;
          }}
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
