import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.enum(['ACCOUNT', 'PAYMENT', 'CONTENT', 'CAMPAIGN', 'TECHNICAL', 'OTHER']).default('OTHER'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});
export type CreateTicketDto = z.infer<typeof createTicketSchema>;

export const listTicketsSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  category: z.enum(['ACCOUNT', 'PAYMENT', 'CONTENT', 'CAMPAIGN', 'TECHNICAL', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListTicketsDto = z.infer<typeof listTicketsSchema>;

export const sendMessageSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(1).max(2000),
  attachments: z.array(z.string()).default([]),
  isInternal: z.boolean().default(false),
});
export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const updateTicketSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.enum(['ACCOUNT', 'PAYMENT', 'CONTENT', 'CAMPAIGN', 'TECHNICAL', 'OTHER']).optional(),
});
export type UpdateTicketDto = z.infer<typeof updateTicketSchema>;

export const rateTicketSchema = z.object({
  ticketId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  ratingComment: z.string().max(500).optional(),
});
export type RateTicketDto = z.infer<typeof rateTicketSchema>;
