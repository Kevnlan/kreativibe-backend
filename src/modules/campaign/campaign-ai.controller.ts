import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CampaignAiService } from './campaign-ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { aiChatSchema, AiChatDto, aiBriefSchema, AiBriefDto, recommendPackagesSchema, RecommendPackagesDto, createConversationSchema, CreateConversationDto } from './dto/ai.dto';

@Controller('campaigns/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BRAND)
export class CampaignAiController {
  constructor(private ai: CampaignAiService) {}

  @Post('chat')
  chat(@Body(new ZodValidationPipe(aiChatSchema)) dto: AiChatDto) {
    return this.ai.chat(dto);
  }

  @Post('brief')
  brief(@Body(new ZodValidationPipe(aiBriefSchema)) dto: AiBriefDto) {
    return this.ai.brief(dto);
  }

  @Post('packages/recommend')
  recommendPackages(@Body(new ZodValidationPipe(recommendPackagesSchema)) dto: RecommendPackagesDto) {
    return this.ai.recommendPackages(dto);
  }

  @Post('conversations')
  createConversation(@CurrentUser() user: any, @Body(new ZodValidationPipe(createConversationSchema)) dto: CreateConversationDto) {
    return this.ai.createConversation(user.id, dto);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: any) {
    return this.ai.listConversations(user.id);
  }

  @Get('conversations/:id')
  getConversation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ai.getConversation(user.id, id);
  }

  @Delete('conversations/:id')
  deleteConversation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ai.deleteConversation(user.id, id);
  }
}
