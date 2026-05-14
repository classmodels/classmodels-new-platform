import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class PhotographerService {
  constructor(
    private prisma: PrismaService,
    private media: MediaService,
  ) {}

  async assertModelEligible(modelUserId: string) {
    const role = await this.prisma.userRole.findFirst({
      where: {
        userId: modelUserId,
        role: { slug: { in: ['model', 'newface', 'tryout', 'inactief'] } },
      },
    });
    if (!role) throw new BadRequestException('Dit account is geen model in het systeem.');
  }

  async listPortfolioBookings() {
    await this.media.ensureDefaultFolders();
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { slug: 'portfolio' } });
    if (!cal) return [];
    const from = new Date(Date.now() - 14 * 86400000);
    const rows = await this.prisma.agendaBooking.findMany({
      where: { calendarId: cal.id, startAt: { gte: from } },
      orderBy: { startAt: 'asc' },
      take: 150,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    return rows.map((b) => ({
      id: b.id,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      status: b.status,
      modelUserId: b.userId,
      displayName:
        [b.user?.firstName, b.user?.lastName].filter(Boolean).join(' ').trim() ||
        [b.firstname, b.lastname].filter(Boolean).join(' ').trim() ||
        b.name?.trim() ||
        b.email ||
        '(geen naam)',
    }));
  }

  async upload(
    file: Express.Multer.File,
    photographerId: string,
    folderSlug: string,
    modelUserId?: string,
  ) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Alleen afbeeldingen zijn toegestaan.');
    }
    await this.media.ensureDefaultFolders();
    if (folderSlug !== 'portfolio-fotograaf' && folderSlug !== 'portfolio-divers') {
      throw new BadRequestException('Ongeldige map.');
    }
    if (folderSlug === 'portfolio-fotograaf') {
      if (!modelUserId) throw new BadRequestException('Kies een model (modelUserId) voor deze map.');
      await this.assertModelEligible(modelUserId);
    }
    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: folderSlug } });
    if (!folder) throw new NotFoundException('Mediamap ontbreekt.');
    return this.media.saveFile(file, photographerId, folder.id, {
      linkedModelUserId: folderSlug === 'portfolio-fotograaf' ? modelUserId : undefined,
    });
  }
}
