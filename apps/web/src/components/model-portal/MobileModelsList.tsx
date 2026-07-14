'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { MobileAppBar } from '@/components/MobileAppBar';
import { CmProgressBar } from '@/components/CmProgressBar';
import { MobileModelPagesMenu } from '@/components/model-portal/MobileModelFiche';
import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';
import { getApiBase, publicMediaUrl } from '@/lib/api';

const BG = '#f1eee8';
const CARD = '#faf8f4';
const LINE = '#ddd5c7';
const TEXT = '#372c1f';
const TEXT_SOFT = '#7a6e5d';

/** Alle modellen op de gsm: eenvoudige, scrolbare lijst met gewone foto's. */
export function MobileModelsList() {
  const router = useRouter();
  const { token } = useAuth();
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setModels((Array.isArray(data) ? data : []).filter((m) => !m.isInactive));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Modellen laden mislukt');
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
    <div className="min-h-[100dvh]" style={{ background: BG, color: TEXT }}>
      <MobileAppBar
        title="Modellenportaal"
        subtitle="Alle modellen"
        menuTitle="Menu"
        menuContent={<MobileModelPagesMenu />}
        backRow
      />

      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10 pt-4">
        {loading ? (
          <div className="mx-auto mt-10 w-full max-w-xs">
            <CmProgressBar label="Modellen laden…" />
          </div>
        ) : null}

        {!loading && error && !models.length ? (
          <p className="mt-6 text-center text-sm" style={{ color: TEXT_SOFT }}>
            {error}
          </p>
        ) : null}

        {!loading && models.length ? (
          <div className="grid grid-cols-2 gap-3">
            {models.map((m) => {
              const src = m.profileThumbKey ? publicMediaUrl(m.profileThumbKey) : '';
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => router.push(`/portal/model/showroom?model=${m.id}&demo=0`)}
                  className="overflow-hidden rounded-xl text-left outline-none"
                  style={{ background: CARD, border: `1px solid ${LINE}` }}
                >
                  <span className="block w-full overflow-hidden" style={{ aspectRatio: '4 / 5' }}>
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={m.displayName}
                        loading="lazy"
                        className="block h-full w-full select-none object-cover"
                        style={{ objectPosition: 'center top' }}
                        draggable={false}
                      />
                    ) : (
                      <span
                        className="flex h-full w-full items-center justify-center font-serif text-3xl"
                        style={{ color: TEXT_SOFT }}
                      >
                        {m.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <span className="truncate text-[14px] font-semibold" style={{ color: TEXT }}>
                      {m.displayName}
                    </span>
                    {m.age != null ? (
                      <span className="shrink-0 text-[12px]" style={{ color: TEXT_SOFT }}>
                        {m.age} jaar
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
