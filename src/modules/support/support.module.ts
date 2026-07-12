import { Module } from '@nestjs/common';
import { SupportController, AdminSupportController } from './support.controller';
import { SupportService } from './support.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService],
})
export class SupportModule {}
