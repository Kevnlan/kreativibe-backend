import { z } from 'zod';

export const createOfferSchema = z.object({
  contentId: z.string().min(1),
  amount: z.number().positive(),
  message: z.string().max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
});
export type CreateOfferDto = z.infer<typeof createOfferSchema>;

export const counterOfferSchema = z.object({
  id: z.string().min(1),
  amount: z.number().positive(),
  message: z.string().max(1000).optional(),
});
export type CounterOfferDto = z.infer<typeof counterOfferSchema>;

export const offerActionSchema = z.object({
  id: z.string().min(1),
  message: z.string().max(1000).optional(),
});
export type OfferActionDto = z.infer<typeof offerActionSchema>;

export const listOffersSchema = z.object({
  status: z.enum(['PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListOffersDto = z.infer<typeof listOffersSchema>;

export const browseMarketplaceSchema = z.object({
  type: z.enum(['VIDEO', 'IMAGE', 'AUDIO', 'BRAND_ASSET']).optional(),
  platform: z.enum(['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'RADIO', 'PRINT', 'GENERAL']).optional(),
  category: z.string().optional(),
  creatorId: z.string().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type BrowseMarketplaceDto = z.infer<typeof browseMarketplaceSchema>;
