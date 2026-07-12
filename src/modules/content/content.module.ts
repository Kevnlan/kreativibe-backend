import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentAiService } from './content-ai.service';
import { AiCompletionService } from '../../shared/ai-completion.service';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [ModerationModule],
  controllers: [ContentController],
  providers: [ContentService, ContentAiService, AiCompletionService],
})
export class ContentModule {}
