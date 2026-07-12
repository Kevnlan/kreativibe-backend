import { z } from 'zod';

export const generateContractSchema = z.object({
  campaignId: z.string(),
  applicationId: z.string().min(1),
  proposedRate: z.number().nonnegative(),
  currency: z.string().max(5).default('KES'),
});

export type GenerateContractDto = z.infer<typeof generateContractSchema>;

const clauseUpdateSchema = z.object({
  id: z.string(),
  content: z.string(),
});

export const updateContractSchema = z.object({
  campaignId: z.string(),
  clauses: z.array(clauseUpdateSchema).default([]),
  additionalTerms: z.string().max(2000).optional(),
});

export type UpdateContractDto = z.infer<typeof updateContractSchema>;

export const signContractSchema = z.object({
  campaignId: z.string(),
  signature: z.string().min(1).max(200),
  signedAt: z.string().datetime().optional(),
});

export type SignContractDto = z.infer<typeof signContractSchema>;

export const campaignIdSchema = z.object({
  campaignId: z.string(),
});

export type CampaignIdDto = z.infer<typeof campaignIdSchema>;
