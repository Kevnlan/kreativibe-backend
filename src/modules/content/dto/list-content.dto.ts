import { z } from 'zod';

export const listContentSchema = z.object({
  type: z.enum(['VIDEO', 'IMAGE', 'AUDIO', 'BRAND_ASSET']).optional(),
  category: z.string().optional(),
  platform: z.enum(['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'RADIO', 'PRINT', 'GENERAL']).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PUBLISHED', 'REJECTED', 'SOLD', 'ARCHIVED']).optional(),
  query: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListContentDto = z.infer<typeof listContentSchema>;
