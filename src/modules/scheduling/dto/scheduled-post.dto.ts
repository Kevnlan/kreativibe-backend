import { z } from 'zod';

export const createScheduledPostSchema = z.object({
  title: z.string().min(1).max(200),
  platform: z.enum(['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK']),
  scheduledDate: z.string().min(1),
  scheduledTime: z.string().min(1),
  content: z.string().max(2000).optional(),
  media: z.array(z.string()).default([]),
  socialAccountId: z.string().optional(),
});

export type CreateScheduledPostDto = z.infer<typeof createScheduledPostSchema>;

export const updateScheduledPostSchema = createScheduledPostSchema.partial();

export type UpdateScheduledPostDto = z.infer<typeof updateScheduledPostSchema>;
