import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentAiService } from './content-ai.service';
import { AiCompletionService } from '../../shared/ai-completion.service';

@Module({
  controllers: [ContentController],
  providers: [ContentService, ContentAiService, AiCompletionService],
})
export class ContentModule {}
