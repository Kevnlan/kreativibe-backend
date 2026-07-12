import { z } from 'zod';

export const createReviewSchema = z.object({
  subjectId: z.string().min(1),
  subjectType: z.enum(['CREATOR', 'BRAND', 'CONTENT']),
  campaignId: z.string().optional(),
  offerId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
  isPublic: z.boolean().default(true),
});
export type CreateReviewDto = z.infer<typeof createReviewSchema>;

export const listReviewsSchema = z.object({
  subjectId: z.string().min(1),
  subjectType: z.enum(['CREATOR', 'BRAND', 'CONTENT']).optional(),
  campaignId: z.string().optional(),
  minRating: z.number().int().min(1).max(5).optional(),
  maxRating: z.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListReviewsDto = z.infer<typeof listReviewsSchema>;

export const respondToReviewSchema = z.object({
  reviewId: z.string().min(1),
  response: z.string().min(1).max(2000),
});
export type RespondToReviewDto = z.infer<typeof respondToReviewSchema>;

export const deleteReviewSchema = z.object({
  reviewId: z.string().min(1),
  reason: z.string().min(1).max(500),
});
export type DeleteReviewDto = z.infer<typeof deleteReviewSchema>;
