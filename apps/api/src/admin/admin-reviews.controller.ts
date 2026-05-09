import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateReviewAdminDto, UpdateReviewAdminDto } from './dto/review-admin.dto';

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Get()
  @Permissions('admin.reviews.read')
  list() {
    return this.reviews.listAdmin();
  }

  @Post()
  @Permissions('admin.reviews.write')
  create(@Body() dto: CreateReviewAdminDto) {
    return this.reviews.create(dto);
  }

  @Patch(':id')
  @Permissions('admin.reviews.write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReviewAdminDto) {
    return this.reviews.update(id, dto);
  }

  @Delete(':id')
  @Permissions('admin.reviews.write')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.remove(id);
  }
}
