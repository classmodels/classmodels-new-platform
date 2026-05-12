import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import createMollieClient, { Payment } from '@mollie/api-client';
import { PrismaService } from '../prisma/prisma.service';
import { ModelPortalHistoryService } from '../portal/model-portal-history.service';

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private modelHistory: ModelPortalHistoryService,
  ) {}

  private async apiKey(): Promise<string> {
    const settings = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    const useLive =
      process.env.MOLLIE_MODE === 'live' ||
      (process.env.NODE_ENV === 'production' && process.env.MOLLIE_MODE !== 'test');
    const key = useLive
      ? (settings?.apiKeyLive?.trim() || process.env.MOLLIE_API_KEY_LIVE?.trim())
      : (settings?.apiKeyTest?.trim() || process.env.MOLLIE_API_KEY_TEST?.trim());
    if (!key) {
      throw new ServiceUnavailableException(
        'Mollie API key ontbreekt (test of live). Zie .env en MollieSettings.',
      );
    }
    return key;
  }

  private async premiumAmount(): Promise<Prisma.Decimal> {
    const settings = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    if (settings?.premiumPrice != null) {
      return new Prisma.Decimal(settings.premiumPrice.toString());
    }
    const fromEnv = process.env.PREMIUM_PRICE_EUROS;
    if (fromEnv != null && fromEnv !== '') {
      return new Prisma.Decimal(fromEnv);
    }
    return new Prisma.Decimal('48');
  }

  private premiumDays(): number {
    const n = parseInt(process.env.PREMIUM_DURATION_DAYS ?? '365', 10);
    return Number.isFinite(n) && n > 0 ? n : 365;
  }

  /** Volledige webhook-URL voor Mollie (DB-override of standaard op API-public URL). */
  private async paymentWebhookUrl(): Promise<string> {
    const settings = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    const fromDb = settings?.webhookUrl?.trim();
    if (fromDb) return fromDb;
    const apiPublic =
      process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
      `http://localhost:${process.env.API_PORT ?? '4000'}`;
    return `${apiPublic}/payments/mollie/webhook`;
  }

  async getPremiumInfo() {
    const amount = await this.premiumAmount();
    return {
      currency: 'EUR',
      amount: amount.toString(),
      premiumDurationDays: this.premiumDays(),
    };
  }

  async startPremiumCheckout(userId: string, recurring?: boolean) {
    if (recurring) {
      throw new BadRequestException(
        'Terugkerend abonnement wordt nog geactiveerd (Mollie Subscriptions). Gebruik eenmalige betaling.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Gebruiker niet gevonden');

    if (user.isPremium && user.premiumUntil && user.premiumUntil > new Date()) {
      return {
        skipCheckout: true as const,
        reason: 'Premium is nog actief tot de vervaldatum.',
        premiumUntil: user.premiumUntil.toISOString(),
      };
    }

    const amount = await this.premiumAmount();
    const value = amount.toFixed(2);

    const sub = await this.prisma.subscription.create({
      data: {
        userId,
        status: 'created',
        amount,
        currency: 'EUR',
        isRecurring: false,
      },
    });

    const mollie = createMollieClient({ apiKey: await this.apiKey() });

    const redirectUrl =
      process.env.PAYMENT_REDIRECT_URL?.trim() ||
      `${(process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/portal/model?premium=return`;

    const webhookUrl = await this.paymentWebhookUrl();

    let payment: Payment;
    try {
      payment = await mollie.payments.create({
        amount: { currency: 'EUR', value },
        description: 'Class Models Premium',
        redirectUrl,
        webhookUrl,
        metadata: { userId: String(userId), subscriptionId: String(sub.id) },
      });
    } catch (e) {
      this.log.warn(`Mollie payments.create failed: ${e}`);
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'mollie_error' },
      });
      throw new BadRequestException('Mollie kon geen betaling aanmaken. Controleer API key en dashboard.');
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        molliePaymentId: payment.id,
        status: payment.status,
      },
    });

    const checkoutUrl = payment.getCheckoutUrl();
    if (!checkoutUrl) {
      throw new BadRequestException('Geen Mollie checkout-URL ontvangen.');
    }

    return {
      checkoutUrl,
      paymentId: payment.id,
      subscriptionId: sub.id,
    };
  }

  async handleMollieWebhook(paymentId: string) {
    if (!paymentId?.trim()) {
      this.log.warn('Webhook zonder payment id');
      return;
    }

    const mollie = createMollieClient({ apiKey: await this.apiKey() });
    let payment: Payment;
    try {
      payment = await mollie.payments.get(paymentId);
    } catch (e) {
      this.log.error(`Webhook: payment ophalen mislukt ${paymentId}: ${e}`);
      return;
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { molliePaymentId: payment.id },
      include: { user: true },
    });
    if (!sub) {
      this.log.warn(`Geen subscription voor Mollie payment ${payment.id}`);
      return;
    }

    const meta = payment.metadata as Record<string, string> | undefined;
    const metaSub = meta?.subscriptionId;
    if (metaSub && metaSub !== sub.id) {
      this.log.warn(`Metadata subscriptionId komt niet overeen voor ${payment.id}`);
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: payment.status },
    });

    const user = sub.user;
    if (!user) return;

    if (payment.status === 'paid') {
      const days = this.premiumDays();
      const until = new Date();
      until.setUTCDate(until.getUTCDate() + days);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isPremium: true, premiumUntil: until },
      });
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'premium.mollie_paid',
          meta: { paymentId: payment.id, subscriptionId: sub.id, premiumUntil: until.toISOString() },
        },
      });
      void this.modelHistory.log(user.id, 'premium_paid', {
        paymentId: payment.id,
        premiumUntil: until.toISOString(),
      });
      return;
    }

    if (['canceled', 'expired', 'failed'].includes(payment.status)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isPremium: false },
      });
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'premium.mollie_revoked',
          meta: { paymentId: payment.id, status: payment.status },
        },
      });
      void this.modelHistory.log(user.id, 'premium_revoked', {
        paymentId: payment.id,
        status: payment.status,
      });
    }
  }
}
