'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';

const SESSION_KEY = 'cm_analytics_session';

function getSessionId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Registreert paginaweergaven voor admin-statistieken (niet op /admin). */
export function PageViewTracker() {
  const pathname = usePathname();
  const { user } = useAuth();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (last.current === pathname) return;
    last.current = pathname;

    const path = pathname.split('?')[0] || '/';
    void apiFetch('/analytics/pageview', {
      method: 'POST',
      body: JSON.stringify({
        path,
        sessionId: getSessionId(),
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
        ...(user?.id ? { userId: user.id } : {}),
      }),
    }).catch(() => {
      /* stil falen — stats mogen site niet breken */
    });
  }, [pathname, user?.id]);

  return null;
}
