import { z } from 'zod';
import { createCampaignSchema } from './create-campaign.dto';

export const updateCampaignSchema = createCampaignSchema.partial().extend({
  id: z.string(),
});

export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>;
