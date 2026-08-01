import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sendHtmlMail } from '../mail/send-html-mail';
import { modelAgeFromSheet } from '../portal/brief-eligibility';
import { TRYOUT_MODESHOW_ACTIVE_SLUG } from '../portal/tryout-modeshow-edition';
import { ModelPushService } from '../push/model-push.service';

export type TryoutPipelinePhase =
  | 'paid'
  | 'awaiting_payment'
  | 'awaiting_terms'
  | 'declined'
  | 'no_response';

function genderFromSheet(modelSheet: Prisma.JsonValue | null | undefined): string | null {
  if (!modelSheet || typeof modelSheet !== 'object' || Array.isArray(modelSheet)) return null;
  const g = (modelSheet as Record<string, unknown>).geslacht;
  if (Array.isArray(g)) {
    const labels = g.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
    return labels.length ? labels.join(', ') : null;
  }
  if (typeof g === 'string' && g.trim()) return g.trim();
  return null;
}

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  legacyWpUserId: true,
  status: true,
  createdAt: true,
  modelSheet: true,
} as const;

@Injectable()
export class AdminTryoutModeshowService {
  constructor(
    private prisma: PrismaService,
    private modelPush: ModelPushService,
  ) {}

  private phaseForRow(r: {
    interestStatus: string;
    termsAcceptedAt: Date | null;
  }): TryoutPipelinePhase {
    if (r.interestStatus === 'paid') return 'paid';
    if (r.interestStatus === 'declined') return 'declined';
    if (r.interestStatus === 'none') return 'no_response';
    if (r.interestStatus === 'interested') {
      if (!r.termsAcceptedAt) return 'awaiting_terms';
      return 'awaiting_payment';
    }
    return 'no_response';
  }

  private serializeUser(u: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    legacyWpUserId: number | null;
    status: string;
    createdAt: Date;
    modelSheet: Prisma.JsonValue | null;
  }) {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      gender: genderFromSheet(u.modelSheet),
      age: modelAgeFromSheet(u.modelSheet),
      legacyWpUserId: u.legacyWpUserId,
      accountStatus: u.status,
      accountCreatedAt: u.createdAt.toISOString(),
    };
  }

  private serializeReg(r: {
    id: string;
    userId: string;
    editionSlug: string;
    interestStatus: string;
    declineReason: string | null;
    termsAcceptedAt: Date | null;
    molliePaymentId: string | null;
    paymentStatus: string | null;
    amount: Prisma.Decimal | null;
    listPrice: Prisma.Decimal | null;
    discountAmount: Prisma.Decimal | null;
    isFree: boolean;
    couponCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: r.id,
      userId: r.userId,
      editionSlug: r.editionSlug,
      interestStatus: r.interestStatus,
      declineReason: r.declineReason,
      termsAcceptedAt: r.termsAcceptedAt?.toISOString() ?? null,
      molliePaymentId: r.molliePaymentId,
      paymentStatus: r.paymentStatus,
      amount: r.amount != null ? r.amount.toString() : null,
      listPrice: r.listPrice != null ? r.listPrice.toString() : null,
      discountAmount: r.discountAmount != null ? r.discountAmount.toString() : null,
      isFree: r.isFree,
      couponCode: r.couponCode,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      pipelinePhase: this.phaseForRow(r),
    };
  }

  async listRegistrations(editionSlugRaw?: string, searchRaw?: string) {
    const editionSlug = (editionSlugRaw?.trim() || TRYOUT_MODESHOW_ACTIVE_SLUG).slice(0, 120);
    const qRaw = searchRaw?.trim() ?? '';

    const userWhere: Prisma.UserWhereInput | undefined = qRaw
      ? {
          OR: [
            { email: { contains: qRaw } },
            { firstName: { contains: qRaw } },
            { lastName: { contains: qRaw } },
            { phone: { contains: qRaw } },
            ...( /^\d+$/.test(qRaw) ? [{ legacyWpUserId: parseInt(qRaw, 10) }] : []),
          ],
        }
      : undefined;

    // Alleen echte keuzes: geen auto-aangemaakte "none"-rijen van portaalbezoek.
    const rows = await this.prisma.tryoutModeshowRegistration.findMany({
      where: {
        editionSlug,
        interestStatus: { not: 'none' },
        ...(userWhere ? { user: userWhere } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: { user: { select: userSelect } },
    });

    const mapped = rows.map((r) => ({
      ...this.serializeReg(r),
      user: this.serializeUser(r.user),
    }));

    const paid = mapped.filter((m) => m.pipelinePhase === 'paid');
    const awaitingPayment = mapped.filter((m) => m.pipelinePhase === 'awaiting_payment');
    const awaitingTerms = mapped.filter((m) => m.pipelinePhase === 'awaiting_terms');
    const declined = mapped.filter((m) => m.pipelinePhase === 'declined');
    const inProgress = [...awaitingTerms, ...awaitingPayment];
    const freePaid = paid.filter((m) => m.isFree || Number(m.amount ?? '0') === 0);
    const revenuePaid = paid
      .filter((m) => !m.isFree && Number(m.amount ?? '0') > 0)
      .reduce((sum, m) => sum + Number(m.amount ?? 0), 0);

    return {
      editionSlug,
      search: qRaw || null,
      generatedAt: new Date().toISOString(),
      counts: {
        total: mapped.length,
        paid: paid.length,
        free: freePaid.length,
        awaitingPayment: awaitingPayment.length,
        awaitingTerms: awaitingTerms.length,
        inProgress: inProgress.length,
        declined: declined.length,
        revenuePaid: revenuePaid.toFixed(2),
      },
      groups: {
        paid,
        free: freePaid,
        awaitingPayment,
        awaitingTerms,
        inProgress,
        declined,
      },
      all: mapped,
    };
  }

  /** Modellen met rol `tryout` + hun inschrijvingsstatus voor deze editie. */
  async listTryoutRoleModels(editionSlugRaw?: string, searchRaw?: string) {
    const editionSlug = (editionSlugRaw?.trim() || TRYOUT_MODESHOW_ACTIVE_SLUG).slice(0, 120);
    const qRaw = searchRaw?.trim() ?? '';

    const users = await this.prisma.user.findMany({
      where: {
        roles: { some: { role: { slug: 'tryout' } } },
        ...(qRaw
          ? {
              OR: [
                { email: { contains: qRaw } },
                { firstName: { contains: qRaw } },
                { lastName: { contains: qRaw } },
                { phone: { contains: qRaw } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: userSelect,
    });

    const regs = await this.prisma.tryoutModeshowRegistration.findMany({
      where: {
        editionSlug,
        userId: { in: users.map((u) => u.id) },
      },
    });
    const byUser = new Map(regs.map((r) => [r.userId, r]));

    const items = users.map((u) => {
      const reg = byUser.get(u.id) ?? null;
      return {
        user: this.serializeUser(u),
        registration: reg
          ? this.serializeReg(reg)
          : {
              id: null as string | null,
              userId: u.id,
              editionSlug,
              interestStatus: 'none',
              declineReason: null as string | null,
              termsAcceptedAt: null as string | null,
              molliePaymentId: null as string | null,
              paymentStatus: null as string | null,
              amount: null as string | null,
              listPrice: null as string | null,
              discountAmount: null as string | null,
              isFree: false,
              couponCode: null as string | null,
              createdAt: null as string | null,
              updatedAt: null as string | null,
              pipelinePhase: 'no_response' as TryoutPipelinePhase,
            },
      };
    });

    return {
      editionSlug,
      search: qRaw || null,
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
    };
  }

  /** Inschrijving volledig wissen (altijd mogelijk). */
  async deleteRegistration(id: string) {
    const existing = await this.prisma.tryoutModeshowRegistration.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Inschrijving niet gevonden');
    await this.prisma.tryoutModeshowRegistration.delete({ where: { id } });
    return { ok: true, deletedId: id };
  }

  /** Inschrijving ongedaan maken: terugzetten naar geen keuze (rij blijft of wordt gewist). */
  async resetRegistration(id: string, opts?: { deleteRow?: boolean }) {
    const existing = await this.prisma.tryoutModeshowRegistration.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Inschrijving niet gevonden');

    if (opts?.deleteRow) {
      await this.prisma.tryoutModeshowRegistration.delete({ where: { id } });
      return { ok: true, deleted: true, id };
    }

    await this.prisma.tryoutModeshowRegistration.update({
      where: { id },
      data: {
        interestStatus: 'none',
        declineReason: null,
        termsAcceptedAt: null,
        molliePaymentId: null,
        paymentStatus: null,
        amount: null,
        listPrice: null,
        discountAmount: null,
        isFree: false,
        couponId: null,
        couponCode: null,
      },
    });
    // Na reset tonen we de rij niet meer in de hoofdlijsten (status none).
    await this.prisma.tryoutModeshowRegistration.delete({ where: { id } });
    return { ok: true, reset: true, deleted: true, id };
  }

  async sendMail(opts: {
    registrationIds?: string[];
    phases?: TryoutPipelinePhase[];
    userIds?: string[];
    editionSlug?: string;
    subject: string;
    html: string;
  }) {
    const subject = opts.subject?.trim();
    const html = opts.html?.trim();
    if (!subject || !html) {
      throw new BadRequestException('Onderwerp en bericht zijn verplicht.');
    }

    const editionSlug = (opts.editionSlug?.trim() || TRYOUT_MODESHOW_ACTIVE_SLUG).slice(0, 120);

    type Recipient = { email: string; firstName: string | null; lastName: string | null };
    const recipients: Recipient[] = [];

    if (opts.userIds?.length) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: opts.userIds } },
        select: { email: true, firstName: true, lastName: true },
      });
      recipients.push(...users);
    } else {
      let regs = await this.prisma.tryoutModeshowRegistration.findMany({
        where: {
          editionSlug,
          interestStatus: { not: 'none' },
        },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });

      if (opts.registrationIds?.length) {
        const set = new Set(opts.registrationIds);
        regs = regs.filter((r) => set.has(r.id));
      } else if (opts.phases?.length) {
        const phaseSet = new Set(opts.phases);
        regs = regs.filter((r) => phaseSet.has(this.phaseForRow(r)));
      } else {
        throw new BadRequestException('Selecteer ontvangers of een fase.');
      }
      recipients.push(...regs.map((r) => r.user));
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const u of recipients) {
      const to = u.email?.trim();
      if (!to) {
        failed++;
        continue;
      }
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
      const personalized = html
        .replace(/\{\{voornaam\}\}/gi, u.firstName ?? '')
        .replace(/\{\{naam\}\}/gi, name || '')
        .replace(/\{\{email\}\}/gi, to);
      const ok = await sendHtmlMail(this.prisma, to, subject, personalized);
      if (ok) sent++;
      else {
        failed++;
        errors.push(to);
      }
    }

    return { ok: true, targeted: recipients.length, sent, failed, errors: errors.slice(0, 20) };
  }

  async sendPush(opts: {
    registrationIds?: string[];
    phases?: TryoutPipelinePhase[];
    userIds?: string[];
    editionSlug?: string;
    title: string;
    body: string;
    adminUserId: string;
  }) {
    const title = opts.title?.trim();
    const body = opts.body?.trim();
    if (!title || !body) {
      throw new BadRequestException('Titel en bericht zijn verplicht.');
    }

    const editionSlug = (opts.editionSlug?.trim() || TRYOUT_MODESHOW_ACTIVE_SLUG).slice(0, 120);
    let userIds: string[] = [];

    if (opts.userIds?.length) {
      userIds = [...new Set(opts.userIds)];
    } else {
      let regs = await this.prisma.tryoutModeshowRegistration.findMany({
        where: {
          editionSlug,
          interestStatus: { not: 'none' },
        },
      });
      if (opts.registrationIds?.length) {
        const set = new Set(opts.registrationIds);
        regs = regs.filter((r) => set.has(r.id));
      } else if (opts.phases?.length) {
        const phaseSet = new Set(opts.phases);
        regs = regs.filter((r) => phaseSet.has(this.phaseForRow(r)));
      } else {
        throw new BadRequestException('Selecteer ontvangers of een fase.');
      }
      userIds = [...new Set(regs.map((r) => r.userId))];
    }

    const campaign = await this.prisma.pushCampaign.create({
      data: {
        title,
        body,
        audience: {
          kind: 'tryout_modeshow',
          editionSlug,
          registrationIds: opts.registrationIds ?? null,
          phases: opts.phases ?? null,
          userIds: opts.userIds ?? null,
        } as object,
        sentAt: new Date(),
        sentByUserId: opts.adminUserId,
      },
    });

    if (userIds.length) {
      await this.modelPush.deliverAgencyToUsers({
        userIds,
        title,
        body,
        campaignId: campaign.id,
        meta: { tryoutModeshow: true, editionSlug },
      });
    }

    return { ok: true, targeted: userIds.length, campaignId: campaign.id };
  }

  async listCoupons() {
    const rows = await this.prisma.tryoutCoupon.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue.toString(),
      maxTotalUses: c.maxTotalUses,
      maxUsesPerUser: c.maxUsesPerUser,
      usedCount: c.usedCount,
      active: c.active,
      editionSlug: c.editionSlug,
      note: c.note,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async createCoupon(input: {
    code: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    maxTotalUses?: number | null;
    maxUsesPerUser?: number;
    active?: boolean;
    editionSlug?: string | null;
    note?: string | null;
  }) {
    const code = input.code?.trim().toUpperCase();
    if (!code || code.length < 3) {
      throw new BadRequestException('Couponcode moet minstens 3 tekens hebben.');
    }
    if (input.discountType !== 'percent' && input.discountType !== 'fixed') {
      throw new BadRequestException('Kies percent of fixed.');
    }
    if (!(input.discountValue > 0)) {
      throw new BadRequestException('Kortingswaarde moet groter dan 0 zijn.');
    }
    if (input.discountType === 'percent' && input.discountValue > 100) {
      throw new BadRequestException('Percentage mag max. 100 zijn.');
    }

    try {
      const row = await this.prisma.tryoutCoupon.create({
        data: {
          code,
          discountType: input.discountType,
          discountValue: new Prisma.Decimal(input.discountValue),
          maxTotalUses: input.maxTotalUses ?? null,
          maxUsesPerUser: input.maxUsesPerUser ?? 1,
          active: input.active !== false,
          editionSlug: input.editionSlug?.trim() || null,
          note: input.note?.trim() || null,
        },
      });
      return {
        id: row.id,
        code: row.code,
        discountType: row.discountType,
        discountValue: row.discountValue.toString(),
        maxTotalUses: row.maxTotalUses,
        maxUsesPerUser: row.maxUsesPerUser,
        usedCount: row.usedCount,
        active: row.active,
        editionSlug: row.editionSlug,
        note: row.note,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Deze couponcode bestaat al.');
      }
      throw e;
    }
  }

  async updateCoupon(
    id: string,
    input: {
      discountType?: 'percent' | 'fixed';
      discountValue?: number;
      maxTotalUses?: number | null;
      maxUsesPerUser?: number;
      active?: boolean;
      editionSlug?: string | null;
      note?: string | null;
    },
  ) {
    const existing = await this.prisma.tryoutCoupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coupon niet gevonden');

    const row = await this.prisma.tryoutCoupon.update({
      where: { id },
      data: {
        ...(input.discountType ? { discountType: input.discountType } : {}),
        ...(input.discountValue != null
          ? { discountValue: new Prisma.Decimal(input.discountValue) }
          : {}),
        ...(input.maxTotalUses !== undefined ? { maxTotalUses: input.maxTotalUses } : {}),
        ...(input.maxUsesPerUser != null ? { maxUsesPerUser: input.maxUsesPerUser } : {}),
        ...(input.active != null ? { active: input.active } : {}),
        ...(input.editionSlug !== undefined
          ? { editionSlug: input.editionSlug?.trim() || null }
          : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      },
    });
    return {
      id: row.id,
      code: row.code,
      discountType: row.discountType,
      discountValue: row.discountValue.toString(),
      maxTotalUses: row.maxTotalUses,
      maxUsesPerUser: row.maxUsesPerUser,
      usedCount: row.usedCount,
      active: row.active,
      editionSlug: row.editionSlug,
      note: row.note,
    };
  }
}
