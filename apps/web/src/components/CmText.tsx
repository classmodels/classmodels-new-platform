'use client';

import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type HTMLAttributes,
  type JSX,
} from 'react';
import { useAuth } from '@/context/auth-context';
import { useContent } from '@/context/content-context';
import {
  cmsHtmlToPlainText,
  hasMeaningfulRichMarkup,
  looksLikeMeaningfulRichHtml,
  sanitizeCmsHtml,
} from '@/lib/sanitize-cms-html';

type CmTextProps = {
  contentKey: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  fallback?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>;

function patchFromEditable(el: HTMLElement, contentKey: string, patchKey: (k: string, v: string) => void) {
  if (hasMeaningfulRichMarkup(el)) {
    patchKey(contentKey, sanitizeCmsHtml(el.innerHTML));
  } else {
    patchKey(contentKey, el.innerText);
  }
}

function applyRelativeFontSize(mult: number) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  const span = document.createElement('span');
  span.style.fontSize = mult > 1 ? '1.15em' : '0.88em';
  try {
    range.surroundContents(span);
  } catch {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
}

export function CmText({ contentKey, as = 'span', className, fallback = '', ...rest }: CmTextProps) {
  const { byKey, editMode, patchKey } = useContent();
  const { can } = useAuth();
  const hasKey = Object.prototype.hasOwnProperty.call(byKey, contentKey);
  const val = hasKey ? (byKey[contentKey] ?? '') : fallback;
  const ref = useRef<HTMLElement | null>(null);
  const [focused, setFocused] = useState(false);
  const colorRef = useRef<HTMLInputElement | null>(null);

  const meaningfulRich = looksLikeMeaningfulRichHtml(val);
  const staleStructuralHtml = !meaningfulRich && typeof val === 'string' && /<[^>]+>/.test(val);
  const viewClass = [className, !meaningfulRich ? 'whitespace-pre-wrap' : ''].filter(Boolean).join(' ');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!editMode || !can('content.strings.write')) return;
    if (document.activeElement === el) return;
    if (meaningfulRich) {
      const safe = sanitizeCmsHtml(val);
      if (el.innerHTML !== safe) el.innerHTML = safe;
    } else if (staleStructuralHtml) {
      const plain = cmsHtmlToPlainText(val);
      if (el.innerText !== plain) el.textContent = plain;
    } else if (el.innerText !== val) {
      el.textContent = val;
    }
  }, [val, editMode, can, meaningfulRich, staleStructuralHtml]);

  const flushPatch = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    patchFromEditable(el, contentKey, patchKey);
  }, [contentKey, patchKey]);

  const editClass = [className, 'whitespace-pre-wrap rounded-sm ring-1 ring-amber-400/70 ring-inset'].filter(Boolean).join(' ');

  if (editMode && can('content.strings.write')) {
    return (
      <div className="group/cm-text relative z-[90] block w-full max-w-full text-zinc-900">
        {focused ? (
          <div
            className="absolute bottom-full left-0 z-[100] mb-1 flex flex-wrap items-center gap-1 rounded border border-zinc-400 bg-white px-2 py-1.5 text-xs text-zinc-900 shadow-lg"
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="text-zinc-500">Opmaak</span>
            <button
              type="button"
              className="min-h-8 min-w-8 rounded border border-zinc-400 bg-zinc-100 px-2 text-lg font-bold leading-none text-zinc-900 hover:bg-zinc-200"
              title="Selectie groter"
              aria-label="Tekst groter"
              onClick={() => {
                applyRelativeFontSize(1.15);
                flushPatch();
              }}
            >
              +
            </button>
            <button
              type="button"
              className="min-h-8 min-w-8 rounded border border-zinc-400 bg-zinc-100 px-2 text-lg font-bold leading-none text-zinc-900 hover:bg-zinc-200"
              title="Selectie kleiner"
              aria-label="Tekst kleiner"
              onClick={() => {
                applyRelativeFontSize(0.88);
                flushPatch();
              }}
            >
              −
            </button>
            <label className="flex cursor-pointer items-center gap-1 rounded border border-zinc-400 bg-zinc-50 px-1.5 py-0.5 hover:bg-zinc-100">
              <span className="text-[11px] text-zinc-600">Kleur</span>
              <input
                ref={colorRef}
                type="color"
                className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                defaultValue="#6f121b"
                onChange={(e) => {
                  const c = e.target.value;
                  try {
                    document.execCommand('styleWithCSS', false, 'true');
                    document.execCommand('foreColor', false, c);
                  } catch {
                    /* ignore */
                  }
                  flushPatch();
                }}
              />
            </label>
            <span className="text-[10px] text-zinc-500">Enter = nieuwe regel</span>
          </div>
        ) : null}
        {createElement(as, {
          ...rest,
          ref,
          'data-cm-text': contentKey,
          className: editClass,
          contentEditable: true,
          suppressContentEditableWarning: true,
          onFocus: () => setFocused(true),
          onBlur: () => {
            setFocused(false);
            flushPatch();
          },
          onInput: (e: FormEvent<HTMLElement>) => patchFromEditable(e.target as HTMLElement, contentKey, patchKey),
        })}
      </div>
    );
  }

  if (meaningfulRich) {
    const safe = sanitizeCmsHtml(val);
    return createElement(as, {
      ...rest,
      className: viewClass,
      suppressHydrationWarning: true,
      dangerouslySetInnerHTML: { __html: safe },
    });
  }

  if (staleStructuralHtml) {
    return createElement(as, { ...rest, className: viewClass }, cmsHtmlToPlainText(val));
  }

  return createElement(as, { ...rest, className: viewClass }, val);
}
