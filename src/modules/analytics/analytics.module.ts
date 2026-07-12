import { Module } from '@nestjs/common';
import { AnalyticsController, AdminAnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
