import { z } from 'zod';

export const aiMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export const aiChatSchema = z.object({
  messages: z.array(aiMessageSchema).min(1),
  conversationId: z.string().optional(),
});

export type AiChatDto = z.infer<typeof aiChatSchema>;

export const aiBriefSchema = z.object({
  messages: z.array(aiMessageSchema).min(1),
});

export type AiBriefDto = z.infer<typeof aiBriefSchema>;

const budgetSchema = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  currency: z.string().max(5).default('KES'),
});

const campaignBriefSchema = z.object({
  title: z.string(),
  objective: z.string(),
  targetAudience: z.object({
    demographics: z.array(z.string()).default([]),
    interests: z.array(z.string()).default([]),
    location: z.string().nullable().optional(),
  }),
  platforms: z.array(z.string()).default([]),
  contentType: z.array(z.string()).default([]),
  budget: budgetSchema,
  timeline: z.object({
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    milestones: z.array(z.string()).default([]),
  }),
  deliverables: z.array(z.string()).default([]),
});

export const recommendPackagesSchema = z.object({
  brief: campaignBriefSchema,
});

export type RecommendPackagesDto = z.infer<typeof recommendPackagesSchema>;

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
  messages: z.array(aiMessageSchema).default([]),
});

export type CreateConversationDto = z.infer<typeof createConversationSchema>;
