import { z } from 'zod';

export const campaignIdSchema = z.object({
  campaignId: z.string(),
});

export type CampaignIdDto = z.infer<typeof campaignIdSchema>;

export const milestoneIdSchema = z.object({
  campaignId: z.string(),
  milestoneId: z.string(),
});

export type MilestoneIdDto = z.infer<typeof milestoneIdSchema>;
