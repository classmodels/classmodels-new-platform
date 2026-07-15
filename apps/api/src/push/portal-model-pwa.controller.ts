import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { RegisterPwaDto } from './dto/push.dto';
import { ModelPwaService } from './model-pwa.service';

@Controller('portal/model/pwa')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelPwaController {
  constructor(private readonly modelPwa: ModelPwaService) {}

  @Post('register')
  @Permissions('portal.model.push.read')
  register(
    @Req() req: { user: JwtPayload } & { headers: Record<string, string | string[] | undefined> },
    @Body() dto: RegisterPwaDto,
  ) {
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
    return this.modelPwa.register(req.user.sub, dto, ua);
  }
}
