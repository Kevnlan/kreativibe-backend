import { z } from 'zod';

const contentMetadataSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  platforms: z.array(z.enum(['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'RADIO', 'PRINT', 'GENERAL'])).default([]),
  tags: z.array(z.string()).default([]),
  brand: z.string().max(200).optional(),
});

export const createContentSchema = z.object({
  type: z.enum(['VIDEO', 'IMAGE', 'AUDIO', 'BRAND_ASSET']),
  format: z.string().max(50).optional(),
  metadata: contentMetadataSchema,
  coverImage: z.string().optional(),
  mediaUrls: z.array(z.string()).default([]),
  thumbnailUrl: z.string().optional(),
  price: z.number().nonnegative(),
  currency: z.string().max(5).default('KES'),
  intent: z.enum(['DRAFT', 'SUBMIT']).default('DRAFT'),
});

export type CreateContentDto = z.infer<typeof createContentSchema>;
