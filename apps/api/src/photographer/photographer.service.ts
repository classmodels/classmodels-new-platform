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
    const from = new Date(Date.now() - 120 * 86400000);
    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: 'portfolio-fotograaf' } });
    const rows = await this.prisma.agendaBooking.findMany({
      where: {
        calendarId: cal.id,
        startAt: { gte: from },
        status: { notIn: ['cancelled', 'cancelled_cm', 'geannuleerd'] },
      },
      orderBy: { startAt: 'desc' },
      take: 300,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    return Promise.all(
      rows.map(async (b) => {
        let fileCount = 0;
        if (folder && b.userId) {
          fileCount = await this.prisma.mediaAsset.count({
            where: { folderId: folder.id, linkedModelUserId: b.userId, hardDeleted: false },
          });
        }
        return {
          id: b.id,
          startAt: b.startAt.toISOString(),
          endAt: b.endAt.toISOString(),
          status: b.status,
          modelUserId: b.userId,
          shootDate: b.startAt.toISOString().slice(0, 10),
          fileCount,
          displayName:
            [b.user?.firstName, b.user?.lastName].filter(Boolean).join(' ').trim() ||
            [b.firstname, b.lastname].filter(Boolean).join(' ').trim() ||
            b.name?.trim() ||
            b.email ||
            '(geen naam)',
        };
      }),
    );
  }

  async upload(
    file: Express.Multer.File,
    photographerId: string,
    folderSlug: string,
    modelUserId?: string,
  ) {
    const isImage = file.mimetype.startsWith('image/');
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      /\.zip$/i.test(file.originalname || '');
    if (!isImage && !isZip) {
      throw new BadRequestException('Alleen foto’s of een ZIP-bestand zijn toegestaan.');
    }
    await this.media.ensureDefaultFolders();
    if (folderSlug !== 'portfolio-fotograaf' && folderSlug !== 'portfolio-divers') {
      throw new BadRequestException('Ongeldige map.');
    }
    if (folderSlug === 'portfolio-fotograaf') {
      if (!modelUserId) throw new BadRequestException('Kies een model voor deze upload.');
      await this.assertModelEligible(modelUserId);
      // Nieuwe levering: oude download-status wissen zodat de knop weer verschijnt.
      await this.prisma.portfolioDeliveryAck.deleteMany({ where: { modelUserId } });
    }
    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: folderSlug } });
    if (!folder) throw new NotFoundException('Mediamap ontbreekt.');

    // Hernoem ZIP naar «Naam class-models.zip»
    let uploadFile = file;
    if (isZip && modelUserId) {
      const u = await this.prisma.user.findUnique({
        where: { id: modelUserId },
        select: { firstName: true, lastName: true, email: true },
      });
      const parts = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
      const base = parts || u?.email?.split('@')[0] || 'model';
      const safe = base.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
      uploadFile = {
        ...file,
        originalname: `${safe} class-models.zip`,
      };
    }

    return this.media.saveFile(uploadFile, photographerId, folder.id, {
      linkedModelUserId: folderSlug === 'portfolio-fotograaf' ? modelUserId : undefined,
    });
  }
}
