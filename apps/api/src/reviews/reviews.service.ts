import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { rebrandStreetModelsInReviews } from './seed-legacy-reviews';

@Injectable()
export class ReviewsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const r = await rebrandStreetModelsInReviews(this.prisma);
      if (r.updated > 0) {
        console.log(`[reviews] Street Models → Class-Models in ${r.updated} review(s)`);
      }
    } catch (e) {
      console.warn(
        '[reviews] Rebrand Street Models overgeslagen:',
        e instanceof Error ? e.message : e,
      );
    }
  }

  listPublic() {
    return this.prisma.review.findMany({
      where: { approved: true, visible: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  listAdmin() {
    return this.prisma.review.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(data: {
    title: string;
    body: string;
    authorName?: string;
    rating?: number;
    sortOrder?: number;
    approved?: boolean;
    visible?: boolean;
  }) {
    return this.prisma.review.create({
      data: {
        title: data.title,
        body: data.body,
        authorName: data.authorName,
        rating: data.rating,
        sortOrder: data.sortOrder ?? 0,
        approved: data.approved ?? false,
        visible: data.visible ?? true,
      },
    });
  }

  /** Review vanuit modellenportaal — direct zichtbaar voor iedereen. */
  async createFromModel(
    authorName: string,
    data: { title: string; body: string; rating?: number },
  ) {
    const max = await this.prisma.review.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (max._max.sortOrder ?? 0) + 1;
    return this.prisma.review.create({
      data: {
        title: data.title.trim(),
        body: data.body.trim(),
        authorName: authorName.trim() || 'Model',
        rating: data.rating ?? 5,
        sortOrder,
        approved: true,
        visible: true,
      },
    });
  }

  /** Bezoekersreview — wacht op goedkeuring voor publicatie. */
  async createFromGuest(data: {
    authorName: string;
    title: string;
    body: string;
    rating?: number;
  }) {
    const max = await this.prisma.review.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (max._max.sortOrder ?? 0) + 1;
    return this.prisma.review.create({
      data: {
        title: data.title.trim(),
        body: data.body.trim(),
        authorName: data.authorName.trim() || 'Bezoeker',
        rating: data.rating ?? 5,
        sortOrder,
        approved: false,
        visible: true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      body: string;
      authorName: string | null;
      rating: number | null;
      sortOrder: number;
      approved: boolean;
      visible: boolean;
    }>,
  ) {
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    return this.prisma.review.update({ where: { id }, data });
  }

  async remove(id: string) {
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    await this.prisma.review.delete({ where: { id } });
    return { ok: true };
  }
}
