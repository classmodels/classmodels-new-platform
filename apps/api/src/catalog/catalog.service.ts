import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

const ROLE_MODEL = 'model';
const ROLE_NEWFACE = 'newface';
const ROLE_TRYOUT = 'tryout';
const ROLE_INACTIEF = 'inactief';

function roleSlugs(u: { roles: { role: { slug: string } }[] }): string[] {
  return u.roles.map((r) => r.role.slug);
}

function hasRole(slugs: string[], slug: string): boolean {
  return slugs.includes(slug);
}

function ageFromGeboorte(raw: unknown): number | null {
  if (raw == null || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 120 ? a : null;
}

function normGender(raw: unknown): '' | 'man' | 'vrouw' {
  if (Array.isArray(raw)) {
    for (const x of raw) {
      const g = normGender(x);
      if (g) return g;
    }
    return '';
  }
  if (typeof raw !== 'string') return '';
  const g = raw.trim().toLowerCase();
  if (g === 'man' || g === 'm' || g === '1') return 'man';
  if (g === 'vrouw' || g === 'v' || g === '2') return 'vrouw';
  return '';
}

function beschikbaarList(ms: Record<string, unknown> | null): string[] {
  if (!ms || !Array.isArray(ms.beschikbaar)) return [];
  return ms.beschikbaar.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
}

/** Fiche-velden voor modaal / print; admin krijgt ook GSM-lijnen. */
function catalogSheetPayload(
  ms: Record<string, unknown> | null,
  phone: string | null,
  mode: 'admin' | 'member' | 'none',
): Record<string, unknown> | undefined {
  if (mode === 'none') return undefined;
  const base: Record<string, unknown> = {
    gemeente: ms?.gemeente,
    nationaliteit: ms?.nationaliteit,
    geboortedatum: ms?.geboortedatum,
    straat: ms?.straat,
    postcode: ms?.postcode,
    land: ms?.land,
    lengte: ms?.lengte,
    maat: ms?.maat,
    schoenmaat: ms?.schoenmaat,
    bhMaat: ms?.bhMaat,
    borstomtrek: ms?.borstomtrek,
    confectiemaat: ms?.confectiemaat,
    heupomtrek: ms?.heupomtrek,
    jeansmaat: ms?.jeansmaat,
    taille: ms?.taille,
    haarkleur: ms?.haarkleur,
    kleurOgen: ms?.kleurOgen,
    overMij: ms?.overMij,
    ervaringen: ms?.ervaringen,
  };
  if (mode === 'admin') {
    base.gsmModel = ms?.gsmModel ?? phone;
    base.gsmMoeder = ms?.gsmMoeder;
    base.gsmVader = ms?.gsmVader;
  }
  return base;
}

function publicDisplayName(
  first: string | null | undefined,
  last: string | null | undefined,
  isAdmin: boolean,
): string {
  const fn = (first ?? '').trim();
  const ln = (last ?? '').trim();
  if (isAdmin) return `${fn} ${ln}`.trim() || fn || 'Model';
  if (!fn) return 'Model';
  if (!ln) return fn;
  return `${fn} ${ln.charAt(0)}.`;
}

@Injectable()
export class CatalogService {
  constructor(
    private prisma: PrismaService,
    private media: MediaService,
  ) {}

  async listModels(viewer?: { sub: string; roles: string[] }) {
    const isAdmin = !!viewer?.roles?.includes('admin');
    const adminId = viewer?.sub;

    const favSet = new Set<string>();
    if (isAdmin && adminId) {
      const favs = await this.prisma.modelAdminFavorite.findMany({
        where: { adminUserId: adminId },
        select: { modelUserId: true },
      });
      for (const f of favs) favSet.add(f.modelUserId);
    }

    const rows = await this.prisma.user.findMany({
      where: {
        status: 'active',
        roles: {
          some: {
            role: { slug: { in: [ROLE_MODEL, ROLE_NEWFACE, ROLE_TRYOUT, ROLE_INACTIEF] } },
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        modelSheet: true,
        profilePhoto: {
          select: { storageKey: true, webpKey: true, thumbKey: true, mimeType: true },
        },
        /** Fallback als er geen profilePhotoAssetId is maar wél uploads in Modellen (zelfde als profiel-slides). */
        mediaAssets: {
          where: {
            hardDeleted: false,
            mimeType: { startsWith: 'image/' },
            folder: { slug: 'models' },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { storageKey: true, webpKey: true, thumbKey: true, mimeType: true },
        },
        roles: { include: { role: { select: { slug: true } } } },
      },
    });

    // Postgres ORDER BY is hoofdlettergevoelig; alleen kleine letters in voornaam komen dan ver
    // na namen met hoofdletter — waardoor een model "weg" lijkt tussen Aaa en Alexandra.
    rows.sort((a, b) => {
      const fa = (a.firstName ?? '').trim();
      const fb = (b.firstName ?? '').trim();
      const c = fa.localeCompare(fb, 'nl', { sensitivity: 'base' });
      if (c !== 0) return c;
      const la = (a.lastName ?? '').trim();
      const lb = (b.lastName ?? '').trim();
      return la.localeCompare(lb, 'nl', { sensitivity: 'base' });
    });

    const authenticated = !!viewer?.sub;

    return rows.map((u) => {
      const ms = (u.modelSheet && typeof u.modelSheet === 'object' && !Array.isArray(u.modelSheet)
        ? (u.modelSheet as Record<string, unknown>)
        : null) ?? null;
      const slugs = roleSlugs(u);
      const inactive = hasRole(slugs, ROLE_INACTIEF);
      const newface = hasRole(slugs, ROLE_NEWFACE);
      const tryout = hasRole(slugs, ROLE_TRYOUT);
      const fallbackAsset = u.mediaAssets?.[0];
      const thumbKey =
        u.profilePhoto != null
          ? this.media.resolvePublicFilename(u.profilePhoto)
          : fallbackAsset != null
            ? this.media.resolvePublicFilename(fallbackAsset)
            : null;
      const sheetMode: 'admin' | 'member' | 'none' = isAdmin ? 'admin' : authenticated ? 'member' : 'none';
      return {
        id: u.id,
        email: isAdmin ? u.email : undefined,
        displayName: publicDisplayName(u.firstName, u.lastName, isAdmin),
        ...(authenticated ? { firstName: u.firstName, lastName: u.lastName } : {}),
        age: ageFromGeboorte(ms?.geboortedatum),
        gender: normGender(ms?.geslacht),
        beschikbaar: beschikbaarList(ms),
        beschikbaarSlugs: beschikbaarList(ms).map((b) =>
          b
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-'),
        ),
        profileThumbKey: thumbKey,
        isNewface: newface,
        isTryout: tryout,
        isInactive: inactive,
        isFavorite: isAdmin ? favSet.has(u.id) : false,
        sheet: catalogSheetPayload(ms, u.phone, sheetMode),
      };
    });
  }

  async assertAdmin(userId: string, roles: string[]) {
    if (!roles.includes('admin')) throw new ForbiddenException();
    const ok = await this.prisma.user.findFirst({
      where: { id: userId, roles: { some: { role: { slug: 'admin' } } } },
      select: { id: true },
    });
    if (!ok) throw new ForbiddenException();
  }

  async toggleFavorite(adminId: string, roles: string[], modelUserId: string) {
    await this.assertAdmin(adminId, roles);
    const model = await this.prisma.user.findUnique({ where: { id: modelUserId }, select: { id: true } });
    if (!model) throw new NotFoundException();
    const ex = await this.prisma.modelAdminFavorite.findUnique({
      where: { adminUserId_modelUserId: { adminUserId: adminId, modelUserId } },
    });
    if (ex) {
      await this.prisma.modelAdminFavorite.delete({ where: { id: ex.id } });
      return { favorited: false };
    }
    await this.prisma.modelAdminFavorite.create({
      data: { adminUserId: adminId, modelUserId },
    });
    return { favorited: true };
  }

  private async roleIds() {
    const slugs = [ROLE_MODEL, ROLE_NEWFACE, ROLE_TRYOUT, ROLE_INACTIEF] as const;
    const rows = await this.prisma.role.findMany({
      where: { slug: { in: [...slugs] } },
      select: { id: true, slug: true },
    });
    const m = new Map(rows.map((r) => [r.slug, r.id]));
    for (const s of slugs) {
      if (!m.has(s)) throw new BadRequestException(`Rol "${s}" ontbreekt. Run prisma seed.`);
    }
    return {
      model: m.get(ROLE_MODEL)!,
      newface: m.get(ROLE_NEWFACE)!,
      tryout: m.get(ROLE_TRYOUT)!,
      inactief: m.get(ROLE_INACTIEF)!,
    };
  }

  async setModelFlags(
    adminId: string,
    roles: string[],
    modelUserId: string,
    body: { inactive?: boolean; newface?: boolean; tryout?: boolean },
  ) {
    await this.assertAdmin(adminId, roles);
    const user = await this.prisma.user.findUnique({
      where: { id: modelUserId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException();
    const ids = await this.roleIds();

    const s = new Set(roleSlugs(user));

    if (body.inactive === true) {
      s.clear();
      s.add(ROLE_INACTIEF);
    } else {
      if (body.inactive === false) {
        s.delete(ROLE_INACTIEF);
        s.add(ROLE_MODEL);
      }
      if (!s.has(ROLE_INACTIEF)) {
        if (body.newface === true) {
          s.add(ROLE_MODEL);
          s.add(ROLE_NEWFACE);
          s.delete(ROLE_TRYOUT);
        }
        if (body.newface === false) s.delete(ROLE_NEWFACE);
        if (body.tryout === true) {
          s.add(ROLE_MODEL);
          s.add(ROLE_TRYOUT);
          s.delete(ROLE_NEWFACE);
        }
        if (body.tryout === false) s.delete(ROLE_TRYOUT);
      }
    }

    if (!s.has(ROLE_INACTIEF) && !s.has(ROLE_MODEL) && !s.has(ROLE_NEWFACE) && !s.has(ROLE_TRYOUT)) {
      s.add(ROLE_MODEL);
    }

    const want = [...s].filter((slug) =>
      [ROLE_MODEL, ROLE_NEWFACE, ROLE_TRYOUT, ROLE_INACTIEF].includes(slug),
    );

    await this.prisma.userRole.deleteMany({ where: { userId: modelUserId } });
    await this.prisma.userRole.createMany({
      data: want.map((slug) => ({
        userId: modelUserId,
        roleId:
          slug === ROLE_MODEL
            ? ids.model
            : slug === ROLE_NEWFACE
              ? ids.newface
              : slug === ROLE_TRYOUT
                ? ids.tryout
                : ids.inactief,
      })),
    });

    return this.prisma.user.findUnique({
      where: { id: modelUserId },
      select: { id: true, roles: { include: { role: { select: { slug: true } } } } },
    });
  }
}
