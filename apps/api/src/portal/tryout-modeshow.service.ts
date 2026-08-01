import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { ModelPortalHistoryService } from './model-portal-history.service';
import { TRYOUT_MODESHOW_ACTIVE_SLUG, TRYOUT_MODESHOW_EDITION } from './tryout-modeshow-edition';
import { resolveTryoutCoupon } from './tryout-coupon.util';

@Injectable()
export class TryoutModeshowService {
  constructor(
    private prisma: PrismaService,
    private payments: PaymentsService,
    private modelHistory: ModelPortalHistoryService,
  ) {}

  private editionSlug() {
    return TRYOUT_MODESHOW_ACTIVE_SLUG;
  }

  private async tryoutPrice(): Promise<Prisma.Decimal> {
    const settings = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    if (settings?.tryoutPrice != null) {
      return new Prisma.Decimal(settings.tryoutPrice.toString());
    }
    const fromEnv = process.env.TRYOUT_PRICE_EUROS;
    if (fromEnv != null && fromEnv !== '') {
      return new Prisma.Decimal(fromEnv);
    }
    return new Prisma.Decimal('600');
  }

  private async getOrCreateRegistration(userId: string) {
    const editionSlug = this.editionSlug();
    return this.prisma.tryoutModeshowRegistration.upsert({
      where: { userId_editionSlug: { userId, editionSlug } },
      create: { userId, editionSlug, interestStatus: 'none' },
      update: {},
    });
  }

  async getState(userId: string) {
    const editionSlug = this.editionSlug();
    // Geen auto-create bij alleen bekijken — anders vult de adminlijst met "geen keuze".
    const reg = await this.prisma.tryoutModeshowRegistration.findUnique({
      where: { userId_editionSlug: { userId, editionSlug } },
    });
    const amount = await this.tryoutPrice();
    return {
      edition: { ...TRYOUT_MODESHOW_EDITION },
      registration: {
        interestStatus: reg?.interestStatus ?? 'none',
        declineReason: reg?.declineReason ?? null,
        termsAcceptedAt: reg?.termsAcceptedAt?.toISOString() ?? null,
        paymentStatus: reg?.paymentStatus ?? null,
        molliePaymentId: reg?.molliePaymentId ?? null,
        isFree: reg?.isFree ?? false,
        couponCode: reg?.couponCode ?? null,
        listPrice: reg?.listPrice?.toString() ?? null,
        discountAmount: reg?.discountAmount?.toString() ?? null,
        amount: reg?.amount?.toString() ?? null,
      },
      pricing: { currency: 'EUR', amount: amount.toFixed(2) },
    };
  }

  async previewCoupon(userId: string, code: string) {
    const listPrice = await this.tryoutPrice();
    const preview = await resolveTryoutCoupon(this.prisma, {
      codeRaw: code,
      userId,
      editionSlug: this.editionSlug(),
      listPrice,
    });
    if (!preview) {
      throw new BadRequestException('Vul een couponcode in.');
    }
    return preview;
  }

  async setInterest(userId: string, interested: boolean, declineReasonRaw?: string | null) {
    const reg = await this.getOrCreateRegistration(userId);
    if (reg.interestStatus === 'paid') {
      throw new BadRequestException('Uw inschrijving is reeds betaald en afgerond.');
    }
    const next = interested ? 'interested' : 'declined';
    const declineReason = interested
      ? null
      : (declineReasonRaw?.trim() || '').slice(0, 500) || null;
    if (!interested && !declineReason) {
      throw new BadRequestException('Geef een korte reden waarom u niet wilt deelnemen.');
    }
    const data: Prisma.TryoutModeshowRegistrationUpdateInput = {
      interestStatus: next,
      declineReason,
      ...(interested
        ? {}
        : {
            termsAcceptedAt: null,
            molliePaymentId: null,
            paymentStatus: null,
            amount: null,
            listPrice: null,
            discountAmount: null,
            isFree: false,
            couponId: null,
            couponCode: null,
          }),
    };
    await this.prisma.tryoutModeshowRegistration.update({
      where: { id: reg.id },
      data,
    });
    void this.modelHistory.log(userId, interested ? 'tryout_modeshow_interested' : 'tryout_modeshow_declined', {
      editionSlug: this.editionSlug(),
      ...(declineReason ? { declineReason } : {}),
    });
    return this.getState(userId);
  }

  async acceptTerms(userId: string, accepted: boolean) {
    if (!accepted) {
      throw new BadRequestException('U moet akkoord gaan om verder te gaan.');
    }
    const reg = await this.getOrCreateRegistration(userId);
    if (reg.interestStatus === 'paid') {
      throw new BadRequestException('Uw inschrijving is reeds betaald en afgerond.');
    }
    if (reg.interestStatus !== 'interested') {
      throw new BadRequestException('Duid eerst uw interesse aan voor de try-out modeshow.');
    }
    const now = new Date();
    await this.prisma.tryoutModeshowRegistration.update({
      where: { id: reg.id },
      data: { termsAcceptedAt: now },
    });
    void this.modelHistory.log(userId, 'tryout_modeshow_terms_accepted', {
      editionSlug: this.editionSlug(),
    });
    return this.getState(userId);
  }

  async startCheckout(
    userId: string,
    couponCode?: string | null,
    returnOpts?: { returnOrigin?: string | null; resumeToken?: string | null },
  ) {
    const reg = await this.getOrCreateRegistration(userId);
    if (reg.interestStatus === 'paid') {
      throw new BadRequestException('U bent reeds ingeschreven voor deze try-out modeshow.');
    }
    if (reg.interestStatus !== 'interested') {
      throw new BadRequestException('Duid eerst uw interesse aan.');
    }
    if (!reg.termsAcceptedAt) {
      throw new BadRequestException('Ga eerst akkoord met de algemene voorwaarden.');
    }
    return this.payments.startTryoutModeshowCheckout(reg.id, userId, couponCode, returnOpts);
  }
}
