'use client';

import Link from 'next/link';
import {
  OPEN_MODELLENDAG_BUTTON_LABEL,
  OPEN_MODELLENDAG_ENABLED,
  OPEN_MODELLENDAG_SKIP_KEY,
} from '@/lib/open-modellendag';
import '@/components/open-modellendag.css';

type Props = {
  className?: string;
  block?: boolean;
};

/** Knop op de gewone site om terug te keren naar de Open Modellendag-pagina. */
export function OpenModellendagSiteCta({ className = '', block = false }: Props) {
  if (!OPEN_MODELLENDAG_ENABLED) return null;

  return (
    <Link
      href="/?omd=1"
      className={`omd-cta-site ${block ? 'omd-cta-site--block' : ''} ${className}`.trim()}
      onClick={() => {
        try {
          sessionStorage.removeItem(OPEN_MODELLENDAG_SKIP_KEY);
        } catch {
          /* ignore */
        }
      }}
    >
      {OPEN_MODELLENDAG_BUTTON_LABEL}
    </Link>
  );
}
