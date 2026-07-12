import { z } from 'zod';

export const listPortfolioSchema = z.object({
  creatorUserId: z.string().optional(),
});

export type ListPortfolioDto = z.infer<typeof listPortfolioSchema>;

export const addPortfolioItemSchema = z.object({
  title: z.string().min(1).max(200),
  brand: z.string().max(200).optional(),
  platform: z.enum(['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'RADIO', 'PRINT', 'GENERAL']),
  mediaUrl: z.string().optional(),
  completedAt: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type AddPortfolioItemDto = z.infer<typeof addPortfolioItemSchema>;
