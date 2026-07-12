import { Module } from '@nestjs/common';
import { CommunityController, AdminCommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [CommunityController, AdminCommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
