import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ slug: string }>;
};

/** Zelfde inhoud als vroeger in gastenportaal; oude /content-links → nieuwe site. */
export default async function ContentContainerPage({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9-]+$/.test(slug)) redirect('/nieuw');
  redirect('/nieuw');
}
