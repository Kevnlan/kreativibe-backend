import { z } from 'zod';

export const ingestMetricsSchema = z.object({
  publishedPostId: z.string().optional(),
  creatorProfileId: z.string().optional(),
  campaignId: z.string().optional(),
  platform: z.enum(['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'RADIO', 'PRINT', 'GENERAL']).optional(),
  metrics: z.array(z.object({
    metricType: z.enum(['VIEWS', 'LIKES', 'COMMENTS', 'SHARES', 'SAVES', 'IMPRESSIONS', 'REACH', 'ENGAGEMENT_RATE']),
    value: z.number().int(),
  })).min(1),
  snapshotDate: z.string().datetime().optional(),
});
export type IngestMetricsDto = z.infer<typeof ingestMetricsSchema>;

export const creatorAnalyticsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  platform: z.enum(['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'RADIO', 'PRINT', 'GENERAL']).optional(),
});
export type CreatorAnalyticsDto = z.infer<typeof creatorAnalyticsSchema>;

export const campaignAnalyticsSchema = z.object({
  campaignId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CampaignAnalyticsDto = z.infer<typeof campaignAnalyticsSchema>;

export const contentAnalyticsSchema = z.object({
  publishedPostId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type ContentAnalyticsDto = z.infer<typeof contentAnalyticsSchema>;

export const exportAnalyticsSchema = z.object({
  scope: z.enum(['creator', 'campaign', 'content']),
  scopeId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['CSV', 'JSON']).default('CSV'),
});
export type ExportAnalyticsDto = z.infer<typeof exportAnalyticsSchema>;
