import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Response } from 'express';
import archiver from 'archiver';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import type { TestshootFeedbackDto } from './dto/testshoot-feedback.dto';

const ZIP_SIG_SECONDS = 900;

@Injectable()
export class TestshootService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  private zipSecret(): string {
    return (
      process.env.TESTSHOOT_ZIP_SECRET ||
      process.env.JWT_SECRET ||
      'dev-testshoot-zip-secret-change-me'
    );
  }

  signZipDownload(modelId: string): { exp: number; sig: string } {
    const exp = Math.floor(Date.now() / 1000) + ZIP_SIG_SECONDS;
    const msg = `${modelId}:${exp}`;
    const sig = createHmac('sha256', this.zipSecret()).update(msg).digest('base64url');
    return { exp, sig };
  }

  verifyZipDownload(modelId: string, exp: number, sig: string): boolean {
    if (!sig || !Number.isFinite(exp)) return false;
    if (Math.floor(Date.now() / 1000) > exp) return false;
    const expected = createHmac('sha256', this.zipSecret())
      .update(`${modelId}:${exp}`)
      .digest('base64url');
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(sig);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  async listPublic() {
    const models = await this.prisma.testshootModel.findMany({
      where: { archived: false },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        photos: {
          where: { asset: { hardDeleted: false } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { asset: true },
        },
      },
    });
    return models.map((m) => ({
      id: m.id,
      name: m.name,
      downloadUnlocked: m.downloadUnlocked,
      photos: m.photos.map((p) => ({
        id: p.id,
        thumbFile: p.asset.thumbKey ?? p.asset.webpKey ?? p.asset.storageKey,
        fullFile: p.asset.webpKey ?? p.asset.storageKey,
      })),
    }));
  }

  async requestDownloadToken(modelId: string) {
    const model = await this.prisma.testshootModel.findFirst({
      where: { id: modelId, archived: false },
      include: {
        photos: { where: { asset: { hardDeleted: false } } },
      },
    });
    if (!model) throw new NotFoundException();
    if (model.photos.length === 0) throw new BadRequestException('Geen foto’s voor dit model.');
    if (!model.downloadUnlocked) {
      throw new ForbiddenException('NEED_FEEDBACK');
    }
    return this.signZipDownload(modelId);
  }

  async submitFeedback(modelId: string, dto: TestshootFeedbackDto, ip: string | undefined) {
    const model = await this.prisma.testshootModel.findFirst({
      where: { id: modelId, archived: false },
      include: {
        photos: { where: { asset: { hardDeleted: false } } },
      },
    });
    if (!model) throw new NotFoundException();
    if (model.photos.length === 0) throw new BadRequestException('Geen foto’s om te downloaden.');

    const ing = dto.ingeschreven.trim();
    if (ing === 'Nee') {
      const r = (dto.reden_nee_vrij ?? '').trim();
      if (!r) throw new BadRequestException('Vul de reden in bij “Nee” op ingeschreven.');
    }

    const payload: Prisma.InputJsonValue = {
      naam: dto.naam.trim(),
      voornaam: dto.voornaam.trim(),
      email: dto.email.trim().toLowerCase(),
      gsm: dto.gsm.trim(),
      ervaring: dto.ervaring,
      tevredenheid_fotos: dto.tevredenheid_fotos,
      ingeschreven: dto.ingeschreven,
      druk: dto.druk,
      ontvangst: dto.ontvangst,
      info: dto.info,
      toekomst_contact: dto.toekomst_contact,
      reden_nee_vrij: dto.reden_nee_vrij?.trim() ?? '',
      opmerkingen: dto.opmerkingen?.trim() ?? '',
      time: new Date().toISOString(),
      ip: ip ?? '',
    };

    await this.prisma.$transaction([
      this.prisma.testshootFeedback.create({
        data: { modelId, payload, ip: ip ?? null },
      }),
      this.prisma.testshootModel.update({
        where: { id: modelId },
        data: { downloadUnlocked: true, unlockedAt: new Date() },
      }),
    ]);

    return this.signZipDownload(modelId);
  }

  async streamZipToResponse(modelId: string, exp: number, sig: string, res: Response) {
    if (!this.verifyZipDownload(modelId, exp, sig)) {
      throw new ForbiddenException('Ongeldige of verlopen downloadlink.');
    }
    const model = await this.prisma.testshootModel.findFirst({
      where: { id: modelId, archived: false },
      include: {
        photos: {
          where: { asset: { hardDeleted: false } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { asset: true },
        },
      },
    });
    if (!model || model.photos.length === 0) throw new NotFoundException();

    const root = this.media.root();
    const safeName = model.name.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'testshoot';
    const filename = `${safeName}-fotos.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', () => {
      try {
        res.end();
      } catch {
        /* ignore */
      }
    });

    await new Promise<void>((resolve, reject) => {
      archive.on('error', reject);
      archive.on('end', () => resolve());
      archive.pipe(res);
      for (const p of model.photos) {
        const key = p.asset.storageKey;
        const full = join(root, key);
        if (existsSync(full)) {
          archive.append(createReadStream(full), {
            name: p.asset.originalName || basename(key),
          });
        }
      }
      void archive.finalize();
    });
  }

  /** --- Admin --- */

  async adminList() {
    return this.prisma.testshootModel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { photos: true, feedbacks: true } },
      },
    });
  }

  async adminCreateModel(name?: string) {
    const last = await this.prisma.testshootModel.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = (last?.sortOrder ?? 0) + 1;
    return this.prisma.testshootModel.create({
      data: {
        name: name?.trim() || `Model ${sortOrder + 1}`,
        sortOrder,
        archived: false,
      },
    });
  }

  async adminRename(id: string, name: string) {
    await this.prisma.testshootModel.update({
      where: { id },
      data: { name: name.trim().slice(0, 120) || 'Model' },
    });
    return this.prisma.testshootModel.findUnique({ where: { id } });
  }

  async adminAddPhotos(modelId: string, files: Express.Multer.File[], userId: string) {
    const model = await this.prisma.testshootModel.findFirst({ where: { id: modelId } });
    if (!model) throw new NotFoundException();

    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: 'testshoot' } });
    const last = await this.prisma.testshootPhoto.findFirst({
      where: { modelId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    let order = (last?.sortOrder ?? 0) + 1;

    let added = 0;
    for (const file of files) {
      const asset = await this.media.saveFile(file, userId, folder?.id ?? undefined);
      await this.prisma.testshootPhoto.create({
        data: { modelId, assetId: asset.id, sortOrder: order++ },
      });
      added += 1;
    }
    return { added };
  }

  async adminClearPhotos(modelId: string) {
    const photos = await this.prisma.testshootPhoto.findMany({
      where: { modelId },
      select: { assetId: true },
    });
    for (const p of photos) {
      await this.media.removeAsset(p.assetId, true);
    }
    await this.prisma.testshootModel.update({
      where: { id: modelId },
      data: { downloadUnlocked: false, unlockedAt: null },
    });
    return { removed: photos.length };
  }

  async adminArchiveModel(modelId: string) {
    await this.adminClearPhotos(modelId);
    await this.prisma.testshootFeedback.deleteMany({ where: { modelId } });
    await this.prisma.testshootModel.update({
      where: { id: modelId },
      data: { archived: true, downloadUnlocked: false, unlockedAt: null },
    });
    return { ok: true };
  }

  async adminListFeedback(modelId: string) {
    return this.prisma.testshootFeedback.findMany({
      where: { modelId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminDeleteFeedback(feedbackId: string) {
    await this.prisma.testshootFeedback.delete({ where: { id: feedbackId } });
    return { ok: true };
  }

  async adminModelDetail(modelId: string) {
    const model = await this.prisma.testshootModel.findFirst({
      where: { id: modelId },
      include: {
        photos: {
          where: { asset: { hardDeleted: false } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { asset: true },
        },
      },
    });
    if (!model) throw new NotFoundException();
    return model;
  }
}
