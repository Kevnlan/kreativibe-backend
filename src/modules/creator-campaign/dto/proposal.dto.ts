import { z } from 'zod';

export const saveProposalSchema = z.object({
  proposedRate: z.number().nonnegative().optional(),
  currency: z.string().max(5).default('KES'),
  deliverables: z.array(z.string()).default([]),
  timeline: z.string().max(500).optional(),
  coverLetter: z.string().max(2000).optional(),
});

export type SaveProposalDto = z.infer<typeof saveProposalSchema>;
