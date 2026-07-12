import { Module } from '@nestjs/common';
import { AdminModerationController, ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  controllers: [AdminModerationController, ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
