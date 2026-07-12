import { z } from 'zod';

export const startConversationSchema = z.object({
  recipientId: z.string().min(1),
  campaignId: z.string().optional(),
  initialMessage: z.string().min(1).max(2000),
});
export type StartConversationDto = z.infer<typeof startConversationSchema>;

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().min(1).max(2000),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    name: z.string().optional(),
  })).optional(),
});
export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const listConversationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type ListConversationsDto = z.infer<typeof listConversationsSchema>;

export const listMessagesSchema = z.object({
  conversationId: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
export type ListMessagesDto = z.infer<typeof listMessagesSchema>;

export const markReadSchema = z.object({
  conversationId: z.string().min(1),
});
export type MarkReadDto = z.infer<typeof markReadSchema>;
