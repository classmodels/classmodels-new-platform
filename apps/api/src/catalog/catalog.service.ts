import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

const ROLE_MODEL = 'model';
const ROLE_NEWFACE = 'newface';
const ROLE_TRYOUT = 'tryout';
const ROLE_INACTIEF = 'inactief';
const ROLE_DELETED = 'verwijderd';
const ROLE_HIGH_CLASS = 'high-class';
const ACCOUNT_ROLE_SLUGS = ['admin', 'client', 'guest', 'fotograaf'];
const ROSTER_ROLE_SLUGS = [
  ROLE_MODEL,
  ROLE_NEWFACE,
  ROLE_TRYOUT,
  ROLE_HIGH_CLASS,
  ROLE_INACTIEF,
  ROLE_DELETED,
];

function roleSlugs(u: { roles: { role: { slug: string } }[] }): string[] {
  return u.roles.map((r) => r.role.slug);
}

function hasRole(slugs: string[], slug: string): boolean {
  return slugs.includes(slug);
}

function isStaffSlugs(slugs: string[]): boolean {
  return slugs.some((s) => ACCOUNT_ROLE_SLUGS.includes(s));
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

/** Fiche-velden voor modaal / print; geen volledig adres voor leden. */
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
    base.straat = ms?.straat;
    base.postcode = ms?.postcode;
    base.land = ms?.land;
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

type ThumbAsset = {
  storageKey: string;
  webpKey: string | null;
  thumbKey: string | null;
  mimeType: string;
};

type CatalogUserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  modelSheet: unknown;
  profilePhoto: ThumbAsset | null;
  roles: { role: { slug: string } }[];
};

const CATALOG_USER_WHERE = {
  status: 'active' as const,
  AND: [
    { roles: { none: { role: { slug: { in: ACCOUNT_ROLE_SLUGS } } } } },
    { roles: { some: { role: { slug: { in: ROSTER_ROLE_SLUGS } } } } },
  ],
};

const CATALOG_LIST_CACHE_MS = 45_000;

@Injectable()
export class CatalogService {
  private listCache: { key: string; at: number; data: unknown[] } | null = null;

  constructor(
    private prisma: PrismaService,
    private media: MediaService,
  ) {}

  private listCacheKey(viewer?: { sub: string; roles: string[] }): string {
    if (!viewer?.sub) return 'public';
    return `${viewer.sub}:${(viewer.roles ?? []).includes('admin') ? 'admin' : 'member'}`;
  }

  invalidateListCache() {
    this.listCache = null;
  }

  /** Eén query voor fallback-thumbs i.p.v. per model een mediaAssets-subquery. */
  private async fallbackThumbsByUserId(userIds: string[]): Promise<Map<string, ThumbAsset>> {
    const out = new Map<string, ThumbAsset>();
    if (!userIds.length) return out;
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        uploadedById: { in: userIds },
        hardDeleted: false,
        mimeType: { startsWith: 'image/' },
        folder: { slug: 'models' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        uploadedById: true,
        storageKey: true,
        webpKey: true,
        thumbKey: true,
        mimeType: true,
      },
    });
    for (const a of assets) {
      if (!a.uploadedById || out.has(a.uploadedById)) continue;
      out.set(a.uploadedById, a);
    }
    return out;
  }

  private sortCatalogRows<T extends { firstName: string | null; lastName: string | null }>(rows: T[]): T[] {
    return rows.sort((a, b) => {
      const fa = (a.firstName ?? '').trim();
      const fb = (b.firstName ?? '').trim();
      const c = fa.localeCompare(fb, 'nl', { sensitivity: 'base' });
      if (c !== 0) return c;
      const la = (a.lastName ?? '').trim();
      const lb = (b.lastName ?? '').trim();
      return la.localeCompare(lb, 'nl', { sensitivity: 'base' });
    });
  }

  private mapCatalogUser(
    u: CatalogUserRow,
    opts: {
      isAdmin: boolean;
      authenticated: boolean;
      favSet: Set<string>;
      fallbackThumbs: Map<string, ThumbAsset>;
      includeSheet: boolean;
    },
  ) {
    const ms =
      (u.modelSheet && typeof u.modelSheet === 'object' && !Array.isArray(u.modelSheet)
        ? (u.modelSheet as Record<string, unknown>)
        : null) ?? null;
    const slugs = roleSlugs(u);
    const inactive = hasRole(slugs, ROLE_INACTIEF);
    const deleted = hasRole(slugs, ROLE_DELETED);
    const newface = hasRole(slugs, ROLE_NEWFACE);
    const tryout = hasRole(slugs, ROLE_TRYOUT);
    const highClass = hasRole(slugs, ROLE_HIGH_CLASS);
    const fallbackAsset = opts.fallbackThumbs.get(u.id);
    const thumbKey =
      u.profilePhoto != null
        ? this.media.resolveCatalogThumbKey(u.profilePhoto)
        : fallbackAsset != null
          ? this.media.resolveCatalogThumbKey(fallbackAsset)
          : null;
    const sheetMode: 'admin' | 'member' | 'none' = opts.isAdmin
      ? 'admin'
      : opts.authenticated
        ? 'member'
        : 'none';
    const besch = beschikbaarList(ms);
    return {
      id: u.id,
      email: opts.isAdmin ? u.email : undefined,
      displayName: publicDisplayName(u.firstName, u.lastName, opts.isAdmin),
      ...(opts.authenticated ? { firstName: u.firstName, lastName: u.lastName } : {}),
      age: ageFromGeboorte(ms?.geboortedatum),
      gender: normGender(ms?.geslacht),
      beschikbaar: besch,
      beschikbaarSlugs: besch.map((b) =>
        b
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-'),
      ),
      gemeente: String(ms?.gemeente ?? '').trim() || undefined,
      profileThumbKey: thumbKey,
      isNewface: newface,
      isTryout: tryout,
      isHighClass: highClass,
      roleSlugs: slugs,
      isInactive: inactive,
      isDeleted: deleted,
      isFavorite: opts.isAdmin ? opts.favSet.has(u.id) : false,
      ...(opts.includeSheet ? { sheet: catalogSheetPayload(ms, u.phone, sheetMode) } : {}),
    };
  }

  async listGroupings(viewer?: { sub: string; roles: string[] }) {
    const isAdmin = !!viewer?.roles?.includes('admin');
    const fallback = [
      { slug: ROLE_NEWFACE, label: 'Newface', catalogVisibility: 'public' },
      { slug: ROLE_TRYOUT, label: 'Try-out', catalogVisibility: 'public' },
      { slug: ROLE_HIGH_CLASS, label: 'High class', catalogVisibility: 'public' },
      ...(isAdmin
        ? [
            { slug: ROLE_INACTIEF, label: 'Inactief', catalogVisibility: 'admin_frontend' },
            { slug: ROLE_DELETED, label: 'Verwijderd', catalogVisibility: 'admin_frontend' },
          ]
        : []),
    ];
    try {
      await this.prisma.role.upsert({
        where: { slug: ROLE_HIGH_CLASS },
        update: {},
        create: {
          slug: ROLE_HIGH_CLASS,
          label: 'High class',
          description: 'Modelgroepering: High class',
          permissions: [],
          catalogVisibility: 'public',
        },
      });
      await this.prisma.role.upsert({
        where: { slug: ROLE_DELETED },
        update: { label: 'Verwijderd' },
        create: {
          slug: ROLE_DELETED,
          label: 'Verwijderd',
          description: 'Prullenbak: terugzetten of de map leegmaken.',
          permissions: [],
          catalogVisibility: 'admin_frontend',
        },
      });
      const vis = isAdmin ? ['public', 'admin_frontend'] : ['public'];
      return await this.prisma.role.findMany({
        where: {
          catalogVisibility: { in: vis },
          slug: { notIn: [...ACCOUNT_ROLE_SLUGS, ROLE_MODEL] },
        },
        select: { slug: true, label: true, catalogVisibility: true },
        orderBy: { slug: 'asc' },
      });
    } catch {
      return fallback;
    }
  }

  async listModels(viewer?: { sub: string; roles: string[] }) {
    const key = this.listCacheKey(viewer);
    const now = Date.now();
    if (this.listCache && this.listCache.key === key && now - this.listCache.at < CATALOG_LIST_CACHE_MS) {
      return this.listCache.data;
    }
    const data = await this.listModelsUncached(viewer);
    this.listCache = { key, at: now, data };
    return data;
  }

  private async listModelsUncached(viewer?: { sub: string; roles: string[] }) {
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
      where: CATALOG_USER_WHERE,
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
        roles: { include: { role: { select: { slug: true } } } },
      },
    });

    this.sortCatalogRows(rows);

    const needsFallback = rows.filter((u) => !u.profilePhoto).map((u) => u.id);
    const fallbackThumbs = await this.fallbackThumbsByUserId(needsFallback);
    const authenticated = !!viewer?.sub;

    const mapped = rows.map((u) =>
      this.mapCatalogUser(u, {
        isAdmin,
        authenticated,
        favSet,
        fallbackThumbs,
        includeSheet: false,
      }),
    );
    const roster = mapped.filter((m) => !isStaffSlugs(m.roleSlugs ?? []));
    if (!isAdmin) return roster.filter((m) => !m.isDeleted && !m.isInactive);
    return roster;
  }

  /** Volledige fiche (sheet) voor modaal — apart van het snelle rooster. */
  async getModelDetail(modelUserId: string, viewer?: { sub: string; roles: string[] }) {
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

    const u = await this.prisma.user.findFirst({
      where: { id: modelUserId, ...CATALOG_USER_WHERE },
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
        roles: { include: { role: { select: { slug: true } } } },
      },
    });
    if (!u) throw new NotFoundException();
    if (isStaffSlugs(roleSlugs(u))) throw new NotFoundException();
    if (!isAdmin && (roleSlugs(u).includes(ROLE_DELETED) || roleSlugs(u).includes(ROLE_INACTIEF))) {
      throw new NotFoundException();
    }

    const fallbackThumbs = u.profilePhoto
      ? new Map<string, ThumbAsset>()
      : await this.fallbackThumbsByUserId([u.id]);

    return this.mapCatalogUser(u, {
      isAdmin,
      authenticated: !!viewer?.sub,
      favSet,
      fallbackThumbs,
      includeSheet: true,
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
    this.invalidateListCache();
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
    this.invalidateListCache();
    await this.assertAdmin(adminId, roles);
    const user = await this.prisma.user.findUnique({
      where: { id: modelUserId },
      include: { roles: { include: { role: { select: { slug: true } } } } },
    });
    if (!user) throw new NotFoundException();
    const ids = await this.roleIds();

    const core = new Set([ROLE_MODEL, ROLE_NEWFACE, ROLE_TRYOUT, ROLE_INACTIEF]);
    const extras = roleSlugs(user).filter((slug) => !core.has(slug));
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

    for (const e of extras) s.add(e);

    const want = [...s];
    const roleRows = await this.prisma.role.findMany({
      where: { slug: { in: want } },
      select: { id: true, slug: true },
    });
    const idBySlug = new Map(roleRows.map((r) => [r.slug, r.id]));
    idBySlug.set(ROLE_MODEL, ids.model);
    idBySlug.set(ROLE_NEWFACE, ids.newface);
    idBySlug.set(ROLE_TRYOUT, ids.tryout);
    idBySlug.set(ROLE_INACTIEF, ids.inactief);

    await this.prisma.userRole.deleteMany({ where: { userId: modelUserId } });
    await this.prisma.userRole.createMany({
      data: want
        .filter((slug) => idBySlug.has(slug))
        .map((slug) => ({
          userId: modelUserId,
          roleId: idBySlug.get(slug)!,
        })),
    });

    return this.prisma.user.findUnique({
      where: { id: modelUserId },
      select: { id: true, roles: { include: { role: { select: { slug: true } } } } },
    });
  }

  /** Galerij-keys voor fiche (hoofdfoto eerst, daarna portfolio). */
  async getModelGallery(
    modelUserId: string,
    viewer?: { sub: string; roles: string[] },
  ): Promise<{ keys: string[] }> {
    if (!viewer?.sub) return { keys: [] };

    const user = await this.prisma.user.findUnique({
      where: { id: modelUserId },
      select: {
        profilePhotoAssetId: true,
        profilePhoto: {
          select: { storageKey: true, webpKey: true, thumbKey: true, mimeType: true },
        },
        mediaAssets: {
          where: {
            hardDeleted: false,
            mimeType: { startsWith: 'image/' },
            folder: { slug: 'models' },
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true, storageKey: true, webpKey: true, thumbKey: true, mimeType: true },
        },
      },
    });
    if (!user) throw new NotFoundException();

    const keys: string[] = [];
    const pushKey = (asset: { storageKey: string; webpKey: string | null; thumbKey: string | null; mimeType: string }) => {
      const k =
        this.media.resolveGalleryWebKey(asset) ?? this.media.resolveCatalogThumbKey(asset);
      if (k && !keys.includes(k)) keys.push(k);
    };

    if (user.profilePhoto) pushKey(user.profilePhoto);
    for (const a of user.mediaAssets) {
      if (user.profilePhotoAssetId && a.id === user.profilePhotoAssetId) continue;
      pushKey(a);
    }
    if (!keys.length && user.mediaAssets.length) {
      for (const a of user.mediaAssets) pushKey(a);
    }

    return { keys };
  }
}
