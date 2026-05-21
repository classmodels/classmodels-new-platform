import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateModelReviewDto } from './dto/create-model-review.dto';

@Controller('portal/model/reviews')
@UseGuards(JwtAuthGuard)
export class PortalModelReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async submit(@Req() req: { user: JwtPayload }, @Body() dto: CreateModelReviewDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { firstName: true, lastName: true, email: true },
    });
    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
      user?.email?.split('@')[0] ||
      'Model';
    return this.reviews.createFromModel(name, {
      title: dto.title,
      body: dto.body,
      rating: dto.rating,
    });
  }
}
