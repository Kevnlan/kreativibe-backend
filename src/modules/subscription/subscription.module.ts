import { Module } from '@nestjs/common';
import { SubscriptionController, AdminSubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [SubscriptionController, AdminSubscriptionController],
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
