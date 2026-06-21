import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller';
import { CampaignApplicationController, CreatorApplicationsController } from './campaign-application.controller';
import { CampaignAiController } from './campaign-ai.controller';
import { CampaignService } from './campaign.service';
import { CampaignApplicationService } from './campaign-application.service';
import { CampaignAiService } from './campaign-ai.service';
import { AiCompletionService } from '../../shared/ai-completion.service';

@Module({
  controllers: [CampaignController, CampaignApplicationController, CreatorApplicationsController, CampaignAiController],
  providers: [CampaignService, CampaignApplicationService, CampaignAiService, AiCompletionService],
})
export class CampaignModule {}
