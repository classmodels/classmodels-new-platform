import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_LOCALE = 'nl';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  private normLocale(locale?: string) {
    const l = (locale || DEFAULT_LOCALE).trim().toLowerCase();
    return l === 'fr' || l === 'en' ? l : DEFAULT_LOCALE;
  }

  /** Publiek: strings voor één taal, met NL-fallback voor ontbrekende sleutels. */
  async listStrings(locale?: string) {
    const loc = this.normLocale(locale);
    const [primary, fallback] = await Promise.all([
      this.prisma.contentString.findMany({
        where: { locale: loc },
        orderBy: { key: 'asc' },
      }),
      loc === DEFAULT_LOCALE
        ? Promise.resolve([])
        : this.prisma.contentString.findMany({
            where: { locale: DEFAULT_LOCALE },
            orderBy: { key: 'asc' },
          }),
    ]);
    const map = new Map<string, (typeof primary)[0]>();
    for (const r of fallback) map.set(r.key, r);
    for (const r of primary) map.set(r.key, r);
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  async patchString(key: string, value: string, userId: string, locale?: string) {
    const loc = this.normLocale(locale);
    const row = await this.prisma.contentString.findUnique({
      where: { key_locale: { key, locale: loc } },
    });
    if (!row) throw new NotFoundException('Onbekende sleutel');
    return this.prisma.contentString.update({
      where: { key_locale: { key, locale: loc } },
      data: { value, updatedById: userId },
    });
  }

  async createString(
    key: string,
    value: string,
    userId: string,
    portal?: import('@prisma/client').Portal,
    locale?: string,
  ) {
    const loc = this.normLocale(locale);
    const exists = await this.prisma.contentString.findUnique({
      where: { key_locale: { key, locale: loc } },
    });
    if (exists) throw new ConflictException('Sleutel bestaat al');
    return this.prisma.contentString.create({
      data: {
        key,
        value,
        locale: loc,
        portal: portal ?? undefined,
        updatedById: userId,
      },
    });
  }

  async removeString(key: string, locale?: string) {
    const loc = this.normLocale(locale);
    const row = await this.prisma.contentString.findUnique({
      where: { key_locale: { key, locale: loc } },
    });
    if (!row) throw new NotFoundException();
    await this.prisma.contentString.delete({
      where: { key_locale: { key, locale: loc } },
    });
    return { ok: true };
  }
}
