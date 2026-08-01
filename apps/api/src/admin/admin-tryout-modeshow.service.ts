import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sendHtmlMail } from '../mail/send-html-mail';
import { modelAgeFromSheet } from '../portal/brief-eligibility';
import { TRYOUT_MODESHOW_ACTIVE_SLUG } from '../portal/tryout-modeshow-edition';

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

@Injectable()
export class AdminTryoutModeshowService {
  constructor(private prisma: PrismaService) {}

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

    const rows = await this.prisma.tryoutModeshowRegistration.findMany({
      where: {
        editionSlug,
        ...(userWhere ? { user: userWhere } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            legacyWpUserId: true,
            status: true,
            createdAt: true,
            modelSheet: true,
          },
        },
      },
    });

    const mapped = rows.map((r) => ({
      ...this.serializeReg(r),
      user: this.serializeUser(r.user),
    }));

    const paid = mapped.filter((m) => m.pipelinePhase === 'paid');
    const awaitingPayment = mapped.filter((m) => m.pipelinePhase === 'awaiting_payment');
    const awaitingTerms = mapped.filter((m) => m.pipelinePhase === 'awaiting_terms');
    const declined = mapped.filter((m) => m.pipelinePhase === 'declined');
    const noResponse = mapped.filter((m) => m.pipelinePhase === 'no_response');
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
        declined: declined.length,
        noResponse: noResponse.length,
        revenuePaid: revenuePaid.toFixed(2),
      },
      groups: {
        paid,
        free: freePaid,
        awaitingPayment,
        awaitingTerms,
        declined,
        noResponse,
      },
      lists: {
        paid,
        interested: mapped.filter((m) => m.interestStatus === 'interested'),
        interestedAwaitingTerms: awaitingTerms,
        interestedAwaitingPayment: awaitingPayment,
        declined,
        none: noResponse,
      },
      all: mapped,
    };
  }

  async sendMail(opts: {
    registrationIds?: string[];
    phases?: TryoutPipelinePhase[];
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
    let regs = await this.prisma.tryoutModeshowRegistration.findMany({
      where: { editionSlug },
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

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const r of regs) {
      const to = r.user.email?.trim();
      if (!to) {
        failed++;
        continue;
      }
      const name = [r.user.firstName, r.user.lastName].filter(Boolean).join(' ').trim();
      const personalized = html
        .replace(/\{\{voornaam\}\}/gi, r.user.firstName ?? '')
        .replace(/\{\{naam\}\}/gi, name || '')
        .replace(/\{\{email\}\}/gi, to);
      const ok = await sendHtmlMail(this.prisma, to, subject, personalized);
      if (ok) sent++;
      else {
        failed++;
        errors.push(to);
      }
    }

    return { ok: true, targeted: regs.length, sent, failed, errors: errors.slice(0, 20) };
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
