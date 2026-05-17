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
import { readContentEditableValue } from '@/lib/cm-text-persist';
import { cmsHtmlToPlainText, looksLikeMeaningfulRichHtml, sanitizeCmsHtml } from '@/lib/sanitize-cms-html';

type CmTextProps = {
  contentKey: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  fallback?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>;

function cloneSelectionRange(): Range | null {
  if (typeof window === 'undefined') return null;
  const sel = window.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return null;
  return sel.getRangeAt(0).cloneRange();
}

function restoreSelectionRange(r: Range | null, focusEl: HTMLElement | null) {
  if (!r || !focusEl) return;
  focusEl.focus();
  const sel = window.getSelection();
  if (!sel) return;
  try {
    sel.removeAllRanges();
    sel.addRange(r);
  } catch {
    /* range buiten document */
  }
}

function wrapSelectionWithSpan(opts: { color?: string; fontSize?: string }) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  const span = document.createElement('span');
  if (opts.color) span.style.color = opts.color;
  if (opts.fontSize) span.style.fontSize = opts.fontSize;
  try {
    range.surroundContents(span);
  } catch {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
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

const BLOCK_EDIT_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li']);

export function CmText({ contentKey, as = 'span', className, fallback = '', ...rest }: CmTextProps) {
  const { byKey, editMode, patchKey, patchKeyImmediate } = useContent();
  const { can } = useAuth();
  const hasKey = Object.prototype.hasOwnProperty.call(byKey, contentKey);
  const val = hasKey ? (byKey[contentKey] ?? '') : fallback;
  const ref = useRef<HTMLElement | null>(null);
  const [focused, setFocused] = useState(false);
  const colorRangeRef = useRef<Range | null>(null);

  const meaningfulRich = looksLikeMeaningfulRichHtml(val);
  const staleStructuralHtml = !meaningfulRich && typeof val === 'string' && /<[^>]+>/.test(val);
  const viewClass = [className, !meaningfulRich ? 'whitespace-pre-wrap' : ''].filter(Boolean).join(' ');

  const editTag: 'div' | 'span' = BLOCK_EDIT_TAGS.has(as) ? 'div' : 'span';

  const headingRole: Record<string, unknown> =
    as === 'h1'
      ? { role: 'heading', 'aria-level': 1 }
      : as === 'h2'
        ? { role: 'heading', 'aria-level': 2 }
        : as === 'h3'
          ? { role: 'heading', 'aria-level': 3 }
          : as === 'h4'
            ? { role: 'heading', 'aria-level': 4 }
            : as === 'h5'
              ? { role: 'heading', 'aria-level': 5 }
              : as === 'h6'
                ? { role: 'heading', 'aria-level': 6 }
                : {};

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
    void patchKeyImmediate(contentKey, readContentEditableValue(el));
  }, [contentKey, patchKeyImmediate]);

  const editClass = [className, 'whitespace-pre-wrap rounded-sm ring-1 ring-amber-400/70 ring-inset'].filter(Boolean).join(' ');

  if (editMode && can('content.strings.write')) {
    return (
      <div className="group/cm-text relative z-[90] block w-full max-w-full text-zinc-900">
        {focused ? (
          <div className="absolute bottom-full left-0 z-[100] mb-1 flex flex-wrap items-center gap-1 rounded border border-zinc-400 bg-white px-2 py-1.5 text-xs text-zinc-900 shadow-lg">
            <span className="text-zinc-500">Opmaak</span>
            <button
              type="button"
              className="min-h-8 min-w-8 rounded border border-zinc-400 bg-zinc-100 px-2 text-lg font-bold leading-none text-zinc-900 hover:bg-zinc-200"
              title="Selectie groter"
              aria-label="Tekst groter"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
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
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
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
                type="color"
                className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                defaultValue="#6f121b"
                onPointerDown={() => {
                  colorRangeRef.current = cloneSelectionRange();
                }}
                onChange={(e) => {
                  const c = e.target.value;
                  const el = ref.current;
                  restoreSelectionRange(colorRangeRef.current, el);
                  wrapSelectionWithSpan({ color: c });
                  colorRangeRef.current = null;
                  flushPatch();
                }}
              />
            </label>
            <span className="text-[10px] text-zinc-500">Enter = nieuwe regel</span>
          </div>
        ) : null}
        {createElement(editTag, {
          ...rest,
          ...headingRole,
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
          onInput: (e: FormEvent<HTMLElement>) => {
            const el = e.target as HTMLElement;
            void patchKey(contentKey, readContentEditableValue(el));
          },
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
