import { z } from 'zod';

export const updateCreatorProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().nullable(),
  instagram: z.string().max(50).optional().nullable(),
  instagramFollowers: z.number().int().nonnegative().optional().nullable(),
  tiktok: z.string().max(50).optional().nullable(),
  tiktokFollowers: z.number().int().nonnegative().optional().nullable(),
  youtube: z.string().max(100).optional().nullable(),
  youtubeFollowers: z.number().int().nonnegative().optional().nullable(),
  facebook: z.string().max(100).optional().nullable(),
  twitter: z.string().max(50).optional().nullable(),
  behance: z.string().max(100).optional().nullable(),
  categories: z.array(z.string().max(50)).max(10).optional(),
  pricing: z
    .object({
      instagramStory: z.number().nonnegative().optional().nullable(),
      instagramPost: z.number().nonnegative().optional().nullable(),
      instagramReel: z.number().nonnegative().optional().nullable(),
      tiktokVideo: z.number().nonnegative().optional().nullable(),
      youtubeShort: z.number().nonnegative().optional().nullable(),
      youtubeVideo: z.number().nonnegative().optional().nullable(),
    })
    .optional(),
});

export type UpdateCreatorProfileDto = z.infer<typeof updateCreatorProfileSchema>;
