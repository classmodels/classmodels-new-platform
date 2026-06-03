'use client';

import { useEffect, useState } from 'react';
import { getApiBase } from '@/lib/api';

/** Laadt actieve plugin-output voor site.head (publiek, geen auth). */
export function PluginHeadInjector() {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const API = getApiBase();
    fetch(`${API}/public/plugins/site-head`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { html?: string } | null) => {
        if (d?.html) setHtml(d.html);
      })
      .catch(() => {});
  }, []);

  if (!html.trim()) return null;

  return <div dangerouslySetInnerHTML={{ __html: html }} suppressHydrationWarning />;
}
