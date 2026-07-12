import { z } from 'zod';

export const createApplicationSchema = z.object({
  campaignId: z.string(),
  message: z.string().max(2000).optional(),
  proposedRate: z.number().nonnegative().optional(),
  currency: z.string().max(5).default('KES'),
});

export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = z.object({
  id: z.string(),
  status: z.enum(['UNDER_REVIEW', 'SHORTLISTED', 'ACCEPTED', 'REJECTED']),
});

export type UpdateApplicationDto = z.infer<typeof updateApplicationSchema>;
