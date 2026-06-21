import { Module } from '@nestjs/common';
import { CreatorCampaignController } from './creator-campaign.controller';
import { ProposalService } from './proposal.service';
import { MilestoneService } from './milestone.service';

@Module({
  controllers: [CreatorCampaignController],
  providers: [ProposalService, MilestoneService],
})
export class CreatorCampaignModule {}
