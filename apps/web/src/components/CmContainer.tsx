'use client';

import { CmText } from '@/components/CmText';
import { useContent } from '@/context/content-context';

type ContainerBlock =
  | {
      type: 'text';
      contentKey?: string;
      text?: string;
      className?: string;
    }
  | {
      type: 'image';
      src: string;
      alt?: string;
      className?: string;
    }
  | {
      type: 'video';
      src: string;
      className?: string;
      muted?: boolean;
      loop?: boolean;
      controls?: boolean;
      autoplay?: boolean;
    };

type ContainerColumn = {
  width?: number;
  blocks: ContainerBlock[];
};

type ContainerSchema = {
  type: 'container';
  gap?: number;
  columns: ContainerColumn[];
};

function parseContainerSchema(raw: string | undefined): ContainerSchema | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as ContainerSchema;
    if (parsed?.type !== 'container' || !Array.isArray(parsed.columns)) return null;
    return parsed;
  } catch {
    return null;
  }
}

type CmContainerProps = {
  contentKey: string;
  className?: string;
  fallback?: ContainerSchema;
};

export function CmContainer({ contentKey, className, fallback }: CmContainerProps) {
  const { byKey } = useContent();
  const schema = parseContainerSchema(byKey[contentKey]) ?? fallback ?? null;

  if (!schema) return null;

  const widths = schema.columns.map((c) => Math.max(1, Number(c.width) || 1));
  const total = widths.reduce((sum, w) => sum + w, 0) || 1;
  const templateColumns = widths.map((w) => `${(w / total) * 100}%`).join(' ');
  const gap = Math.max(8, schema.gap ?? 16);

  return (
    <section className={className}>
      <div className="grid items-start" style={{ gridTemplateColumns: templateColumns, gap }}>
        {schema.columns.map((col, i) => (
          <div key={`${contentKey}-col-${i}`} className="space-y-3">
            {(col.blocks ?? []).map((block, j) => {
              if (block.type === 'text') {
                if (block.contentKey) {
                  return (
                    <CmText
                      key={`${contentKey}-txt-${i}-${j}`}
                      contentKey={block.contentKey}
                      as="p"
                      className={block.className ?? 'text-sm leading-relaxed text-ink'}
                      fallback={block.text ?? ''}
                    />
                  );
                }
                return (
                  <p key={`${contentKey}-txt-${i}-${j}`} className={block.className ?? 'text-sm leading-relaxed text-ink'}>
                    {block.text ?? ''}
                  </p>
                );
              }

              if (block.type === 'image') {
                return (
                  <img
                    key={`${contentKey}-img-${i}-${j}`}
                    src={block.src}
                    alt={block.alt ?? ''}
                    className={block.className ?? 'h-auto w-full border border-line object-cover'}
                    loading="lazy"
                  />
                );
              }

              if (block.type === 'video') {
                return (
                  <video
                    key={`${contentKey}-vid-${i}-${j}`}
                    src={block.src}
                    className={block.className ?? 'h-auto w-full border border-line bg-black'}
                    muted={block.muted ?? true}
                    loop={block.loop ?? true}
                    controls={block.controls ?? false}
                    autoPlay={block.autoplay ?? true}
                    playsInline
                  />
                );
              }

              return null;
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
