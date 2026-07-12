import { z } from 'zod';

export const adviseContentSchema = z.object({
  contentType: z.enum(['VIDEO', 'IMAGE', 'AUDIO', 'BRAND_ASSET']),
  niche: z.string().max(100),
  platforms: z.array(z.string()).default([]),
  currentFollowers: z.number().nonnegative().optional(),
  engagementRate: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  pricingStrategy: z.string().max(200).optional(),
  targetAudience: z.string().max(500).optional(),
  contentStyle: z.string().max(500).optional(),
});

export type AdviseContentDto = z.infer<typeof adviseContentSchema>;
