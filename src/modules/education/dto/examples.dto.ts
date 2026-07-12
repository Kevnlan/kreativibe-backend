import { z } from 'zod';

export const listExamplesSchema = z.object({
  niche: z.string().optional(),
});

export type ListExamplesDto = z.infer<typeof listExamplesSchema>;
