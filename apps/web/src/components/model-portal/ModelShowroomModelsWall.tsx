'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { CmProgressBar } from '@/components/CmProgressBar';
import { ShowroomDeskMenu } from '@/components/model-portal/ShowroomDeskMenu';
import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';
import type { Quad } from '@/components/model-portal/model-gallery-3d/quadTransform';
import {
  quadMatrix3d,
  quadSourceSize,
} from '@/components/model-portal/model-gallery-3d/quadTransform';
import { getApiBase, publicMediaUrl } from '@/lib/api';
import layout from '@/components/model-portal/showroom-room-layout.json';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const BG = `${SHEET_BASE}/images/showroom-room-bg-v5.jpg`;

const BASE_W = layout.base.width;
const BASE_H = layout.base.height;
/** Rechtermuur — volledig gevuld met modellenkaarten (scrollbaar). */
const WALL_QUAD = layout.modelsWall as Quad;

/** Beeld op 80% van de sitebreedte; is het hoger dan het scherm, dan kan er gescrold worden. */
const WIDTH_FRACTION = 0.8;

const WALL_SRC = quadSourceSize(WALL_QUAD);

/** 2x supersampling zodat namen en leeftijden scherp op de muur staan. */
const SS = 2;
const WALL_W = Math.round(WALL_SRC.w * SS);
const WALL_H = Math.round(WALL_SRC.h * SS);

/** Muur met alle modellen — donkere canvassen met naam- en leeftijdplaatje (ref. beeld). */
export function ModelShowroomModelsWall() {
  const router = useRouter();
  const { token } = useAuth();
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Eigen, altijd zichtbare scrollrail (native scrollbars verdwijnen op macOS). */
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState({ frac: 0, ratio: 1 });

  const syncScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    setScrollPos({
      frac: maxScroll > 0 ? el.scrollTop / maxScroll : 0,
      ratio: el.scrollHeight > 0 ? Math.min(1, el.clientHeight / el.scrollHeight) : 1,
    });
  }, []);

  useEffect(() => {
    syncScroll();
  }, [models, syncScroll]);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const update = () => {
      const s = (el.clientWidth * WIDTH_FRACTION) / BASE_W;
      setScale(s > 0 ? s : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const headers = new Headers();
        if (token) headers.set('Authorization', `Bearer ${token}`);
        const res = await fetch(`${getApiBase()}/catalog/models`, { headers });
        if (!res.ok) throw new Error('Modellenlijst laden mislukt');
        const data = (await res.json()) as CatalogModel[];
        if (!cancelled) {
          setModels(
            (Array.isArray(data) ? data : []).filter((m) => !m.isInactive),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Modellen laden mislukt');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div
      ref={shellRef}
      className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-[#120608]"
    >
      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-xs">
            <CmProgressBar label="Modellen laden…" />
          </div>
        </div>
      ) : null}

      {!loading && error && !models.length ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black p-6 text-center text-sm text-white/70">
          {error}
        </div>
      ) : null}

      <div
        className="relative mx-auto"
        style={{ width: BASE_W * scale, height: BASE_H * scale }}
      >
      <div
        className="absolute left-0 top-0 origin-top-left [container-type:size]"
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `scale(${scale})`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG}
          alt=""
          className="absolute inset-0 h-full w-full select-none object-fill"
          draggable={false}
        />

        {/* Rechtermuur — scrollbare wand vol modellenkaarten */}
        <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: WALL_W,
              height: WALL_H,
              transform: quadMatrix3d(WALL_W, WALL_H, WALL_QUAD),
              transformOrigin: '0 0',
              pointerEvents: 'auto',
            }}
          >
            <div
              ref={scrollRef}
              onScroll={syncScroll}
              className="h-full w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ paddingRight: 44 }}
            >
              <div className="grid grid-cols-5 gap-x-7 gap-y-9 py-2 pl-1">
                {models.map((m) => {
                  const src = m.profileThumbKey
                    ? publicMediaUrl(m.profileThumbKey)
                    : '';
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        router.push(`/portal/model/showroom?model=${m.id}&demo=0`)
                      }
                      className="group flex cursor-pointer flex-col overflow-hidden rounded-[6px] text-left outline-none transition duration-200"
                      style={{
                        background:
                          'linear-gradient(180deg, #171310 0%, #0e0b09 100%)',
                        border: '3px solid #191009',
                        boxShadow:
                          '0 14px 26px rgba(40,22,8,0.5), inset 0 0 18px rgba(0,0,0,0.6)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          '0 0 34px rgba(240,204,140,0.45), 0 14px 26px rgba(40,22,8,0.5)';
                        e.currentTarget.style.border =
                          '3px solid rgba(240,204,140,0.85)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          '0 14px 26px rgba(40,22,8,0.5), inset 0 0 18px rgba(0,0,0,0.6)';
                        e.currentTarget.style.border = '3px solid #191009';
                      }}
                    >
                      <span
                        className="block w-full overflow-hidden"
                        style={{ aspectRatio: '4 / 5', background: '#241a12' }}
                      >
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt={m.displayName}
                            loading="lazy"
                            className="h-full w-full select-none object-cover transition duration-300 group-hover:scale-[1.03]"
                            style={{
                              objectPosition: 'center top',
                              filter:
                                'sepia(0.32) saturate(0.92) brightness(0.97) contrast(1.03)',
                            }}
                            draggable={false}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-serif text-[26px] text-[#c9a06a]/60">
                            {m.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span
                        className="flex w-full items-center justify-between gap-2 px-3"
                        style={{ minHeight: 62 }}
                      >
                        <span
                          className="truncate font-sans"
                          style={{
                            fontSize: 24,
                            fontWeight: 500,
                            letterSpacing: '0.03em',
                            color: '#ffffff',
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                          }}
                        >
                          {m.displayName}
                        </span>
                        {m.age != null ? (
                          <span
                            className="shrink-0 whitespace-nowrap font-sans"
                            style={{
                              fontSize: 20,
                              fontWeight: 400,
                              color: '#ffffff',
                              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                            }}
                          >
                            {m.age} jaar
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duidelijk zichtbare scrollrail rechts op de muur */}
            {scrollPos.ratio < 1 ? (
              <div
                aria-hidden
                className="pointer-events-none absolute flex flex-col items-center"
                style={{ right: 2, top: 6, bottom: 6, width: 30 }}
              >
                <span
                  className="mb-1 shrink-0 select-none font-sans"
                  style={{ fontSize: 17, lineHeight: 1, color: 'rgba(120,72,30,0.9)' }}
                >
                  ▲
                </span>
                <span
                  className="relative block min-h-0 w-[14px] flex-1 rounded-full"
                  style={{
                    background: 'rgba(46,28,14,0.4)',
                    border: '1px solid rgba(120,72,30,0.45)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.35)',
                  }}
                >
                  <span
                    className="absolute left-[1px] right-[1px] block rounded-full"
                    style={{
                      height: `${Math.max(10, scrollPos.ratio * 100)}%`,
                      top: `${scrollPos.frac * (100 - Math.max(10, scrollPos.ratio * 100))}%`,
                      background:
                        'linear-gradient(180deg, rgba(240,204,140,0.95), rgba(196,150,90,0.95))',
                      boxShadow: '0 0 10px rgba(240,204,140,0.55)',
                    }}
                  />
                </span>
                <span
                  className="mt-1 shrink-0 select-none font-sans"
                  style={{ fontSize: 17, lineHeight: 1, color: 'rgba(120,72,30,0.9)' }}
                >
                  ▼
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Kiosk links — menubord van het modellenportaal */}
        <ShowroomDeskMenu currentPage="modellen" />
      </div>
      </div>
    </div>
  );
}
