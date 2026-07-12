import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createSessionSchema, CreateSessionDto,
  chatSchema, ChatDto,
  listSessionsSchema, ListSessionsDto,
  getSessionSchema, GetSessionDto,
  contentSuggestionsSchema, ContentSuggestionsDto,
  pricingAdviceSchema, PricingAdviceDto,
  creatorMatchSchema, CreatorMatchDto,
} from './dto/ai-assistant.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
export class AiAssistantController {
  constructor(private ai: AiAssistantService) {}

  @Post('sessions/create')
  createSession(@CurrentUser() user: any, @Body(new ZodValidationPipe(createSessionSchema)) dto: CreateSessionDto) {
    return this.ai.createSession(user.id, dto);
  }

  @Post('sessions/list')
  listSessions(@CurrentUser() user: any, @Body(new ZodValidationPipe(listSessionsSchema)) dto: ListSessionsDto) {
    return this.ai.listSessions(user.id, dto);
  }

  @Post('sessions/get')
  getSession(@CurrentUser() user: any, @Body(new ZodValidationPipe(getSessionSchema)) dto: GetSessionDto) {
    return this.ai.getSession(user.id, dto.sessionId);
  }

  @Post('sessions/delete')
  deleteSession(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.ai.deleteSession(user.id, dto.id);
  }

  @Post('chat')
  chat(@CurrentUser() user: any, @Body(new ZodValidationPipe(chatSchema)) dto: ChatDto) {
    return this.ai.chat(user.id, dto);
  }

  @Post('content-suggestions')
  contentSuggestions(@Body(new ZodValidationPipe(contentSuggestionsSchema)) dto: ContentSuggestionsDto) {
    return this.ai.contentSuggestions(dto);
  }

  @Post('pricing-advice')
  pricingAdvice(@Body(new ZodValidationPipe(pricingAdviceSchema)) dto: PricingAdviceDto) {
    return this.ai.pricingAdvice(dto);
  }

  @Post('creator-match')
  creatorMatch(@CurrentUser() user: any, @Body(new ZodValidationPipe(creatorMatchSchema)) dto: CreatorMatchDto) {
    return this.ai.creatorMatch(user.id, dto);
  }
}
