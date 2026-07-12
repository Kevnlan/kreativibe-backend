import { z } from 'zod';
import { createContentSchema } from './create-content.dto';

export const updateContentSchema = createContentSchema.deepPartial().extend({
  id: z.string(),
});

export type UpdateContentDto = z.infer<typeof updateContentSchema>;
