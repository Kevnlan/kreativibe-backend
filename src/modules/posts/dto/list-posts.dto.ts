import { z } from 'zod';

export const listPostsSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'PENDING']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListPostsDto = z.infer<typeof listPostsSchema>;
