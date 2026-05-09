'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CmText } from '@/components/CmText';
import { ReviewsSection } from '@/components/ReviewsSection';
import { useAuth } from '@/context/auth-context';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (!user.roles.includes('model') && !user.roles.includes('client')) return;
    if (user.defaultPortal === 'model' && user.roles.includes('model')) {
      router.replace('/portal/model');
    }
    if (user.defaultPortal === 'client' && user.roles.includes('client')) {
      router.replace('/portal/client');
    }
  }, [user, loading, router]);

  return (
    <div className="bg-panel">
      <section className="relative isolate mx-auto max-w-5xl px-4 pb-16 pt-12 md:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 text-center"
        >
          <CmText
            contentKey="home.hero.title"
            as="h1"
            className="font-serif text-4xl tracking-tight text-burgundy md:text-5xl"
          />
          <CmText
            contentKey="home.hero.subtitle"
            as="p"
            className="mt-2 text-sm font-medium uppercase tracking-[0.2em] text-ink/80 md:text-base"
          />
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted">
            Nieuw platform (testomgeving). Design en inhoud volgen de bestaande Class Models-stijl; volledig
            los van WordPress.
          </p>
          <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="relative z-10 cursor-pointer rounded-cm bg-burgundy px-4 py-2 text-sm text-white shadow-sm hover:bg-burgundyDeep"
            >
              Inloggen
            </Link>
            <Link
              href="/portal/guest"
              className="relative z-10 cursor-pointer rounded-cm border border-line bg-white px-4 py-2 text-sm text-ink hover:bg-panel"
            >
              Voor bezoekers
            </Link>
            <Link
              href="/portal/model"
              className="relative z-10 cursor-pointer rounded-cm border border-line bg-white px-4 py-2 text-sm text-ink hover:bg-panel"
            >
              Modellenportaal
            </Link>
          </div>
        </motion.div>
      </section>
      <ReviewsSection />
    </div>
  );
}
