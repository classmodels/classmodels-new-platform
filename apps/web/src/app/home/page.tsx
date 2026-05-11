import { redirect } from 'next/navigation';

/** Oud modellenplatform vervangen door gastenportaal. */
export default function ModellenPlatformHomePage() {
  redirect('/portal/guest');
}
