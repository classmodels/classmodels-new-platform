'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiBase } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

type MenuBlock = {
  id: string;
  slug: string;
  label: string;
  items: { id: string; label: string; href: string }[];
};

export function DynamicNav({
  portal,
  placement = 'top',
}: {
  portal: 'guest' | 'model' | 'client';
  placement?: string;
}) {
  const { token } = useAuth();
  const [menus, setMenus] = useState<MenuBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = new Headers();
    if (token) h.set('Authorization', `Bearer ${token}`);
    setLoading(true);
    fetch(
      `${getApiBase()}/menus/for/${portal}?placement=${encodeURIComponent(placement)}`,
      { headers: h },
    )
      .then(async (r) => {
        if (!r.ok) return [];
        const data: unknown = await r.json();
        if (!Array.isArray(data)) return [];
        return data.filter(
          (m): m is MenuBlock =>
            m != null &&
            typeof m === 'object' &&
            'id' in m &&
            'items' in m &&
            Array.isArray((m as MenuBlock).items),
        );
      })
      .then(setMenus)
      .catch(() => setMenus([]))
      .finally(() => setLoading(false));
  }, [portal, placement, token]);

  if (loading) {
    return (
      <span className="text-[12px] text-white/60" aria-live="polite">
        Menu laden…
      </span>
    );
  }

  if (!menus.length) {
    return (
      <span className="text-[12px] text-white/50" aria-live="polite">
        Geen menu
      </span>
    );
  }

  return (
    <nav className="flex flex-wrap items-center gap-3 text-[13px] text-white/95">
      {menus.flatMap((m) =>
        m.items.map((it) => (
          <Link key={it.id} href={it.href} className="hover:text-white hover:underline">
            {it.label}
          </Link>
        )),
      )}
    </nav>
  );
}
