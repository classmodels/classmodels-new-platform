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
import { isPremiumPromoActive, PREMIUM_YEARLY_EUROS, premiumPromoDeadlineMs } from './premium-promo.util';

export type MollieMode = 'test' | 'live';

function mollieErrorMessage(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as { message?: string; field?: string; statusCode?: number };
    if (typeof o.message === 'string' && o.message.trim()) {
      return o.field ? `${o.message} (veld: ${o.field})` : o.message;
    }
  }
  return 'onbekende fout bij Mollie';
}

function assertMollieKeyForMode(key: string, mode: MollieMode): void {
  if (/…|\.\.\./.test(key)) {
    throw new BadRequestException(
      'De API key lijkt onvolledig (gemaskeerd). Kopieer de volledige key uit Mollie → Developers → API keys.',
    );
  }
  if (mode === 'test' && !key.startsWith('test_')) {
    throw new BadRequestException(
      'Testmodus is actief maar de key begint niet met test_. Kies Test API of gebruik een test-key.',
    );
  }
  if (mode === 'live' && !key.startsWith('live_')) {
    throw new BadRequestException(
      'Livemodus is actief maar de key begint niet met live_. Kies Live API of gebruik een live-key.',
    );
  }
}

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
        'Mollie API key ontbreekt voor de gekozen modus. Ga naar Admin → Mollie-instellingen en sla een key op.',
      );
    }
    assertMollieKeyForMode(key, mode);
    return key;
  }

  private mollieFail(
    action: string,
    e: unknown,
    extra?: { redirectUrl?: string; webhookUrl?: string; mode?: MollieMode },
  ): never {
    this.log.warn(
      `Mollie ${action} failed (mode=${extra?.mode ?? '?'}): ${mollieErrorMessage(e)}` +
        (extra?.redirectUrl ? ` redirect=${extra.redirectUrl}` : '') +
        (extra?.webhookUrl ? ` webhook=${extra.webhookUrl}` : ''),
    );
    const detail = mollieErrorMessage(e);
    const hint =
      detail.includes('Authorization') || detail.includes('authentication')
        ? ' De API key is ongeldig of hoort niet bij de gekozen modus (test/live).'
        : '';
    throw new BadRequestException(`Mollie: ${detail}.${hint} Controleer Admin → Mollie-instellingen.`);
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
    const webhook = this.resolveWebhookUrl(settings?.webhookUrl);
    const apiPublic = this.resolveApiPublicBase();
    const suggestedWebhookUrl = `${apiPublic}/payments/mollie/webhook`;
    return {
      activeMode,
      hasApiKeyTest,
      hasApiKeyLive,
      activeKeyConfigured: activeMode === 'live' ? hasApiKeyLive : hasApiKeyTest,
      effectiveWebhookUrl: webhook.url,
      webhookIgnoredLocalhost: webhook.ignoredLocalhostOverride,
      storedWebhookUrl: settings?.webhookUrl ?? null,
      suggestedWebhookUrl,
      apiPublicUrl: apiPublic,
      webhookUsesLocalhost: /localhost|127\.0\.0\.1/i.test(webhook.url),
      modeSource:
        settings?.activeMode === 'live' || settings?.activeMode === 'test'
          ? ('database' as const)
          : process.env.MOLLIE_MODE
            ? ('env' as const)
            : ('default_test' as const),
    };
  }

  async testMollieConnection(mode: MollieMode) {
    const key = await this.apiKeyForMode(mode, { required: false });
    if (!key) {
      throw new BadRequestException(
        `Geen ${mode} API key ingesteld. Vul eerst een ${mode === 'test' ? 'test_' : 'live_'} key in en klik Opslaan.`,
      );
    }
    assertMollieKeyForMode(key, mode);
    const mollie = createMollieClient({ apiKey: key });
    try {
      const profile = await mollie.profiles.getCurrent();
      return {
        ok: true as const,
        mode,
        message: `API key OK — profiel "${profile.name ?? profile.id}" (${profile.status ?? 'onbekend'}).`,
      };
    } catch (e) {
      this.mollieFail(`test-connection (${mode})`, e, { mode });
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

  private async setCardAmount(): Promise<Prisma.Decimal> {
    const settings = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    if (settings?.setCardPrice != null) {
      return new Prisma.Decimal(settings.setCardPrice.toString());
    }
    return new Prisma.Decimal('175');
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
    const mode = await this.resolveActiveMode();
    const mollie = createMollieClient({ apiKey: await this.apiKey() });
    const webhookUrl = await this.paymentWebhookUrl();

    const redirectUrl = this.paymentReturnUrl('tryout');

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
      this.mollieFail('try-out payments.create', e, { mode, redirectUrl, webhookUrl });
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

  /**
   * Publieke API-basis-URL. Zonder API_PUBLIC_URL op Combell: afleiden van WEB_APP_URL
   * (class-models.be → https://api.class-models.be), anders valt Mollie terug op localhost.
   */
  resolveApiPublicBase(): string {
    const fromApi = process.env.API_PUBLIC_URL?.trim().replace(/\/$/, '');
    if (fromApi && !/localhost|127\.0\.0\.1/i.test(fromApi)) {
      return fromApi;
    }

    const web = (
      process.env.WEB_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.WEB_PUBLIC_URL ||
      ''
    )
      .trim()
      .replace(/\/$/, '');

    if (/class-models\.be/i.test(web)) {
      return 'https://api.class-models.be';
    }
    if (web.startsWith('https://www.')) {
      return web.replace('https://www.', 'https://api.');
    }

    if (fromApi) return fromApi;
    return `http://localhost:${process.env.API_PORT ?? '4000'}`;
  }

  private defaultWebhookUrl(): string {
    return `${this.resolveApiPublicBase()}/payments/mollie/webhook`;
  }

  private paymentReturnUrl(kind: 'premium' | 'tryout' | 'setkaart'): string {
    const base = (
      process.env.WEB_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const envOverride =
      kind === 'premium'
        ? process.env.PAYMENT_REDIRECT_URL?.trim()
        : kind === 'tryout'
          ? process.env.TRYOUT_PAYMENT_REDIRECT_URL?.trim()
          : process.env.SET_CARD_PAYMENT_REDIRECT_URL?.trim();
    if (envOverride) return envOverride;
    const soort = kind === 'premium' ? 'premium' : kind === 'tryout' ? 'tryout' : 'setkaart';
    return `${base}/portal/model/betaling/bedankt?soort=${soort}`;
  }

  async startSetCardCheckout(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        setCardFreeOrder: true,
      },
    });
    if (!user) throw new NotFoundException('Gebruiker niet gevonden');
    if (user.setCardFreeOrder) {
      return {
        skipCheckout: true as const,
        reason: 'U kunt deze setkaarten gratis bestellen (inbegrepen in de try-out modeshow).',
        freeOrder: true,
      };
    }

    let draft = await this.prisma.modelSetCardDraft.findUnique({ where: { userId } });
    if (!draft) {
      draft = await this.prisma.modelSetCardDraft.create({
        data: { userId, versoPhotoAssetIds: [] },
      });
    }

    if (draft.setCardPaidAt) {
      return {
        skipCheckout: true as const,
        reason: 'Setkaart is al betaald. U kunt nu versturen naar Class-Models.',
        paid: true,
      };
    }

    const amount = await this.setCardAmount();
    const value = amount.toFixed(2);
    const mode = await this.resolveActiveMode();
    const mollie = createMollieClient({ apiKey: await this.apiKey() });
    const webhookUrl = await this.paymentWebhookUrl();
    const redirectUrl = this.paymentReturnUrl('setkaart');

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

    if (draft.molliePaymentId) {
      try {
        const existing = await mollie.payments.get(draft.molliePaymentId);
        if (existing.status === 'paid') {
          await this.prisma.modelSetCardDraft.update({
            where: { userId },
            data: {
              paymentStatus: existing.status,
              setCardPaidAt: new Date(),
            },
          });
          return {
            skipCheckout: true as const,
            reason: 'Betaling ontvangen. U kunt nu versturen naar Class-Models.',
            paid: true,
          };
        }
        if (existing.status === 'open' || existing.status === 'pending') {
          const checkoutUrl = existing.getCheckoutUrl();
          if (checkoutUrl) {
            return { checkoutUrl, paymentId: existing.id };
          }
        }
      } catch (e) {
        this.log.warn(`Setkaart: bestaande Mollie-payment ophalen mislukt: ${e}`);
      }
    }

    let payment: Payment;
    try {
      payment = await mollie.payments.create({
        amount: { currency: 'EUR', value },
        description: `Setkaart — ${displayName} (${user.email})`,
        redirectUrl,
        webhookUrl,
        metadata: {
          kind: 'set_card_order',
          userId: String(userId),
          userEmail: user.email,
          displayName,
        },
      });
    } catch (e) {
      this.mollieFail('setkaart payments.create', e, { mode, redirectUrl, webhookUrl });
    }

    await this.prisma.modelSetCardDraft.update({
      where: { userId },
      data: {
        molliePaymentId: payment.id,
        paymentStatus: payment.status,
      },
    });

    const checkoutUrl = payment.getCheckoutUrl();
    if (!checkoutUrl) {
      throw new BadRequestException('Geen Mollie checkout-URL ontvangen.');
    }

    return { checkoutUrl, paymentId: payment.id };
  }

  /** localhost-webhook in DB negeren op productie (anders weigert Mollie betalingen). */
  private resolveWebhookUrl(dbOverride: string | null | undefined): {
    url: string;
    ignoredLocalhostOverride: boolean;
  } {
    const defaultUrl = this.defaultWebhookUrl();
    const fromDb = dbOverride?.trim();
    if (!fromDb) return { url: defaultUrl, ignoredLocalhostOverride: false };
    const isLocal = /localhost|127\.0\.0\.1/i.test(fromDb);
    const apiPublic = this.resolveApiPublicBase();
    if (isLocal && apiPublic.startsWith('https://')) {
      this.log.warn(`Webhook ${fromDb} genegeerd; gebruik ${defaultUrl}`);
      return { url: defaultUrl, ignoredLocalhostOverride: true };
    }
    return { url: fromDb, ignoredLocalhostOverride: false };
  }

  /** Volledige webhook-URL voor Mollie (DB-override of standaard op API-public URL). */
  private async paymentWebhookUrl(): Promise<string> {
    const settings = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    return this.resolveWebhookUrl(settings?.webhookUrl).url;
  }

  async getPremiumInfo() {
    const promoActive = isPremiumPromoActive();
    const promoPrice = await this.premiumAmount();
    const amount = promoActive ? promoPrice : PREMIUM_YEARLY_EUROS;
    return {
      currency: 'EUR',
      amount: amount.toString(),
      premiumDurationDays: promoActive ? this.premiumDays() : 365,
      promoActive,
      promoEndsAt: new Date(premiumPromoDeadlineMs()).toISOString(),
      promoPrice: promoPrice.toString(),
      yearlyPrice: PREMIUM_YEARLY_EUROS.toString(),
      billingLabel: promoActive ? 'eenmalig · premium voor het leven' : 'per jaar',
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

    const promoActive = isPremiumPromoActive();
    const amount = promoActive ? await this.premiumAmount() : PREMIUM_YEARLY_EUROS;
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

    const mode = await this.resolveActiveMode();
    const mollie = createMollieClient({ apiKey: await this.apiKey() });

    const redirectUrl = this.paymentReturnUrl('premium');

    const webhookUrl = await this.paymentWebhookUrl();

    let payment: Payment;
    try {
      payment = await mollie.payments.create({
        amount: { currency: 'EUR', value },
        description: promoActive ? 'Class Models Premium (levenslang)' : 'Class Models Premium (jaar)',
        redirectUrl,
        webhookUrl,
        metadata: {
          userId: String(userId),
          subscriptionId: String(sub.id),
          promoLifetime: promoActive ? '1' : '0',
        },
      });
    } catch (e) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'mollie_error' },
      });
      this.mollieFail('premium payments.create', e, { mode, redirectUrl, webhookUrl });
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

    const setCardDraft = await this.prisma.modelSetCardDraft.findUnique({
      where: { molliePaymentId: payment.id },
      include: { user: true },
    });
    if (setCardDraft) {
      await this.prisma.modelSetCardDraft.update({
        where: { userId: setCardDraft.userId },
        data: { paymentStatus: payment.status },
      });
      if (payment.status === 'paid') {
        await this.prisma.modelSetCardDraft.update({
          where: { userId: setCardDraft.userId },
          data: { setCardPaidAt: new Date(), paymentStatus: payment.status },
        });
        const u = setCardDraft.user;
        if (u) {
          await this.prisma.auditLog.create({
            data: {
              userId: u.id,
              action: 'set_card.mollie_paid',
              meta: {
                paymentId: payment.id,
                displayName: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email,
                userEmail: u.email,
              },
            },
          });
          void this.modelHistory.log(u.id, 'set_card_paid', { paymentId: payment.id });
        }
      }
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
      const lifetime =
        meta?.promoLifetime === '1' || (meta?.promoLifetime !== '0' && isPremiumPromoActive());
      if (lifetime) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isPremium: true, premiumUntil: null, premiumOverride: true },
        });
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'premium.mollie_paid',
            meta: {
              paymentId: payment.id,
              subscriptionId: sub.id,
              lifetime: true,
            },
          },
        });
        void this.modelHistory.log(user.id, 'premium_paid', {
          paymentId: payment.id,
          lifetime: true,
        });
      } else {
        const days = this.premiumDays();
        const until = new Date();
        until.setUTCDate(until.getUTCDate() + days);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isPremium: true, premiumUntil: until, premiumOverride: false },
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
      }
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
