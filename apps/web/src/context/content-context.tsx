'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useI18n } from '@/i18n/context';

type ContentRow = { key: string; value: string; locale: string };

type Ctx = {
  byKey: Record<string, string>;
  loading: boolean;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  patchKey: (key: string, value: string) => Promise<void>;
  /** Zelfde als patchKey maar zonder debounce; gebruik bij blur / edit-mode uit. */
  patchKeyImmediate: (key: string, value: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const ContentContext = createContext<Ctx | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const { token, can } = useAuth();
  const [byKey, setByKey] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const pending = useRef<Record<string, number>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiFetch<ContentRow[]>(`/content/strings?locale=${encodeURIComponent(locale)}`, {
        skipLoading: true,
      });
      const m: Record<string, string> = {};
      for (const r of rows) m[r.key] = r.value;
      setByKey(m);
    } catch {
      setByKey({});
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patchKeyImmediate = useCallback(
    async (key: string, value: string) => {
      if (!token || !can('content.strings.write')) return;
      window.clearTimeout(pending.current[key]);
      delete pending.current[key];
      setByKey((prev) => ({ ...prev, [key]: value }));
      try {
        await apiFetch('/content/strings', {
          method: 'PATCH',
          token,
          body: JSON.stringify({ key, value }),
        });
      } catch {
        try {
          await apiFetch('/content/strings', {
            method: 'POST',
            token,
            body: JSON.stringify({ key, value }),
          });
        } catch {
          try {
            await refresh();
          } catch {
            /* ignore */
          }
        }
      }
    },
    [token, can, refresh],
  );

  const patchKey = useCallback(
    async (key: string, value: string) => {
      if (!token || !can('content.strings.write')) return;
      setByKey((prev) => ({ ...prev, [key]: value }));
      window.clearTimeout(pending.current[key]);
      pending.current[key] = window.setTimeout(() => {
        void (async () => {
          try {
            await apiFetch('/content/strings', {
              method: 'PATCH',
              token,
              body: JSON.stringify({ key, value }),
            });
          } catch {
            try {
              // Nieuwe key? Maak die automatisch aan i.p.v. edit te verliezen.
              await apiFetch('/content/strings', {
                method: 'POST',
                token,
                body: JSON.stringify({ key, value }),
              });
            } catch {
              try {
                await refresh();
              } catch {
                /* refresh mag niet naar buiten rejecten */
              }
            }
          }
        })();
      }, 450);
    },
    [token, can, refresh],
  );

  const value = useMemo(
    () => ({ byKey, loading, editMode, setEditMode, patchKey, patchKeyImmediate, refresh }),
    [byKey, loading, editMode, patchKey, patchKeyImmediate, refresh],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent binnen ContentProvider gebruiken');
  return ctx;
}
