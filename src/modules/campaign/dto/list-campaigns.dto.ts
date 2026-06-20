import { z } from 'zod';

export const listCampaignsSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListCampaignsDto = z.infer<typeof listCampaignsSchema>;

export const marketplaceCampaignsSchema = z.object({
  platform: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type MarketplaceCampaignsDto = z.infer<typeof marketplaceCampaignsSchema>;
