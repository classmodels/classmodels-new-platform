'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { apiFetch } from '@/lib/api';
import { ContainerMediaPicker } from '@/components/admin/ContainerMediaPicker';

type Str = { key: string; value: string; locale: string };
type BlockType = 'text' | 'image' | 'video';
type BuilderBlock = {
  id: string;
  type: BlockType;
  contentKey?: string;
  text?: string;
  src?: string;
  alt?: string;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  autoplay?: boolean;
};
type BuilderColumn = {
  id: string;
  width: number;
  blocks: BuilderBlock[];
};

function mkId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function moveInList<T>(list: T[], from: number, to: number) {
  if (from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function mkTextBlock(text: string): BuilderBlock {
  return { id: mkId(), type: 'text', text };
}

export default function AdminContentPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<Str[]>([]);
  const [n, setN] = useState({ key: '', value: '' });
  const [containerMsg, setContainerMsg] = useState('');
  const [builder, setBuilder] = useState({
    slug: '',
    heroKicker: 'Inhoudspagina',
    heroTitle: 'Nieuwe containerpagina',
    gap: 16,
  });
  const [columns, setColumns] = useState<BuilderColumn[]>([
    {
      id: mkId(),
      width: 6,
      blocks: [{ id: mkId(), type: 'text', text: 'Kolom 1 tekst' }],
    },
    {
      id: mkId(),
      width: 6,
      blocks: [{ id: mkId(), type: 'text', text: 'Kolom 2 tekst' }],
    },
  ]);
  const [dragBlock, setDragBlock] = useState<{ col: number; idx: number } | null>(null);
  const [dragCol, setDragCol] = useState<number | null>(null);
  const [mediaPicker, setMediaPicker] = useState<{ col: number; blockIdx: number; mode: 'image' | 'video' } | null>(
    null,
  );

  const load = useCallback(async () => {
    const data = await apiFetch<Str[]>('/content/strings');
    setRows(data);
  }, []);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const remove = async (key: string) => {
    if (!token || !confirm(`Sleutel ${key} verwijderen?`)) return;
    await adminFetch('/content/strings', token, {
      method: 'DELETE',
      body: JSON.stringify({ key }),
    });
    await load();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await adminFetch('/content/strings', token, {
      method: 'POST',
      body: JSON.stringify({ key: n.key, value: n.value }),
    });
    setN({ key: '', value: '' });
    await load();
  };

  const upsertKey = useCallback(
    async (key: string, value: string) => {
      if (!token) return;
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
    },
    [token],
  );

  const addColumn = () => {
    setColumns((prev) => [...prev, { id: mkId(), width: 6, blocks: [] }]);
  };

  const removeColumn = (colIdx: number) => {
    setColumns((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== colIdx)));
  };

  const updateColumnWidth = (colIdx: number, width: number) => {
    setColumns((prev) => prev.map((c, i) => (i === colIdx ? { ...c, width: Math.max(1, width || 1) } : c)));
  };

  const addBlock = (colIdx: number, type: BlockType) => {
    setColumns((prev) =>
      prev.map((c, i) => {
        if (i !== colIdx) return c;
        if (type === 'text') return { ...c, blocks: [...c.blocks, { id: mkId(), type: 'text', text: '' }] };
        if (type === 'image') return { ...c, blocks: [...c.blocks, { id: mkId(), type: 'image', src: '', alt: '' }] };
        return {
          ...c,
          blocks: [
            ...c.blocks,
            {
              id: mkId(),
              type: 'video',
              src: '',
              muted: true,
              loop: true,
              controls: false,
              autoplay: true,
            },
          ],
        };
      }),
    );
  };

  const updateBlock = (colIdx: number, blockIdx: number, patch: Partial<BuilderBlock>) => {
    setColumns((prev) =>
      prev.map((c, i) => {
        if (i !== colIdx) return c;
        return {
          ...c,
          blocks: c.blocks.map((b, j) => (j === blockIdx ? { ...b, ...patch } : b)),
        };
      }),
    );
  };

  const removeBlock = (colIdx: number, blockIdx: number) => {
    setColumns((prev) =>
      prev.map((c, i) => (i === colIdx ? { ...c, blocks: c.blocks.filter((_, j) => j !== blockIdx) } : c)),
    );
  };

  const onDropBlockAt = (targetCol: number, targetIndex: number, e: React.DragEvent) => {
    if (!dragBlock) return;
    e.stopPropagation();
    setColumns((prev) => {
      const sourceCol = prev[dragBlock.col];
      const moving = sourceCol?.blocks[dragBlock.idx];
      if (!sourceCol || !moving) return prev;

      const next = prev.map((c) => ({ ...c, blocks: [...c.blocks] }));
      next[dragBlock.col].blocks.splice(dragBlock.idx, 1);

      const adjustedTarget =
        dragBlock.col === targetCol && dragBlock.idx < targetIndex ? targetIndex - 1 : targetIndex;
      next[targetCol].blocks.splice(Math.max(0, adjustedTarget), 0, moving);
      return next;
    });
    setDragBlock(null);
  };

  const onColumnDragOver = (e: React.DragEvent) => {
    if (dragCol !== null) e.preventDefault();
  };

  const onColumnDrop = (targetIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragCol === null) return;
    if (dragCol === targetIdx) {
      setDragCol(null);
      return;
    }
    setColumns((prev) => moveInList(prev, dragCol, targetIdx));
    setDragCol(null);
  };

  const applyLayoutTemplate = (id: '50-50' | '70-30' | '33-33' | '8-4-4' | 'hero-3') => {
    switch (id) {
      case '50-50':
        setColumns([
          { id: mkId(), width: 6, blocks: [mkTextBlock('Kolom links')] },
          { id: mkId(), width: 6, blocks: [mkTextBlock('Kolom rechts')] },
        ]);
        break;
      case '70-30':
        setColumns([
          { id: mkId(), width: 7, blocks: [mkTextBlock('Breed (±70%)')] },
          { id: mkId(), width: 3, blocks: [mkTextBlock('Smal (±30%)')] },
        ]);
        break;
      case '33-33':
        setColumns([
          { id: mkId(), width: 4, blocks: [mkTextBlock('Kolom 1')] },
          { id: mkId(), width: 4, blocks: [mkTextBlock('Kolom 2')] },
          { id: mkId(), width: 4, blocks: [mkTextBlock('Kolom 3')] },
        ]);
        break;
      case '8-4-4':
        setColumns([
          { id: mkId(), width: 8, blocks: [mkTextBlock('Hoofdinhoud')] },
          { id: mkId(), width: 4, blocks: [mkTextBlock('Zij 1')] },
          { id: mkId(), width: 4, blocks: [mkTextBlock('Zij 2')] },
        ]);
        break;
      case 'hero-3':
        setColumns([
          { id: mkId(), width: 12, blocks: [mkTextBlock('Hero / intro (breedste kolom)')] },
          { id: mkId(), width: 4, blocks: [mkTextBlock('Kaart 1')] },
          { id: mkId(), width: 4, blocks: [mkTextBlock('Kaart 2')] },
          { id: mkId(), width: 4, blocks: [mkTextBlock('Kaart 3')] },
        ]);
        break;
      default:
        break;
    }
  };

  const loadContainerFromSlug = () => {
    setContainerMsg('');
    const slug = builder.slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (!slug) {
      setContainerMsg('Geef eerst een slug om te laden.');
      return;
    }
    const containerKey = `container.${slug}`;
    const row = rows.find((r) => r.key === containerKey);
    if (!row?.value) {
      setContainerMsg('Geen container gevonden voor deze slug.');
      return;
    }
    try {
      const parsed = JSON.parse(row.value) as {
        type: string;
        gap?: number;
        columns?: Array<{ width?: number; blocks?: BuilderBlock[] }>;
      };
      if (parsed.type !== 'container' || !Array.isArray(parsed.columns)) {
        setContainerMsg('Container JSON ongeldig.');
        return;
      }
      setBuilder((b) => ({
        ...b,
        gap: parsed.gap ?? 16,
        heroKicker: rows.find((r) => r.key === `${containerKey}.hero.kicker`)?.value || b.heroKicker,
        heroTitle: rows.find((r) => r.key === `${containerKey}.hero.title`)?.value || b.heroTitle,
      }));
      setColumns(
        parsed.columns.map((c) => ({
          id: mkId(),
          width: Math.max(1, Number(c.width) || 1),
          blocks: (c.blocks ?? []).map((b) => ({ ...b, id: mkId() })),
        })),
      );
      setContainerMsg('Container geladen.');
    } catch {
      setContainerMsg('Container laden mislukt.');
    }
  };

  const createContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setContainerMsg('');
    const slug = builder.slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (!slug) {
      setContainerMsg('Geef een slug in.');
      return;
    }

    if (!columns.length) {
      setContainerMsg('Voeg minstens 1 kolom toe.');
      return;
    }

    const containerKey = `container.${slug}`;
    const schemaColumns = columns.map((col, colIdx) => ({
      width: Math.max(1, Number(col.width) || 1),
      blocks: col.blocks.map((b, blockIdx) => {
        if (b.type === 'text') {
          return {
            type: 'text',
            contentKey: b.contentKey || `${containerKey}.c${colIdx + 1}.b${blockIdx + 1}.text`,
            text: b.text ?? '',
          };
        }
        if (b.type === 'image') {
          return {
            type: 'image',
            src: b.src ?? '',
            alt: b.alt ?? '',
          };
        }
        return {
          type: 'video',
          src: b.src ?? '',
          muted: b.muted ?? true,
          loop: b.loop ?? true,
          controls: b.controls ?? false,
          autoplay: b.autoplay ?? true,
        };
      }),
    }));

    const schema = {
      type: 'container',
      gap: Math.max(8, Number(builder.gap) || 16),
      columns: schemaColumns,
    };

    try {
      await upsertKey(`${containerKey}.hero.kicker`, builder.heroKicker);
      await upsertKey(`${containerKey}.hero.title`, builder.heroTitle);
      await Promise.all(
        schemaColumns.flatMap((col) =>
          (col.blocks ?? [])
            .filter((b) => b.type === 'text' && typeof b.contentKey === 'string' && typeof b.text === 'string')
            .map((b) => upsertKey(String(b.contentKey), String(b.text))),
        ),
      );
      await upsertKey(containerKey, JSON.stringify(schema));
      await load();
      setContainerMsg(
        `Container opgeslagen. Menu: /content/${slug} (opent in gastenportaal met zijbalk) of /portal/guest?content=${slug}`,
      );
    } catch {
      setContainerMsg('Container opslaan mislukt.');
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">Content (CMS-sleutels)</h1>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2 text-sm">
        <input
          className="rounded border border-line px-2 py-1"
          placeholder="nieuwe sleutel"
          value={n.key}
          onChange={(e) => setN({ ...n, key: e.target.value })}
          required
        />
        <input
          className="min-w-[200px] flex-1 rounded border border-line px-2 py-1"
          placeholder="waarde"
          value={n.value}
          onChange={(e) => setN({ ...n, value: e.target.value })}
          required
        />
        <button type="submit" className="rounded bg-burgundy px-3 py-1 text-white hover:bg-burgundyDeep">
          Toevoegen
        </button>
      </form>
      <p className="text-xs text-muted">
        Bewerken op de site: admin → &quot;Tekst aanpassen&quot; (inline). Hier beheer je nieuwe sleutels en
        verwijder je oude.
      </p>
      <form onSubmit={createContainer} className="space-y-3 rounded-md border border-line bg-white p-4 text-sm shadow-sm">
        <p className="font-medium text-ink">Container builder (drag & drop)</p>
        <p className="text-xs text-muted">
          Sleep blokken tussen kolommen; sleep kolommen via het handvat. Koppel een menu-item aan{' '}
          <code>/content/jouw-slug</code>. Media: knop &quot;Media&quot; (rechten admin.media.read/write).
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="rounded border border-line px-2 py-1"
            placeholder="slug (bv. promo-zomer)"
            value={builder.slug}
            onChange={(e) => setBuilder((v) => ({ ...v, slug: e.target.value }))}
            required
          />
          <input
            className="rounded border border-line px-2 py-1"
            placeholder="hero kicker"
            value={builder.heroKicker}
            onChange={(e) => setBuilder((v) => ({ ...v, heroKicker: e.target.value }))}
          />
          <input
            className="rounded border border-line px-2 py-1"
            placeholder="hero titel"
            value={builder.heroTitle}
            onChange={(e) => setBuilder((v) => ({ ...v, heroTitle: e.target.value }))}
          />
        </div>
        <input
          className="max-w-[240px] rounded border border-line px-2 py-1"
          placeholder="gap"
          type="number"
          min={8}
          value={builder.gap}
          onChange={(e) => setBuilder((v) => ({ ...v, gap: parseInt(e.target.value, 10) || 16 }))}
        />

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-muted">Sjablonen (vervangt kolommen):</span>
          <button
            type="button"
            className="rounded border border-line bg-white px-2 py-1 hover:bg-panel"
            onClick={() => applyLayoutTemplate('50-50')}
          >
            50 / 50
          </button>
          <button
            type="button"
            className="rounded border border-line bg-white px-2 py-1 hover:bg-panel"
            onClick={() => applyLayoutTemplate('70-30')}
          >
            70 / 30
          </button>
          <button
            type="button"
            className="rounded border border-line bg-white px-2 py-1 hover:bg-panel"
            onClick={() => applyLayoutTemplate('33-33')}
          >
            3 gelijk
          </button>
          <button
            type="button"
            className="rounded border border-line bg-white px-2 py-1 hover:bg-panel"
            onClick={() => applyLayoutTemplate('8-4-4')}
          >
            8 + 4 + 4
          </button>
          <button
            type="button"
            className="rounded border border-line bg-white px-2 py-1 hover:bg-panel"
            onClick={() => applyLayoutTemplate('hero-3')}
          >
            Hero + 3 kaarten
          </button>
        </div>

        <div className="space-y-3 border border-line bg-panel/30 p-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded border border-line bg-white px-2 py-1 text-xs" onClick={addColumn}>
              + Kolom
            </button>
            <button type="button" className="rounded border border-line bg-white px-2 py-1 text-xs" onClick={loadContainerFromSlug}>
              Laad bestaande slug
            </button>
          </div>
          <p className="text-[11px] text-muted">
            Sleep kolommen via het <span className="font-mono">⠿</span>-icoon op een andere kolom om de volgorde te wijzigen.
          </p>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {columns.map((col, colIdx) => (
              <div
                key={col.id}
                className="space-y-2 border border-line bg-white p-2"
                onDragOver={onColumnDragOver}
                onDrop={(e) => onColumnDrop(colIdx, e)}
              >
                <div className="flex items-center gap-2 border-b border-line pb-1">
                  <span
                    draggable
                    onDragStart={() => {
                      setDragCol(colIdx);
                      setDragBlock(null);
                    }}
                    onDragEnd={() => setDragCol(null)}
                    className="cursor-grab select-none px-0.5 text-base leading-none text-muted hover:text-ink"
                    title="Sleep kolom"
                    aria-label="Sleep kolom"
                  >
                    ⠿
                  </span>
                  <span className="text-[11px] text-muted">Kolom {colIdx + 1}</span>
                  <input
                    type="number"
                    min={1}
                    className="w-16 rounded border border-line px-1 py-0.5 text-xs"
                    value={col.width}
                    onChange={(e) => updateColumnWidth(colIdx, parseInt(e.target.value, 10))}
                  />
                  <button
                    type="button"
                    className="ml-auto text-[11px] text-red-700 hover:underline"
                    onClick={() => removeColumn(colIdx)}
                  >
                    Verwijder kolom
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  <button type="button" className="rounded border border-line px-1.5 py-0.5 text-[11px]" onClick={() => addBlock(colIdx, 'text')}>
                    + Tekst
                  </button>
                  <button type="button" className="rounded border border-line px-1.5 py-0.5 text-[11px]" onClick={() => addBlock(colIdx, 'image')}>
                    + Foto
                  </button>
                  <button type="button" className="rounded border border-line px-1.5 py-0.5 text-[11px]" onClick={() => addBlock(colIdx, 'video')}>
                    + Video
                  </button>
                </div>

                <div className="space-y-2">
                  {col.blocks.map((b, blockIdx) => (
                    <div
                      key={b.id}
                      draggable
                      onDragStart={() => {
                        setDragBlock({ col: colIdx, idx: blockIdx });
                        setDragCol(null);
                      }}
                      onDragEnd={() => setDragBlock(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropBlockAt(colIdx, blockIdx, e)}
                      className="space-y-1 border border-line bg-panel/40 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium uppercase text-muted">{b.type}</span>
                        <button
                          type="button"
                          className="ml-auto text-red-700 hover:underline"
                          onClick={() => removeBlock(colIdx, blockIdx)}
                        >
                          verwijder
                        </button>
                      </div>

                      {b.type === 'text' ? (
                        <>
                          <input
                            className="w-full rounded border border-line px-1 py-0.5"
                            placeholder="Tekst key (optioneel)"
                            value={b.contentKey ?? ''}
                            onChange={(e) => updateBlock(colIdx, blockIdx, { contentKey: e.target.value })}
                          />
                          <textarea
                            className="min-h-[70px] w-full rounded border border-line px-1 py-0.5"
                            placeholder="Tekstinhoud"
                            value={b.text ?? ''}
                            onChange={(e) => updateBlock(colIdx, blockIdx, { text: e.target.value })}
                          />
                        </>
                      ) : null}

                      {b.type === 'image' ? (
                        <>
                          <div className="flex flex-wrap gap-1">
                            <input
                              className="min-w-0 flex-1 rounded border border-line px-1 py-0.5"
                              placeholder="Afbeelding URL"
                              value={b.src ?? ''}
                              onChange={(e) => updateBlock(colIdx, blockIdx, { src: e.target.value })}
                            />
                            {can('admin.media.read') ? (
                              <button
                                type="button"
                                className="shrink-0 rounded border border-line bg-white px-1.5 py-0.5 text-[11px] hover:bg-panel"
                                onClick={() => setMediaPicker({ col: colIdx, blockIdx, mode: 'image' })}
                              >
                                Media
                              </button>
                            ) : null}
                          </div>
                          <input
                            className="w-full rounded border border-line px-1 py-0.5"
                            placeholder="Alt tekst"
                            value={b.alt ?? ''}
                            onChange={(e) => updateBlock(colIdx, blockIdx, { alt: e.target.value })}
                          />
                        </>
                      ) : null}

                      {b.type === 'video' ? (
                        <>
                          <div className="flex flex-wrap gap-1">
                            <input
                              className="min-w-0 flex-1 rounded border border-line px-1 py-0.5"
                              placeholder="Video URL"
                              value={b.src ?? ''}
                              onChange={(e) => updateBlock(colIdx, blockIdx, { src: e.target.value })}
                            />
                            {can('admin.media.read') ? (
                              <button
                                type="button"
                                className="shrink-0 rounded border border-line bg-white px-1.5 py-0.5 text-[11px] hover:bg-panel"
                                onClick={() => setMediaPicker({ col: colIdx, blockIdx, mode: 'video' })}
                              >
                                Media
                              </button>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={b.muted ?? true}
                                onChange={(e) => updateBlock(colIdx, blockIdx, { muted: e.target.checked })}
                              />
                              geluid uit
                            </label>
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={b.loop ?? true}
                                onChange={(e) => updateBlock(colIdx, blockIdx, { loop: e.target.checked })}
                              />
                              repeat
                            </label>
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={!(b.controls ?? false)}
                                onChange={(e) => updateBlock(colIdx, blockIdx, { controls: !e.target.checked })}
                              />
                              knoppen verbergen
                            </label>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ))}

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDropBlockAt(colIdx, col.blocks.length, e)}
                    className="border border-dashed border-line px-2 py-1 text-[11px] text-muted"
                  >
                    Sleep blok hierheen
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button type="submit" className="rounded bg-burgundy px-3 py-1 text-white hover:bg-burgundyDeep">
          Container opslaan
        </button>
        {containerMsg ? <p className="text-xs text-muted">{containerMsg}</p> : null}
      </form>
      <ContainerMediaPicker
        open={!!mediaPicker}
        onClose={() => setMediaPicker(null)}
        onPick={(url) => {
          if (!mediaPicker) return;
          const { col, blockIdx } = mediaPicker;
          updateBlock(col, blockIdx, { src: url });
        }}
        token={token}
        canRead={can('admin.media.read')}
        canWrite={can('admin.media.write')}
        mode={mediaPicker?.mode ?? 'image'}
      />

      <ul className="divide-y divide-line rounded-md border border-line bg-white text-xs shadow-sm">
        {rows.map((r) => (
          <li key={r.key} className="flex items-start justify-between gap-2 px-3 py-2">
            <div>
              <code className="text-burgundy">{r.key}</code>
              <p className="mt-1 text-muted line-clamp-2">{r.value}</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-danger hover:underline"
              onClick={() => remove(r.key)}
            >
              Verwijder
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
