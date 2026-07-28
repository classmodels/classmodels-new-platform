import { Body, Controller, Get, Post } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateGuestReviewDto } from './dto/create-guest-review.dto';

@Controller('reviews')
export class ReviewsPublicController {
  constructor(private reviews: ReviewsService) {}

  @Get()
  list() {
    return this.reviews.listPublic();
  }

  @Post()
  async submit(@Body() dto: CreateGuestReviewDto) {
    await this.reviews.createFromGuest({
      authorName: dto.authorName,
      title: dto.title,
      body: dto.body,
      rating: dto.rating,
    });
    return { ok: true };
  }
}
