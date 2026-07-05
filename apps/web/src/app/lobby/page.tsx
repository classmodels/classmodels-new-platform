import { BeginEnterRoute } from '@/components/BeginEnterRoute';

/**
 * Oude enterpagina (lobby met deuren, login en registratie) — in afwachting bereikbaar
 * via de liftknoppen Modellen-/Klantenportaal op de nieuwe beginpagina.
 * `?tab=model` of `?tab=client` opent meteen het juiste loginscherm.
 */
export default function LobbyPage() {
  return <BeginEnterRoute />;
}
