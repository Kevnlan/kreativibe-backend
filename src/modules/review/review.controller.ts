import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createReviewSchema, CreateReviewDto,
  listReviewsSchema, ListReviewsDto,
  respondToReviewSchema, RespondToReviewDto,
  deleteReviewSchema, DeleteReviewDto,
} from './dto/review.dto';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR, Role.BRAND)
export class ReviewController {
  constructor(private reviews: ReviewService) {}

  @Post('create')
  create(@CurrentUser() user: any, @Body(new ZodValidationPipe(createReviewSchema)) dto: CreateReviewDto) {
    return this.reviews.create(user.id, dto);
  }

  @Post('list')
  list(@Body(new ZodValidationPipe(listReviewsSchema)) query: ListReviewsDto) {
    return this.reviews.list(query);
  }

  @Post('mine')
  mine(@CurrentUser() user: any, @Body() body: { page?: number; limit?: number }) {
    return this.reviews.getMyReviews(user.id, body.page ?? 1, body.limit ?? 20);
  }

  @Post('respond')
  respond(@CurrentUser() user: any, @Body(new ZodValidationPipe(respondToReviewSchema)) dto: RespondToReviewDto) {
    return this.reviews.respond(user.id, dto);
  }
}

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminReviewController {
  constructor(private reviews: ReviewService) {}

  @Post('delete')
  delete(@Body(new ZodValidationPipe(deleteReviewSchema)) dto: DeleteReviewDto) {
    return this.reviews.adminDelete(dto);
  }
}
