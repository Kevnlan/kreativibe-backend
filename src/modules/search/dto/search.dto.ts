import { z } from 'zod';

export const searchContentSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['VIDEO', 'IMAGE', 'AUDIO', 'BRAND_ASSET']).optional(),
  platform: z.enum(['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'RADIO', 'PRINT']).optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['relevance', 'price_low', 'price_high', 'newest', 'popular']).default('relevance'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type SearchContentDto = z.infer<typeof searchContentSchema>;

export const searchCreatorsSchema = z.object({
  query: z.string().min(1),
  category: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  isVerified: z.boolean().optional(),
  country: z.string().optional(),
  sortBy: z.enum(['relevance', 'rating', 'earnings', 'newest']).default('relevance'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type SearchCreatorsDto = z.infer<typeof searchCreatorsSchema>;

export const searchCampaignsSchema = z.object({
  query: z.string().min(1),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  platform: z.enum(['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'RADIO', 'PRINT']).optional(),
  contentType: z.enum(['VIDEO', 'IMAGE', 'AUDIO', 'BRAND_ASSET']).optional(),
  minBudget: z.coerce.number().min(0).optional(),
  maxBudget: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type SearchCampaignsDto = z.infer<typeof searchCampaignsSchema>;

export const recommendationsSchema = z.object({
  type: z.enum(['content', 'creators', 'campaigns']).default('content'),
  limit: z.coerce.number().int().positive().max(20).default(10),
});
export type RecommendationsDto = z.infer<typeof recommendationsSchema>;
