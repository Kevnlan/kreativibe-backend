import { z } from 'zod';

const deliveryItemSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'LINK']),
  url: z.string().min(1),
  thumbnail: z.string().optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const submitDeliverySchema = z.object({
  campaignId: z.string(),
  milestoneId: z.string(),
  items: z.array(deliveryItemSchema).min(1),
  notes: z.string().max(2000).optional(),
});

export type SubmitDeliveryDto = z.infer<typeof submitDeliverySchema>;

export const rejectDeliverySchema = z.object({
  campaignId: z.string(),
  milestoneId: z.string(),
  reason: z.string().min(1).max(1000),
});

export type RejectDeliveryDto = z.infer<typeof rejectDeliverySchema>;

export const requestRevisionSchema = z.object({
  campaignId: z.string(),
  milestoneId: z.string(),
  notes: z.string().min(1).max(1000),
});

export type RequestRevisionDto = z.infer<typeof requestRevisionSchema>;
