import { z } from 'zod';

export const listPointsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListPointsDto = z.infer<typeof listPointsSchema>;
