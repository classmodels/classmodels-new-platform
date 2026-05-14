import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TRYOUT_MODESHOW_ACTIVE_SLUG } from '../portal/tryout-modeshow-edition';

export type TryoutPipelinePhase =
  | 'paid'
  | 'awaiting_payment'
  | 'awaiting_terms'
  | 'declined'
  | 'no_response';

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
  }) {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
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

    return {
      editionSlug,
      search: qRaw || null,
      generatedAt: new Date().toISOString(),
      counts: {
        total: mapped.length,
        paid: paid.length,
        awaitingPayment: awaitingPayment.length,
        awaitingTerms: awaitingTerms.length,
        declined: declined.length,
        noResponse: noResponse.length,
      },
      /** Groepering volgens inschrijffunnel (zelfde data als `lists`, handig voor UI). */
      groups: {
        paid,
        awaitingPayment,
        awaitingTerms,
        declined,
        noResponse,
      },
      /** Compat: oude veldnamen + interest/none split voor legacy-UI. */
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
}
