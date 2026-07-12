import { z } from 'zod';

export const listNotificationsSchema = z.object({
  isRead: z.boolean().optional(),
  type: z.enum([
    'OFFER_RECEIVED', 'OFFER_COUNTERED', 'OFFER_ACCEPTED', 'OFFER_REJECTED',
    'OFFER_WITHDRAWN', 'CONTENT_APPROVED', 'CONTENT_REJECTED',
    'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED', 'WITHDRAWAL_COMPLETED',
    'POINTS_EARNED', 'COMMUNITY_REPLY', 'SUPPORT_UPDATE',
    'CAMPAIGN_APPLICATION', 'MILESTONE_APPROVED', 'MILESTONE_REJECTED',
  ]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListNotificationsDto = z.infer<typeof listNotificationsSchema>;
