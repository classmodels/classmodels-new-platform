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

export type MollieMode = 'test' | 'live';

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private modelHistory: ModelPortalHistoryService,
  ) {}

  /** Actieve modus: backoffice (DB) → MOLLIE_MODE env → test (veilige default). */
  async resolveActiveMode(): Promise<MollieMode> {
    const settings = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    if (settings?.activeMode === 'live' || settings?.activeMode === 'test') {
      return settings.activeMode;
    }
    if (process.env.MOLLIE_MODE === 'live') return 'live';
    if (process.env.MOLLIE_MODE === 'test') return 'test';
    return 'test';
  }

  private async rawKeyForMode(mode: MollieMode): Promise<string | null> {
    const settings = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    if (mode === 'live') {
      return settings?.apiKeyLive?.trim() || process.env.MOLLIE_API_KEY_LIVE?.trim() || null;
    }
    return settings?.apiKeyTest?.trim() || process.env.MOLLIE_API_KEY_TEST?.trim() || null;
  }

  async apiKeyForMode(mode: MollieMode, opts?: { required?: boolean }): Promise<string | null> {
    const key = await this.rawKeyForMode(mode);
    if (!key && opts?.required !== false) {
      throw new ServiceUnavailableException(
        `Mollie ${mode} API key ontbreekt. Vul de key in via backoffice → Mollie of zet MOLLIE_API_KEY_${mode.toUpperCase()} in .env.`,
      );
    }
    return key;
  }

  private async apiKey(): Promise<string> {
    const mode = await this.resolveActiveMode();
    const key = await this.apiKeyForMode(mode);
    if (!key) {
      throw new ServiceUnavailableException(
        'Mollie API key ontbreekt voor de gekozen modus. Zie backoffice → Mollie-instellingen.',
      );
    }
    return key;
  }

  private async fetchMolliePayment(paymentId: string): Promise<Payment | null> {
    for (const mode of ['test', 'live'] as const) {
      const key = await this.rawKeyForMode(mode);
      if (!key) continue;
      try {
        const mollie = createMollieClient({ apiKey: key });
        return await mollie.payments.get(paymentId);
      } catch {
        /* andere modus proberen — webhook kan na moduswissel binnenkomen */
      }
    }
    return null;
  }

  async getMollieAdminStatus() {
    const settings = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    const activeMode = await this.resolveActiveMode();
    const hasApiKeyTest = Boolean(await this.rawKeyForMode('test'));
    const hasApiKeyLive = Boolean(await this.rawKeyForMode('live'));
    const effectiveWebhookUrl = await this.paymentWebhookUrl();
    const apiPublic =
      process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
      `http://localhost:${process.env.API_PORT ?? '4000'}`;
    const suggestedWebhookUrl = `${apiPublic}/payments/mollie/webhook`;
    return {
      activeMode,
      hasApiKeyTest,
      hasApiKeyLive,
      activeKeyConfigured: activeMode === 'live' ? hasApiKeyLive : hasApiKeyTest,
      effectiveWebhookUrl,
      suggestedWebhookUrl,
      apiPublicUrl: apiPublic,
      modeSource:
        settings?.activeMode === 'live' || settings?.activeMode === 'test'
          ? ('database' as const)
          : process.env.MOLLIE_MODE
            ? ('env' as const)
            : ('default_test' as const),
    };
  }

  async testMollieConnection(mode: MollieMode) {
    const key = await this.apiKeyForMode(mode);
    if (!key) {
      throw new BadRequestException(`Geen ${mode} API key geconfigureerd.`);
    }
    if (mode === 'test' && !key.startsWith('test_')) {
      throw new BadRequestException('Testmodus vereist een key die begint met test_.');
    }
    if (mode === 'live' && !key.startsWith('live_')) {
      throw new BadRequestException('Livemodus vereist een key die begint met live_.');
    }
    const mollie = createMollieClient({ apiKey: key });
    try {
      const profile = await mollie.profiles.getCurrent();
      return {
        ok: true as const,
        mode,
        profileId: profile.id,
        profileName: profile.name,
        status: profile.status,
      };
    } catch (e) {
      this.log.warn(`Mollie test connection (${mode}) failed: ${e}`);
      throw new BadRequestException(
        `Verbinding met Mollie (${mode}) mislukt. Controleer de API key in je Mollie-dashboard.`,
      );
    }
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

  private async tryoutAmount(): Promise<Prisma.Decimal> {
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

  async startTryoutModeshowCheckout(registrationId: string, expectedUserId: string) {
    const reg = await this.prisma.tryoutModeshowRegistration.findUnique({
      where: { id: registrationId },
      include: { user: true },
    });
    if (!reg || reg.userId !== expectedUserId) {
      throw new NotFoundException('Inschrijving niet gevonden');
    }
    if (reg.interestStatus === 'paid') {
      return { skipCheckout: true as const, reason: 'U bent reeds ingeschreven voor deze try-out modeshow.' };
    }
    if (reg.interestStatus !== 'interested' || !reg.termsAcceptedAt) {
      throw new BadRequestException('Voorwaarden niet voldaan voor checkout.');
    }

    const amount = await this.tryoutAmount();
    const value = amount.toFixed(2);
    const mollie = createMollieClient({ apiKey: await this.apiKey() });
    const webhookUrl = await this.paymentWebhookUrl();

    const base = (
      process.env.WEB_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const redirectUrl =
      process.env.TRYOUT_PAYMENT_REDIRECT_URL?.trim() ||
      `${base}/portal/model?tab=tryout-modeshow&tryout=return`;

    if (reg.molliePaymentId) {
      try {
        const existing = await mollie.payments.get(reg.molliePaymentId);
        if (existing.status === 'open' || existing.status === 'pending') {
          const checkoutUrl = existing.getCheckoutUrl();
          if (checkoutUrl) {
            return { checkoutUrl, paymentId: existing.id, tryoutRegistrationId: reg.id };
          }
        }
      } catch (e) {
        this.log.warn(`Try-out: bestaande Mollie-payment ophalen mislukt, nieuwe aanmaken: ${e}`);
      }
    }

    let payment: Payment;
    try {
      payment = await mollie.payments.create({
        amount: { currency: 'EUR', value },
        description: `Try-out modeshow — ${reg.editionSlug}`,
        redirectUrl,
        webhookUrl,
        metadata: {
          kind: 'tryout_modeshow',
          userId: String(expectedUserId),
          tryoutRegistrationId: String(reg.id),
          editionSlug: reg.editionSlug,
        },
      });
    } catch (e) {
      this.log.warn(`Mollie try-out payments.create failed: ${e}`);
      throw new BadRequestException('Mollie kon geen betaling aanmaken. Controleer API key en dashboard.');
    }

    await this.prisma.tryoutModeshowRegistration.update({
      where: { id: reg.id },
      data: {
        molliePaymentId: payment.id,
        paymentStatus: payment.status,
        amount,
      },
    });

    const checkoutUrl = payment.getCheckoutUrl();
    if (!checkoutUrl) {
      throw new BadRequestException('Geen Mollie checkout-URL ontvangen.');
    }

    return { checkoutUrl, paymentId: payment.id, tryoutRegistrationId: reg.id };
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
      `${(process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/portal/model?tab=premium&premium=return`;

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

    const payment = await this.fetchMolliePayment(paymentId);
    if (!payment) {
      this.log.error(`Webhook: payment ophalen mislukt ${paymentId} (geen geldige test/live key)`);
      return;
    }

    const tryout = await this.prisma.tryoutModeshowRegistration.findUnique({
      where: { molliePaymentId: payment.id },
      include: { user: true },
    });
    if (tryout) {
      await this.prisma.tryoutModeshowRegistration.update({
        where: { id: tryout.id },
        data: { paymentStatus: payment.status },
      });
      const tryoutUser = tryout.user;
      if (tryoutUser && payment.status === 'paid') {
        await this.prisma.tryoutModeshowRegistration.update({
          where: { id: tryout.id },
          data: { interestStatus: 'paid', paymentStatus: payment.status },
        });
        await this.prisma.auditLog.create({
          data: {
            userId: tryoutUser.id,
            action: 'tryout_modeshow.mollie_paid',
            meta: {
              paymentId: payment.id,
              editionSlug: tryout.editionSlug,
              tryoutRegistrationId: tryout.id,
            },
          },
        });
        void this.modelHistory.log(tryoutUser.id, 'tryout_modeshow_paid', {
          paymentId: payment.id,
          editionSlug: tryout.editionSlug,
        });
      }
      return;
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { molliePaymentId: payment.id },
      include: { user: true },
    });
    if (!sub) {
      this.log.warn(`Geen subscription of try-out inschrijving voor Mollie payment ${payment.id}`);
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
