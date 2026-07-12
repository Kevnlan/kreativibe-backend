import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { AiCompletionService } from '../../shared/ai-completion.service';

@Module({
  controllers: [AiAssistantController],
  providers: [AiAssistantService, AiCompletionService],
})
export class AiAssistantModule {}
