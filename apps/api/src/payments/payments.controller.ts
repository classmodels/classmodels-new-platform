import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PremiumCheckoutDto } from './dto/premium-checkout.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  /** Publiek: actuele premieprijs (zoals in DB / env). */
  @Get('premium/info')
  info() {
    return this.payments.getPremiumInfo();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('payments.checkout')
  @Post('premium/checkout')
  checkout(@Req() req: { user: JwtPayload }, @Body() dto: PremiumCheckoutDto) {
    return this.payments.startPremiumCheckout(req.user.sub, dto.recurring);
  }

  /** Mollie webhook — altijd 200 bij ontvangst om dubbele retries te beperken. */
  @Post('mollie/webhook')
  @HttpCode(200)
  async mollieWebhook(@Body() body: { id?: string }, @Query('id') queryId?: string) {
    const raw = typeof body?.id === 'string' ? body.id : typeof queryId === 'string' ? queryId : undefined;
    const id = raw?.trim();
    if (id) await this.payments.handleMollieWebhook(id);
    return { received: true };
  }
}
