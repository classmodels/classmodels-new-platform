'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { apiFetch } from '@/lib/api';
import {
  CONTENT_SECTIONS,
  allEditableContentKeys,
  contentFieldLabel,
  groupContentKeys,
} from '@/lib/content-sections';

type Str = { key: string; value: string };

async function upsertKey(token: string, key: string, value: string) {
  try {
    await adminFetch('/content/strings', token, {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    });
  } catch {
    await adminFetch('/content/strings', token, {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
  }
}

export function ContentTextsEditor() {
  const { token, can } = useAuth();
  const searchParams = useSearchParams();
  const initialSection = searchParams.get('section') || CONTENT_SECTIONS[0]?.id || 'begin';

  const [sectionId, setSectionId] = useState(initialSection);
  const [values, setValues] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const allKeys = useMemo(() => allEditableContentKeys(), []);
  const grouped = useMemo(() => groupContentKeys(allKeys), [allKeys]);

  const load = useCallback(async () => {
    const data = await apiFetch<Str[]>('/content/strings').catch(() => [] as Str[]);
    const map: Record<string, string> = {};
    for (const key of allKeys) {
      const row = data.find((r) => r.key === key);
      map[key] = row?.value ?? '';
    }
    setValues(map);
  }, [allKeys]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const s = searchParams.get('section');
    if (s && grouped.has(s)) setSectionId(s);
  }, [searchParams, grouped]);

  const sectionKeys = useMemo(() => {
    const keys = grouped.get(sectionId) ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter(
      (k) =>
        k.toLowerCase().includes(q) ||
        contentFieldLabel(k).toLowerCase().includes(q) ||
        (values[k] ?? '').toLowerCase().includes(q),
    );
  }, [grouped, sectionId, filter, values]);

  const saveKeys = async (keys: string[]) => {
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      for (const key of keys) {
        await upsertKey(token, key, values[key] ?? '');
      }
      setMsg(`${keys.length} tekst(en) opgeslagen.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(false);
    }
  };

  const saveSection = () => void saveKeys(grouped.get(sectionId) ?? []);
  const saveAll = async () => {
    if (!window.confirm(`Alle ${allKeys.length} teksten opslaan?`)) return;
    await saveKeys(allKeys);
  };

  if (!can('content.strings.write')) {
    return <p className="text-sm text-muted">Geen rechten om teksten te bewerken.</p>;
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <nav className="shrink-0 lg:w-56">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Onderdeel</p>
        <ul className="space-y-0.5 rounded-lg border border-line bg-white p-1 text-sm shadow-sm">
          {CONTENT_SECTIONS.map((s) => {
            const count = grouped.get(s.id)?.length ?? 0;
            if (!count) return null;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSectionId(s.id);
                    setFilter('');
                    setMsg(null);
                  }}
                  className={`w-full rounded px-2 py-1.5 text-left ${
                    sectionId === s.id ? 'bg-burgundy text-white' : 'hover:bg-panel text-ink'
                  }`}
                >
                  {s.title}
                  <span className={`ml-1 text-[10px] ${sectionId === s.id ? 'text-white/80' : 'text-muted'}`}>
                    ({count})
                  </span>
                </button>
              </li>
            );
          })}
          {(grouped.get('other')?.length ?? 0) > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => setSectionId('other')}
                className={`w-full rounded px-2 py-1.5 text-left ${
                  sectionId === 'other' ? 'bg-burgundy text-white' : 'hover:bg-panel text-ink'
                }`}
              >
                Overig ({grouped.get('other')!.length})
              </button>
            </li>
          ) : null}
        </ul>
        <p className="mt-3 text-[11px] text-muted leading-snug">
          <Link href="/admin/content/technisch" className="text-burgundy underline">
            Technisch beheer
          </Link>{' '}
          (containers, losse sleutels).
        </p>
      </nav>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h1 className="text-lg font-semibold text-ink">
            {CONTENT_SECTIONS.find((s) => s.id === sectionId)?.title ?? 'Overig'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Vul de velden in en klik Opslaan. Leeg laten = standaardtekst op de site (indien aanwezig).
          </p>
          <input
            className="mt-3 w-full rounded border border-line px-3 py-2 text-sm"
            placeholder="Zoek in deze sectie…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {sectionKeys.length === 0 ? (
            <p className="text-sm text-muted">Geen teksten in deze sectie (pas zoekfilter aan).</p>
          ) : (
            sectionKeys.map((key) => (
              <label key={key} className="block rounded-lg border border-line bg-white p-3 shadow-sm">
                <span className="text-sm font-medium text-ink">{contentFieldLabel(key)}</span>
                <textarea
                  className="mt-2 min-h-[72px] w-full rounded border border-line px-3 py-2 text-sm text-ink"
                  rows={Math.min(8, Math.max(2, Math.ceil((values[key]?.length ?? 0) / 80)))}
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </label>
            ))
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !sectionKeys.length}
            onClick={saveSection}
            className="rounded bg-burgundy px-4 py-2 text-sm font-semibold text-white hover:bg-burgundyDeep disabled:opacity-50"
          >
            {busy ? 'Opslaan…' : 'Sectie opslaan'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveAll()}
            className="rounded border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-panel disabled:opacity-50"
          >
            Alles opslaan
          </button>
        </div>
        {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
      </div>
    </div>
  );
}
