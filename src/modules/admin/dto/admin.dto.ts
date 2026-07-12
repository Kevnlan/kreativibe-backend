import { z } from 'zod';

export const listUsersSchema = z.object({
  role: z.enum(['CREATOR', 'BRAND', 'ADMIN', 'SUPPORT_AGENT']).optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListUsersDto = z.infer<typeof listUsersSchema>;

export const userActionSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(1).max(500),
});
export type UserActionDto = z.infer<typeof userActionSchema>;

export const verifyUserSchema = z.object({
  userId: z.string().min(1),
  verified: z.boolean(),
});
export type VerifyUserDto = z.infer<typeof verifyUserSchema>;

export const listAuditLogsSchema = z.object({
  action: z.enum([
    'USER_BANNED', 'USER_SUSPENDED', 'USER_REINSTATED', 'USER_VERIFIED',
    'USER_VERIFICATION_REVOKED', 'CONTENT_REMOVED', 'CONTENT_FEATURED',
    'CONTENT_UNFEATURED', 'LICENSE_REVOKED', 'COMMISSION_RATE_CHANGED',
    'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED', 'SYSTEM_CONFIG_UPDATED',
    'MODERATION_RULE_CREATED', 'MODERATION_RULE_UPDATED', 'MODERATION_RULE_DELETED',
  ]).optional(),
  actorId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListAuditLogsDto = z.infer<typeof listAuditLogsSchema>;

export const contentActionSchema = z.object({
  contentId: z.string().min(1),
  reason: z.string().min(1).max(500),
});
export type ContentActionDto = z.infer<typeof contentActionSchema>;

export const featureContentSchema = z.object({
  contentId: z.string().min(1),
  featured: z.boolean(),
});
export type FeatureContentDto = z.infer<typeof featureContentSchema>;

export const updateCommissionSchema = z.object({
  rate: z.number().min(0).max(1),
  transactionType: z.enum(['PURCHASE', 'COMMISSION', 'PAYOUT', 'REFUND', 'ADJUSTMENT', 'TAX_DEDUCTION', 'TOPUP']).default('PURCHASE'),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
});
export type UpdateCommissionDto = z.infer<typeof updateCommissionSchema>;
