import { redirect } from 'next/navigation';

export default function BulkMailSmsRedirectPage() {
  redirect('/admin/communicatie/verzenden');
}
