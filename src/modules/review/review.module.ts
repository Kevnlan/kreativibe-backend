import { Module } from '@nestjs/common';
import { ReviewController, AdminReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ReviewController, AdminReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
