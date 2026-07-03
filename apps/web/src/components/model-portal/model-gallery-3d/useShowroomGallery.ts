'use client';

import { useEffect, useState } from 'react';
import { getApiBase, publicMediaUrl } from '@/lib/api';
import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';

export const SHOWROOM_WALL_COUNT = 8;
export const SHOWROOM_MODEL_SESSION_KEY = 'showroom-model-id';

export type ShowroomGalleryData = {
  photoUrls: string[];
  model: CatalogModel | null;
  loading: boolean;
  error: string | null;
  modelId: string | null;
};

function keysToUrls(keys: string[]): string[] {
  return keys.map((k) => publicMediaUrl(k)).filter(Boolean);
}

function padWallUrls(urls: string[]): string[] {
  if (!urls.length) return [];
  const out: string[] = [];
  for (let i = 0; i < SHOWROOM_WALL_COUNT; i++) {
    out.push(urls[i % urls.length]!);
  }
  return out;
}

export function useShowroomGallery(
  token: string | null,
  modelIdParam: string | null,
): ShowroomGalleryData {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [model, setModel] = useState<CatalogModel | null>(null);
  const [modelId, setModelId] = useState<string | null>(modelIdParam);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);

      try {
        let id =
          modelIdParam?.trim() ||
          (typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem(SHOWROOM_MODEL_SESSION_KEY)
            : null);

        if (!id) {
          const listRes = await fetch(`${getApiBase()}/catalog/models`, { headers });
          if (!listRes.ok) throw new Error('Modellenlijst laden mislukt');
          const list = (await listRes.json()) as CatalogModel[];
          id = list.find((m) => m.profileThumbKey)?.id ?? list[0]?.id ?? null;
        }

        if (!id) {
          if (!cancelled) {
            setModel(null);
            setModelId(null);
            setPhotoUrls([]);
            setError('Geen model gevonden. Open een modellenfiche en kies “3D showroom”.');
          }
          return;
        }

        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(SHOWROOM_MODEL_SESSION_KEY, id);
        }

        const detailRes = await fetch(`${getApiBase()}/catalog/models/${id}`, { headers });
        if (!detailRes.ok) throw new Error('Modellenfiche laden mislukt');
        const detail = (await detailRes.json()) as CatalogModel;

        let keys: string[] = [];
        if (token) {
          const galleryRes = await fetch(`${getApiBase()}/catalog/models/${id}/gallery`, {
            headers,
          });
          if (galleryRes.ok) {
            const data = (await galleryRes.json()) as { keys?: string[] };
            if (Array.isArray(data.keys) && data.keys.length) keys = data.keys;
          }
        }

        if (!keys.length && detail.profileThumbKey) {
          keys = [detail.profileThumbKey];
        }

        const urls = padWallUrls(keysToUrls(keys));

        if (!cancelled) {
          setModel(detail);
          setModelId(id);
          setPhotoUrls(urls);
          if (!urls.length) {
            setError('Dit model heeft nog geen galerijfoto\'s geüpload.');
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Galerij laden mislukt');
          setPhotoUrls([]);
          setModel(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, modelIdParam]);

  return { photoUrls, model, loading, error, modelId };
}
