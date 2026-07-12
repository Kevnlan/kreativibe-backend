import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  listModerationQueueSchema, ListModerationQueueDto,
  moderationActionSchema, ModerationActionDto,
  rejectContentSchema, RejectContentDto,
  moderationStatusSchema, ModerationStatusDto,
  createModerationRuleSchema, CreateModerationRuleDto,
  updateModerationRuleSchema, UpdateModerationRuleDto,
} from './dto/moderation.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('admin/moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminModerationController {
  constructor(private moderation: ModerationService) {}

  @Post('queue')
  queue(@Body(new ZodValidationPipe(listModerationQueueSchema)) query: ListModerationQueueDto) {
    return this.moderation.listQueue(query);
  }

  @Post('get')
  get(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.moderation.getEntry(dto.id);
  }

  @Post('assign')
  assign(@CurrentUser() user: any, @Body(new ZodValidationPipe(moderationActionSchema)) dto: ModerationActionDto) {
    return this.moderation.assign(user.id, dto.contentId);
  }

  @Post('approve')
  approve(@CurrentUser() user: any, @Body(new ZodValidationPipe(moderationActionSchema)) dto: ModerationActionDto) {
    return this.moderation.approve(user.id, dto);
  }

  @Post('reject')
  reject(@CurrentUser() user: any, @Body(new ZodValidationPipe(rejectContentSchema)) dto: RejectContentDto) {
    return this.moderation.reject(user.id, dto);
  }

  @Post('rules/list')
  listRules() {
    return this.moderation.listRules();
  }

  @Post('rules/create')
  createRule(@Body(new ZodValidationPipe(createModerationRuleSchema)) dto: CreateModerationRuleDto) {
    return this.moderation.createRule(dto);
  }

  @Post('rules/update')
  updateRule(@Body(new ZodValidationPipe(updateModerationRuleSchema)) dto: UpdateModerationRuleDto) {
    return this.moderation.updateRule(dto);
  }

  @Post('rules/delete')
  async deleteRule(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    await this.moderation.deleteRule(dto.id);
    return { message: 'Rule deleted' };
  }
}

@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class ModerationController {
  constructor(private moderation: ModerationService) {}

  @Post('status')
  status(@CurrentUser() user: any, @Body(new ZodValidationPipe(moderationStatusSchema)) dto: ModerationStatusDto) {
    return this.moderation.getStatus(user.id, dto.contentId);
  }

  @Post('resubmit')
  resubmit(@CurrentUser() user: any, @Body(new ZodValidationPipe(moderationStatusSchema)) dto: ModerationStatusDto) {
    return this.moderation.resubmit(user.id, dto.contentId);
  }
}
