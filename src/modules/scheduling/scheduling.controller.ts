import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SchedulingService } from './scheduling.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createScheduledPostSchema, CreateScheduledPostDto, updateScheduledPostSchema, UpdateScheduledPostDto } from './dto/scheduled-post.dto';

@Controller('campaigns/:campaignId/schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class SchedulingController {
  constructor(private scheduling: SchedulingService) {}

  @Post('list')
  list(@CurrentUser() user: any, @Param('campaignId') campaignId: string) {
    return this.scheduling.list(user.id, campaignId);
  }

  @Post('create')
  create(
    @CurrentUser() user: any,
    @Param('campaignId') campaignId: string,
    @Body(new ZodValidationPipe(createScheduledPostSchema)) dto: CreateScheduledPostDto,
  ) {
    return this.scheduling.create(user.id, campaignId, dto);
  }

  @Post(':postId/update')
  update(
    @CurrentUser() user: any,
    @Param('campaignId') campaignId: string,
    @Param('postId') postId: string,
    @Body(new ZodValidationPipe(updateScheduledPostSchema)) dto: UpdateScheduledPostDto,
  ) {
    return this.scheduling.update(user.id, campaignId, postId, dto);
  }

  @Post(':postId/delete')
  remove(@CurrentUser() user: any, @Param('campaignId') campaignId: string, @Param('postId') postId: string) {
    return this.scheduling.remove(user.id, campaignId, postId);
  }

  @Post(':postId/publish-now')
  publishNow(@CurrentUser() user: any, @Param('campaignId') campaignId: string, @Param('postId') postId: string) {
    return this.scheduling.publishNow(user.id, campaignId, postId);
  }
}
