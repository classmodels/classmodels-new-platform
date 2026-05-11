import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ slug: string }>;
};

/** Zelfde inhoud als in het gastenportaal (met zijbalk); oude /content-links blijven werken. */
export default async function ContentContainerPage({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9-]+$/.test(slug)) redirect('/portal/guest');
  redirect(`/portal/guest?content=${encodeURIComponent(slug)}`);
}
