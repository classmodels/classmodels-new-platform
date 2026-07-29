import type { Metadata } from 'next';
import { NieuwLoginSplit } from '@/components/nieuw/NieuwLoginSplit';

export const metadata: Metadata = {
  title: 'Inloggen als model of klant',
  description:
    'Log in bij Class-Models als model of als klant. Beheer uw modellenportaal of klantenportaal vanuit één omgeving.',
  alternates: { canonical: '/inloggen' },
};

export default function NieuwInloggenPage() {
  return <NieuwLoginSplit />;
}
