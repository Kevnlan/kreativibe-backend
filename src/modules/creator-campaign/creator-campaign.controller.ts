import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ProposalService } from './proposal.service';
import { MilestoneService } from './milestone.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { saveProposalSchema, SaveProposalDto } from './dto/proposal.dto';
import { submitDeliverySchema, SubmitDeliveryDto, rejectDeliverySchema, RejectDeliveryDto, requestRevisionSchema, RequestRevisionDto } from './dto/delivery.dto';

@Controller('campaigns/:campaignId')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreatorCampaignController {
  constructor(
    private proposals: ProposalService,
    private milestones: MilestoneService,
  ) {}

  @Post('proposal/get')
  @Roles(Role.CREATOR, Role.BRAND)
  getProposal(@CurrentUser() user: any, @Param('campaignId') campaignId: string) {
    return this.proposals.get(user.id, user.role, campaignId);
  }

  @Post('proposal/save')
  @Roles(Role.CREATOR)
  saveProposal(@CurrentUser() user: any, @Param('campaignId') campaignId: string, @Body(new ZodValidationPipe(saveProposalSchema)) dto: SaveProposalDto) {
    return this.proposals.save(user.id, campaignId, dto);
  }

  @Post('proposal/submit')
  @Roles(Role.CREATOR)
  submitProposal(@CurrentUser() user: any, @Param('campaignId') campaignId: string) {
    return this.proposals.submit(user.id, campaignId);
  }

  @Post('milestones/list')
  @Roles(Role.CREATOR, Role.BRAND)
  listMilestones(@CurrentUser() user: any, @Param('campaignId') campaignId: string) {
    return this.milestones.list(user.id, user.role, campaignId);
  }

  @Post('milestones/:milestoneId/delivery/get')
  @Roles(Role.CREATOR, Role.BRAND)
  getDelivery(@CurrentUser() user: any, @Param('campaignId') campaignId: string, @Param('milestoneId') milestoneId: string) {
    return this.milestones.getDelivery(user.id, user.role, campaignId, milestoneId);
  }

  @Post('milestones/:milestoneId/delivery/submit')
  @Roles(Role.CREATOR)
  submitDelivery(
    @CurrentUser() user: any,
    @Param('campaignId') campaignId: string,
    @Param('milestoneId') milestoneId: string,
    @Body(new ZodValidationPipe(submitDeliverySchema)) dto: SubmitDeliveryDto,
  ) {
    return this.milestones.submitDelivery(user.id, campaignId, milestoneId, dto);
  }

  @Post('milestones/:milestoneId/delivery/approve')
  @Roles(Role.BRAND)
  approveDelivery(@CurrentUser() user: any, @Param('campaignId') campaignId: string, @Param('milestoneId') milestoneId: string) {
    return this.milestones.approveDelivery(user.id, campaignId, milestoneId);
  }

  @Post('milestones/:milestoneId/delivery/reject')
  @Roles(Role.BRAND)
  rejectDelivery(
    @CurrentUser() user: any,
    @Param('campaignId') campaignId: string,
    @Param('milestoneId') milestoneId: string,
    @Body(new ZodValidationPipe(rejectDeliverySchema)) dto: RejectDeliveryDto,
  ) {
    return this.milestones.rejectDelivery(user.id, campaignId, milestoneId, dto);
  }

  @Post('milestones/:milestoneId/delivery/request-revision')
  @Roles(Role.BRAND)
  requestRevision(
    @CurrentUser() user: any,
    @Param('campaignId') campaignId: string,
    @Param('milestoneId') milestoneId: string,
    @Body(new ZodValidationPipe(requestRevisionSchema)) dto: RequestRevisionDto,
  ) {
    return this.milestones.requestRevision(user.id, campaignId, milestoneId, dto);
  }
}
