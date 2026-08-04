import type { MetadataRoute } from 'next';

const SITE = 'https://www.class-models.be';

/** Publieke pagina’s die Google mag indexeren. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: { path: string; changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency']; priority: number }[] = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/gasten/model-worden', changeFrequency: 'weekly', priority: 0.95 },
    { path: '/gasten/gratis-fotoshoot', changeFrequency: 'weekly', priority: 0.95 },
    { path: '/gasten/casting', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/gasten/intake', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/gasten/faq', changeFrequency: 'monthly', priority: 0.85 },
    { path: '/gasten/doelgroepen', changeFrequency: 'monthly', priority: 0.75 },
    { path: '/gasten/contact', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/reviews', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/klanten', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/modellen', changeFrequency: 'monthly', priority: 0.55 },
    { path: '/inloggen', changeFrequency: 'yearly', priority: 0.3 },
  ];

  return pages.map((p) => ({
    url: `${SITE}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
