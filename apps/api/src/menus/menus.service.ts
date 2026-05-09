import { Injectable, NotFoundException } from '@nestjs/common';
import type { MenuItem, Portal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type MenuContext = { isPremium: boolean; roleSlugs: string[] };

@Injectable()
export class MenusService {
  constructor(private prisma: PrismaService) {}

  private filterItem(item: MenuItem, ctx: MenuContext) {
    if (!item.visibleWeb) return false;
    if (item.requiresPremium && !ctx.isPremium) return false;
    const rs = item.roleSlugs as unknown;
    if (Array.isArray(rs) && rs.length > 0) {
      if (!rs.some((s) => typeof s === 'string' && ctx.roleSlugs.includes(s))) {
        return false;
      }
    }
    return true;
  }

  async forPortal(portal: Portal, placement: string | undefined, ctx: MenuContext) {
    const menus = await this.prisma.menu.findMany({
      where: {
        portal,
        ...(placement ? { placement } : {}),
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { label: 'asc' },
    });
    return menus.map((m) => ({
      id: m.id,
      slug: m.slug,
      label: m.label,
      portal: m.portal,
      placement: m.placement,
      items: m.items.filter((i) => this.filterItem(i, ctx)),
    }));
  }

  async listAll() {
    return this.prisma.menu.findMany({
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ portal: 'asc' }, { label: 'asc' }],
    });
  }

  async createMenu(data: {
    slug: string;
    label: string;
    portal: Portal;
    placement: string;
  }) {
    return this.prisma.menu.create({ data });
  }

  async updateMenu(
    id: string,
    data: Partial<{ label: string; placement: string; portal: Portal }>,
  ) {
    const m = await this.prisma.menu.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Menu niet gevonden');
    return this.prisma.menu.update({ where: { id }, data });
  }

  async deleteMenu(id: string) {
    const m = await this.prisma.menu.findUnique({ where: { id } });
    if (!m) throw new NotFoundException();
    await this.prisma.menu.delete({ where: { id } });
    return { ok: true };
  }

  async createItem(
    menuId: string,
    data: {
      label: string;
      href: string;
      sortOrder?: number;
      visibleWeb?: boolean;
      visibleApp?: boolean;
      requiresPremium?: boolean;
      roleSlugs?: string[];
    },
  ) {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) throw new NotFoundException('Menu niet gevonden');
    return this.prisma.menuItem.create({
      data: {
        menuId,
        label: data.label,
        href: data.href,
        sortOrder: data.sortOrder ?? 0,
        visibleWeb: data.visibleWeb ?? true,
        visibleApp: data.visibleApp ?? true,
        requiresPremium: data.requiresPremium ?? false,
        roleSlugs: (data.roleSlugs ?? []) as object,
      },
    });
  }

  async updateItem(
    itemId: string,
    data: Partial<{
      label: string;
      href: string;
      sortOrder: number;
      visibleWeb: boolean;
      visibleApp: boolean;
      requiresPremium: boolean;
      roleSlugs: string[];
    }>,
  ) {
    const it = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!it) throw new NotFoundException('Item niet gevonden');
    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(data.label != null ? { label: data.label } : {}),
        ...(data.href != null ? { href: data.href } : {}),
        ...(data.sortOrder != null ? { sortOrder: data.sortOrder } : {}),
        ...(data.visibleWeb != null ? { visibleWeb: data.visibleWeb } : {}),
        ...(data.visibleApp != null ? { visibleApp: data.visibleApp } : {}),
        ...(data.requiresPremium != null ? { requiresPremium: data.requiresPremium } : {}),
        ...(data.roleSlugs != null ? { roleSlugs: data.roleSlugs as object } : {}),
      },
    });
  }

  async deleteItem(itemId: string) {
    const it = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!it) throw new NotFoundException();
    await this.prisma.menuItem.delete({ where: { id: itemId } });
    return { ok: true };
  }
}
