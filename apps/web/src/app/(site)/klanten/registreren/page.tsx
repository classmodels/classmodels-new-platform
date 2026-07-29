import type { Metadata } from 'next';
import { KlantRegistrerenForm } from '@/components/nieuw/KlantRegistrerenForm';

export const metadata: Metadata = {
  title: 'Klantenaccount aanmaken',
  description:
    'Maak een Class-Models klantenaccount aan voor uw bedrijf. Vraag castings aan, selecteer modellen en beheer boekingen.',
  alternates: { canonical: '/klanten/registreren' },
};

export default function NieuwKlantRegistrerenPage() {
  return <KlantRegistrerenForm />;
}
