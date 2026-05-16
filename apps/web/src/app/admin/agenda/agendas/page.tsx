import { redirect } from 'next/navigation';

/** Oude route: alles staat onder «Agenda». */
export default function AdminAgendasRedirectPage() {
  redirect('/admin/agenda');
}
