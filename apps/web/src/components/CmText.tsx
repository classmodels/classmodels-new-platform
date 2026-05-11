'use client';

import {
  createElement,
  useEffect,
  useRef,
  type FormEvent,
  type HTMLAttributes,
  type JSX,
} from 'react';
import { useAuth } from '@/context/auth-context';
import { useContent } from '@/context/content-context';

type CmTextProps = {
  contentKey: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  fallback?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>;

export function CmText({ contentKey, as = 'span', className, fallback = '', ...rest }: CmTextProps) {
  const { byKey, editMode, patchKey } = useContent();
  const { can } = useAuth();
  const hasKey = Object.prototype.hasOwnProperty.call(byKey, contentKey);
  const val = hasKey ? (byKey[contentKey] ?? '') : fallback;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!editMode || !can('content.strings.write')) return;
    if (document.activeElement === el) return;
    if (el.textContent !== val) el.textContent = val;
  }, [val, editMode, can]);

  const editClass = [className, 'rounded-sm ring-1 ring-amber-400/70 ring-inset'].filter(Boolean).join(' ');

  if (editMode && can('content.strings.write')) {
    return createElement(as, {
      ...rest,
      ref,
      className: editClass,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onInput: (e: FormEvent<HTMLElement>) =>
        patchKey(contentKey, (e.target as HTMLElement).innerText),
    });
  }

  return createElement(as, { ...rest, className }, val);
}
