import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/admin-role.dto';

const MODEL_PORTAL_PERMISSIONS = [
  'portal.model.briefs.read',
  'portal.model.briefs.respond',
  'portal.model.media.read',
  'portal.model.media.upload',
  'portal.model.agenda.read',
  'portal.model.agenda.book',
  'portal.model.history.read',
  'portal.model.push.read',
  'portal.model.push.subscribe',
  'payments.checkout',
];

const SYSTEM_SLUGS = new Set([
  'admin',
  'fotograaf',
  'model',
  'newface',
  'tryout',
  'inactief',
  'client',
  'guest',
  'high-class',
  'verwijderd',
]);

function slugifyRole(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

const VISIBILITY = new Set(['hidden', 'public', 'admin_frontend']);

export function parseCatalogVisibility(raw?: string | null, fallback = 'admin_frontend'): string {
  const v = String(raw || '').trim();
  return VISIBILITY.has(v) ? v : fallback;
}

@Injectable()
export class AdminRolesService {
  constructor(private prisma: PrismaService) {}

  async ensureHighClass() {
    await this.prisma.role.upsert({
      where: { slug: 'high-class' },
      update: { label: 'High class' },
      create: {
        slug: 'high-class',
        label: 'High class',
        description: 'Extra groepering naast Newface en Try-out. Modellen kunnen deze rol extra krijgen.',
        permissions: MODEL_PORTAL_PERMISSIONS,
        catalogVisibility: 'public',
      },
    });
  }

  async ensureVerwijderd() {
    await this.prisma.role.upsert({
      where: { slug: 'verwijderd' },
      update: { label: 'Verwijderd' },
      create: {
        slug: 'verwijderd',
        label: 'Verwijderd',
        description: 'Prullenbak: terugzetten of de map leegmaken (definitief wissen).',
        permissions: [],
        catalogVisibility: 'admin_frontend',
      },
    });
  }

  async list() {
    await this.ensureHighClass();
    await this.ensureVerwijderd();
    return this.prisma.role.findMany({
      orderBy: { slug: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async create(dto: CreateRoleDto) {
    const label = dto.label.trim();
    const slug = slugifyRole(dto.slug?.trim() || label);
    if (!slug) throw new ConflictException('Ongeldige slug voor deze rol.');
    if (SYSTEM_SLUGS.has(slug)) {
      throw new ConflictException('Deze slug is al een vaste systeemrol.');
    }
    const exists = await this.prisma.role.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Er bestaat al een rol met deze slug.');
    const model = await this.prisma.role.findUnique({ where: { slug: 'model' } });
    const permissions =
      model && Array.isArray(model.permissions) && model.permissions.length
        ? (model.permissions as string[])
        : MODEL_PORTAL_PERMISSIONS;
    return this.prisma.role.create({
      data: {
        slug,
        label,
        description: dto.description?.trim() || `Modelgroepering: ${label}`,
        permissions,
        catalogVisibility: parseCatalogVisibility(dto.catalogVisibility, 'admin_frontend'),
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const r = await this.prisma.role.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    return this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.label != null ? { label: dto.label } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.permissions != null ? { permissions: dto.permissions as object } : {}),
        ...(dto.catalogVisibility != null
          ? { catalogVisibility: parseCatalogVisibility(dto.catalogVisibility) }
          : {}),
      },
    });
  }
}
