import { z } from 'zod';

export const createCampaignSchema = z.object({
  title: z.string().min(2).max(200),
  objective: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  audience: z.string().max(500).optional(),
  platforms: z.array(z.string()).default([]),
  contentTypes: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
  milestones: z.array(z.string()).default([]),
  messaging: z.string().max(1000).optional(),
  tone: z.string().max(100).optional(),
  budgetMin: z.number().nonnegative(),
  budgetMax: z.number().nonnegative().optional(),
  currency: z.string().max(5).default('KES'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  source: z.enum(['manual', 'ai']).default('manual'),
  brief: z.record(z.string(), z.any()).optional(),
});

export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
