import { z } from 'zod';

export const listModerationQueueSchema = z.object({
  status: z.enum(['QUEUED', 'IN_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListModerationQueueDto = z.infer<typeof listModerationQueueSchema>;

export const moderationActionSchema = z.object({
  contentId: z.string().min(1),
  notes: z.string().max(1000).optional(),
});
export type ModerationActionDto = z.infer<typeof moderationActionSchema>;

export const rejectContentSchema = z.object({
  contentId: z.string().min(1),
  reasons: z.array(
    z.object({
      reasonCode: z.string().min(1).max(100),
      notes: z.string().max(500).optional(),
    }),
  ).min(1),
  notes: z.string().max(1000).optional(),
});
export type RejectContentDto = z.infer<typeof rejectContentSchema>;

export const moderationStatusSchema = z.object({
  contentId: z.string().min(1),
});
export type ModerationStatusDto = z.infer<typeof moderationStatusSchema>;

export const createModerationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  ruleType: z.string().min(1).max(50),
  countryId: z.string().optional(),
  isActive: z.boolean().default(true),
});
export type CreateModerationRuleDto = z.infer<typeof createModerationRuleSchema>;

export const updateModerationRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  ruleType: z.string().min(1).max(50).optional(),
  countryId: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateModerationRuleDto = z.infer<typeof updateModerationRuleSchema>;
