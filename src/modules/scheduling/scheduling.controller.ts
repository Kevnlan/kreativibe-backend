import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SchedulingService } from './scheduling.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createScheduledPostSchema, CreateScheduledPostDto,
  updateScheduledPostSchema, UpdateScheduledPostDto,
  campaignPostIdSchema, CampaignPostIdDto,
  campaignIdOnlySchema, CampaignIdOnlyDto,
} from './dto/scheduled-post.dto';

@Controller('campaigns/schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class SchedulingController {
  constructor(private scheduling: SchedulingService) {}

  @Post('list')
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(campaignIdOnlySchema)) dto: CampaignIdOnlyDto) {
    return this.scheduling.list(user.id, dto.campaignId);
  }

  @Post('create')
  create(@CurrentUser() user: any, @Body(new ZodValidationPipe(createScheduledPostSchema)) dto: CreateScheduledPostDto) {
    return this.scheduling.create(user.id, dto.campaignId, dto);
  }

  @Post('update')
  update(@CurrentUser() user: any, @Body(new ZodValidationPipe(updateScheduledPostSchema)) dto: UpdateScheduledPostDto) {
    return this.scheduling.update(user.id, dto.campaignId, dto.postId, dto);
  }

  @Post('delete')
  remove(@CurrentUser() user: any, @Body(new ZodValidationPipe(campaignPostIdSchema)) dto: CampaignPostIdDto) {
    return this.scheduling.remove(user.id, dto.campaignId, dto.postId);
  }

  @Post('publish-now')
  publishNow(@CurrentUser() user: any, @Body(new ZodValidationPipe(campaignPostIdSchema)) dto: CampaignPostIdDto) {
    return this.scheduling.publishNow(user.id, dto.campaignId, dto.postId);
  }
}
