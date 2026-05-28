import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class PortalDownloadsService {
  constructor(
    private prisma: PrismaService,
    private media: MediaService,
  ) {}

  async listAdmin(section = 'model-portal') {
    const rows = await this.prisma.portalDownload.findMany({
      where: { section },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        mediaAsset: {
          select: {
            id: true,
            originalName: true,
            storageKey: true,
            sizeBytes: true,
            mimeType: true,
            folder: { select: { slug: true, label: true } },
          },
        },
      },
    });
    return rows;
  }

  async listForModel(section = 'model-portal') {
    const now = new Date();
    const rows = await this.prisma.portalDownload.findMany({
      where: {
        section,
        active: true,
        OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        mediaAsset: {
          select: {
            id: true,
            originalName: true,
            sizeBytes: true,
            mimeType: true,
            storageKey: true,
          },
        },
      },
    });
    const out = [];
    for (const row of rows) {
      const ok = await this.media.assetKeyExists(row.mediaAsset.storageKey);
      if (!ok) continue;
      out.push({
        id: row.id,
        label: row.label,
        availableFrom: row.availableFrom?.toISOString() ?? null,
        asset: {
          id: row.mediaAsset.id,
          originalName: row.mediaAsset.originalName,
          sizeBytes: row.mediaAsset.sizeBytes,
          mimeType: row.mediaAsset.mimeType,
        },
      });
    }
    return out;
  }

  async create(data: {
    label: string;
    mediaAssetId: string;
    section?: string;
    sortOrder?: number;
    active?: boolean;
    availableFrom?: string | null;
  }) {
    const label = data.label.trim();
    if (!label) throw new BadRequestException('Label is verplicht.');
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: data.mediaAssetId, hardDeleted: false },
    });
    if (!asset) throw new NotFoundException('Mediabestand niet gevonden.');
    const ok = await this.media.assetKeyExists(asset.storageKey);
    if (!ok) {
      throw new BadRequestException('Mediabestand staat niet in opslag (R2/schijf). Upload eerst naar R2.');
    }
    let availableFrom: Date | null = null;
    if (data.availableFrom?.trim()) {
      const d = new Date(data.availableFrom);
      if (!Number.isFinite(d.getTime())) throw new BadRequestException('Ongeldige datum.');
      availableFrom = d;
    }
    return this.prisma.portalDownload.create({
      data: {
        label,
        mediaAssetId: asset.id,
        section: data.section?.trim() || 'model-portal',
        sortOrder: data.sortOrder ?? 0,
        active: data.active !== false,
        availableFrom,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      label: string;
      mediaAssetId: string;
      sortOrder: number;
      active: boolean;
      availableFrom: string | null;
    }>,
  ) {
    const row = await this.prisma.portalDownload.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    const patch: {
      label?: string;
      mediaAssetId?: string;
      sortOrder?: number;
      active?: boolean;
      availableFrom?: Date | null;
    } = {};
    if (data.label !== undefined) {
      const label = data.label.trim();
      if (!label) throw new BadRequestException('Label is verplicht.');
      patch.label = label;
    }
    if (data.mediaAssetId !== undefined) {
      const asset = await this.prisma.mediaAsset.findFirst({
        where: { id: data.mediaAssetId, hardDeleted: false },
      });
      if (!asset) throw new NotFoundException('Mediabestand niet gevonden.');
      patch.mediaAssetId = asset.id;
    }
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.active !== undefined) patch.active = data.active;
    if (data.availableFrom !== undefined) {
      if (!data.availableFrom?.trim()) patch.availableFrom = null;
      else {
        const d = new Date(data.availableFrom);
        if (!Number.isFinite(d.getTime())) throw new BadRequestException('Ongeldige datum.');
        patch.availableFrom = d;
      }
    }
    return this.prisma.portalDownload.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    await this.prisma.portalDownload.delete({ where: { id } });
    return { ok: true };
  }

  async streamForModel(downloadId: string, res: Response) {
    const row = await this.prisma.portalDownload.findFirst({
      where: { id: downloadId, active: true },
      include: { mediaAsset: true },
    });
    if (!row) throw new NotFoundException();
    const now = new Date();
    if (row.availableFrom && now < row.availableFrom) {
      throw new BadRequestException('Deze download is nog niet beschikbaar.');
    }
    await this.media.streamMediaAssetDownload(row.mediaAssetId, res);
  }
}
