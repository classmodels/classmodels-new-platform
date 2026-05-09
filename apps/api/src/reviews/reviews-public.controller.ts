import { Controller, Get } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsPublicController {
  constructor(private reviews: ReviewsService) {}

  @Get()
  list() {
    return this.reviews.listPublic();
  }
}
