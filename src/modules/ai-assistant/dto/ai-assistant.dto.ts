import { z } from 'zod';

export const createSessionSchema = z.object({
  type: z.enum(['CAMPAIGN_BUILDER', 'CONTENT_SUGGESTIONS', 'PRICING_ADVISOR', 'CREATOR_MATCH', 'GENERAL']).default('GENERAL'),
  title: z.string().max(200).optional(),
  context: z.any().optional(),
});
export type CreateSessionDto = z.infer<typeof createSessionSchema>;

export const chatSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(4000),
});
export type ChatDto = z.infer<typeof chatSchema>;

export const listSessionsSchema = z.object({
  type: z.enum(['CAMPAIGN_BUILDER', 'CONTENT_SUGGESTIONS', 'PRICING_ADVISOR', 'CREATOR_MATCH', 'GENERAL']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type ListSessionsDto = z.infer<typeof listSessionsSchema>;

export const getSessionSchema = z.object({
  sessionId: z.string().min(1),
});
export type GetSessionDto = z.infer<typeof getSessionSchema>;

export const contentSuggestionsSchema = z.object({
  platform: z.enum(['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'RADIO', 'PRINT', 'GENERAL']).optional(),
  niche: z.string().optional(),
  audience: z.string().optional(),
  campaignObjective: z.string().optional(),
});
export type ContentSuggestionsDto = z.infer<typeof contentSuggestionsSchema>;

export const pricingAdviceSchema = z.object({
  platform: z.enum(['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'RADIO', 'PRINT', 'GENERAL']),
  contentType: z.enum(['VIDEO', 'IMAGE', 'AUDIO', 'BRAND_ASSET']),
  followers: z.coerce.number().int().min(0),
  averageEngagement: z.coerce.number().min(0).max(100).optional(),
  niche: z.string().optional(),
});
export type PricingAdviceDto = z.infer<typeof pricingAdviceSchema>;

export const creatorMatchSchema = z.object({
  campaignObjective: z.string().min(1),
  targetAudience: z.string().optional(),
  platforms: z.array(z.string()).default([]),
  contentType: z.array(z.string()).default([]),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
  limit: z.coerce.number().int().positive().max(20).default(10),
});
export type CreatorMatchDto = z.infer<typeof creatorMatchSchema>;
