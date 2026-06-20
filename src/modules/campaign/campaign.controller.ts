import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
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

  @Get()
  @Roles(Role.BRAND)
  list(@CurrentUser() user: any, @Query(new ZodValidationPipe(listCampaignsSchema)) query: ListCampaignsDto) {
    return this.campaigns.list(user.id, query);
  }

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

  @Get(':id')
  @Roles(Role.BRAND)
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaigns.get(user.id, id);
  }

  @Put(':id')
  @Roles(Role.BRAND)
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCampaignSchema)) dto: UpdateCampaignDto,
  ) {
    return this.campaigns.update(user.id, id, dto);
  }

  @Delete(':id')
  @Roles(Role.BRAND)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaigns.remove(user.id, id);
  }

  @Post(':id/publish')
  @Roles(Role.BRAND)
  publish(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaigns.publish(user.id, id);
  }

  @Post(':id/pause')
  @Roles(Role.BRAND)
  pause(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaigns.pause(user.id, id);
  }

  @Post(':id/resume')
  @Roles(Role.BRAND)
  resume(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaigns.resume(user.id, id);
  }

  @Post(':id/complete')
  @Roles(Role.BRAND)
  complete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaigns.complete(user.id, id);
  }

  @Post(':id/cancel')
  @Roles(Role.BRAND)
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaigns.cancel(user.id, id);
  }

  @Get(':id/stats')
  @Roles(Role.BRAND)
  stats(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaigns.stats(user.id, id);
  }

  @Post(':id/applications')
  @Roles(Role.CREATOR)
  apply(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createApplicationSchema)) dto: CreateApplicationDto,
  ) {
    return this.applications.apply(user.id, id, dto);
  }

  @Get(':id/applications')
  @Roles(Role.BRAND)
  listApplications(@CurrentUser() user: any, @Param('id') id: string) {
    return this.applications.listForCampaign(user.id, id);
  }
}
