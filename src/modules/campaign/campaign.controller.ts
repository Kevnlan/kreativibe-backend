import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CampaignService } from './campaign.service';
import { CampaignApplicationService } from './campaign-application.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createCampaignSchema, CreateCampaignDto } from './dto/create-campaign.dto';
import { updateCampaignSchema, UpdateCampaignDto } from './dto/update-campaign.dto';
import { listCampaignsSchema, ListCampaignsDto, marketplaceCampaignsSchema, MarketplaceCampaignsDto } from './dto/list-campaigns.dto';
import { createApplicationSchema, CreateApplicationDto } from './dto/application.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignController {
  constructor(
    private campaigns: CampaignService,
    private applications: CampaignApplicationService,
  ) {}

  @Post()
  @Roles(Role.BRAND)
  create(@CurrentUser() user: any, @Body(new ZodValidationPipe(createCampaignSchema)) dto: CreateCampaignDto) {
    return this.campaigns.create(user.id, dto);
  }

  @Post('list')
  @Roles(Role.BRAND)
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(listCampaignsSchema)) query: ListCampaignsDto) {
    return this.campaigns.list(user.id, query);
  }

  // Public/non-sensitive marketplace browsing — left as GET per platform convention exception.
  @Get('marketplace')
  @Roles(Role.CREATOR)
  marketplace(@Query(new ZodValidationPipe(marketplaceCampaignsSchema)) query: MarketplaceCampaignsDto) {
    return this.campaigns.marketplace(query);
  }

  @Get('marketplace/:id')
  @Roles(Role.CREATOR)
  marketplaceGet(@Param('id') id: string) {
    return this.campaigns.getPublic(id);
  }

  @Post('get')
  @Roles(Role.BRAND)
  get(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.campaigns.get(user.id, dto.id);
  }

  @Post('update')
  @Roles(Role.BRAND)
  update(@CurrentUser() user: any, @Body(new ZodValidationPipe(updateCampaignSchema)) dto: UpdateCampaignDto) {
    return this.campaigns.update(user.id, dto.id, dto);
  }

  @Post('delete')
  @Roles(Role.BRAND)
  remove(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.campaigns.remove(user.id, dto.id);
  }

  @Post('publish')
  @Roles(Role.BRAND)
  publish(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.campaigns.publish(user.id, dto.id);
  }

  @Post('pause')
  @Roles(Role.BRAND)
  pause(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.campaigns.pause(user.id, dto.id);
  }

  @Post('resume')
  @Roles(Role.BRAND)
  resume(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.campaigns.resume(user.id, dto.id);
  }

  @Post('complete')
  @Roles(Role.BRAND)
  complete(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.campaigns.complete(user.id, dto.id);
  }

  @Post('cancel')
  @Roles(Role.BRAND)
  cancel(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.campaigns.cancel(user.id, dto.id);
  }

  @Post('stats')
  @Roles(Role.BRAND)
  stats(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.campaigns.stats(user.id, dto.id);
  }

  @Post('applications/apply')
  @Roles(Role.CREATOR)
  apply(@CurrentUser() user: any, @Body(new ZodValidationPipe(createApplicationSchema)) dto: CreateApplicationDto) {
    return this.applications.apply(user.id, dto.campaignId, dto);
  }

  @Post('applications/list')
  @Roles(Role.BRAND)
  listApplications(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.applications.listForCampaign(user.id, dto.id);
  }
}
