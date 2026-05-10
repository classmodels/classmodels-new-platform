'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { DynamicNav } from '@/components/DynamicNav';

export function SiteHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onAdmin = pathname?.startsWith('/admin');

  if (onAdmin) return null;

  const portal: 'guest' | 'model' | 'client' =
    pathname?.startsWith('/portal/model')
      ? 'model'
      : pathname?.startsWith('/portal/client')
        ? 'client'
        : 'guest';

  return (
    <header className="border-b border-line bg-burgundy text-white">
      <div className="mx-auto flex w-full max-w-page flex-col gap-2 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-serif text-lg tracking-tight text-white">
            Class-Models
          </Link>
          <DynamicNav portal={portal} placement="top" />
        </div>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/" className="text-white/90 hover:text-white">
            Beginpagina
          </Link>
          <Link href="/home" className="text-white/90 hover:text-white">
            Modellenplatform
          </Link>
          <Link href="/portal/guest?p=contact" className="text-white/90 hover:text-white">
            Contact
          </Link>
          {!user && (
            <Link href="/login" className="rounded-md bg-white/10 px-3 py-1 text-white hover:bg-white/20">
              Inloggen
            </Link>
          )}
          {user ? (
            <>
              {user.roles.includes('model') ? (
                <Link href="/portal/model" className="text-white/90 hover:text-white">
                  Mijn portaal
                </Link>
              ) : null}
              {user.roles.includes('client') ? (
                <Link href="/portal/client" className="text-white/90 hover:text-white">
                  Klantenportaal
                </Link>
              ) : null}
            </>
          ) : null}
          {user && (
            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/');
                router.refresh();
              }}
              className="text-white/80 hover:text-white"
            >
              Uitloggen
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
