import { z } from 'zod';

export const idSchema = z.object({
  id: z.string(),
});

export type IdDto = z.infer<typeof idSchema>;
