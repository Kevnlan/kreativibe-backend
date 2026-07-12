import { Controller, Post, Body, UseGuards } from '@nestjs/common';
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
import { campaignIdSchema, CampaignIdDto, milestoneIdSchema, MilestoneIdDto } from './dto/campaign-id.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreatorCampaignController {
  constructor(
    private proposals: ProposalService,
    private milestones: MilestoneService,
  ) {}

  @Post('proposal/get')
  @Roles(Role.CREATOR, Role.BRAND)
  getProposal(@CurrentUser() user: any, @Body(new ZodValidationPipe(campaignIdSchema)) dto: CampaignIdDto) {
    return this.proposals.get(user.id, user.role, dto.campaignId);
  }

  @Post('proposal/save')
  @Roles(Role.CREATOR)
  saveProposal(@CurrentUser() user: any, @Body(new ZodValidationPipe(saveProposalSchema)) dto: SaveProposalDto) {
    return this.proposals.save(user.id, dto.campaignId, dto);
  }

  @Post('proposal/submit')
  @Roles(Role.CREATOR)
  submitProposal(@CurrentUser() user: any, @Body(new ZodValidationPipe(campaignIdSchema)) dto: CampaignIdDto) {
    return this.proposals.submit(user.id, dto.campaignId);
  }

  @Post('milestones/list')
  @Roles(Role.CREATOR, Role.BRAND)
  listMilestones(@CurrentUser() user: any, @Body(new ZodValidationPipe(campaignIdSchema)) dto: CampaignIdDto) {
    return this.milestones.list(user.id, user.role, dto.campaignId);
  }

  @Post('milestones/delivery/get')
  @Roles(Role.CREATOR, Role.BRAND)
  getDelivery(@CurrentUser() user: any, @Body(new ZodValidationPipe(milestoneIdSchema)) dto: MilestoneIdDto) {
    return this.milestones.getDelivery(user.id, user.role, dto.campaignId, dto.milestoneId);
  }

  @Post('milestones/delivery/submit')
  @Roles(Role.CREATOR)
  submitDelivery(@CurrentUser() user: any, @Body(new ZodValidationPipe(submitDeliverySchema)) dto: SubmitDeliveryDto) {
    return this.milestones.submitDelivery(user.id, dto.campaignId, dto.milestoneId, dto);
  }

  @Post('milestones/delivery/approve')
  @Roles(Role.BRAND)
  approveDelivery(@CurrentUser() user: any, @Body(new ZodValidationPipe(milestoneIdSchema)) dto: MilestoneIdDto) {
    return this.milestones.approveDelivery(user.id, dto.campaignId, dto.milestoneId);
  }

  @Post('milestones/delivery/reject')
  @Roles(Role.BRAND)
  rejectDelivery(@CurrentUser() user: any, @Body(new ZodValidationPipe(rejectDeliverySchema)) dto: RejectDeliveryDto) {
    return this.milestones.rejectDelivery(user.id, dto.campaignId, dto.milestoneId, dto);
  }

  @Post('milestones/delivery/request-revision')
  @Roles(Role.BRAND)
  requestRevision(@CurrentUser() user: any, @Body(new ZodValidationPipe(requestRevisionSchema)) dto: RequestRevisionDto) {
    return this.milestones.requestRevision(user.id, dto.campaignId, dto.milestoneId, dto);
  }
}
