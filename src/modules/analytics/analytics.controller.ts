import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  ingestMetricsSchema, IngestMetricsDto,
  creatorAnalyticsSchema, CreatorAnalyticsDto,
  campaignAnalyticsSchema, CampaignAnalyticsDto,
  contentAnalyticsSchema, ContentAnalyticsDto,
  exportAnalyticsSchema, ExportAnalyticsDto,
} from './dto/analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Post('creator/summary')
  @Roles(Role.CREATOR)
  creatorSummary(@CurrentUser() user: any, @Body(new ZodValidationPipe(creatorAnalyticsSchema)) dto: CreatorAnalyticsDto) {
    return this.analytics.creatorSummary(user.id, dto);
  }

  @Post('campaign/summary')
  @Roles(Role.BRAND, Role.CREATOR, Role.ADMIN)
  campaignSummary(@Body(new ZodValidationPipe(campaignAnalyticsSchema)) dto: CampaignAnalyticsDto) {
    return this.analytics.campaignSummary(dto);
  }

  @Post('content/summary')
  @Roles(Role.CREATOR, Role.BRAND, Role.ADMIN)
  contentSummary(@Body(new ZodValidationPipe(contentAnalyticsSchema)) dto: ContentAnalyticsDto) {
    return this.analytics.contentSummary(dto);
  }

  @Post('export')
  @Roles(Role.CREATOR, Role.BRAND, Role.ADMIN)
  export(@Body(new ZodValidationPipe(exportAnalyticsSchema)) dto: ExportAnalyticsDto) {
    return this.analytics.export(dto);
  }
}

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminAnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Post('ingest')
  ingest(@Body(new ZodValidationPipe(ingestMetricsSchema)) dto: IngestMetricsDto) {
    return this.analytics.ingest(dto);
  }
}
