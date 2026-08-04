import type { MetadataRoute } from 'next';

/**
 * Vertelt zoekmachines wat ze mogen crawlen.
 * Zichtbaar op: https://www.class-models.be/robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/__cm_api',
          '/__cm_api/',
          '/account/',
          '/photographer',
          '/gasten/bevestig',
          '/gasten/annuleer',
          '/gasten/testshoot',
          '/modellen/betaling/',
          '/reset-password',
          '/wachtwoord-vergeten',
          '/login',
        ],
      },
    ],
    sitemap: 'https://www.class-models.be/sitemap.xml',
    host: 'https://www.class-models.be',
  };
}
