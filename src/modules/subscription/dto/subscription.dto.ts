import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tier: z.string().min(1).max(50),
  price: z.coerce.number().min(0),
  currency: z.string().max(5).default('KES'),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  trialDays: z.coerce.number().int().min(0).default(0),
  features: z.any().optional(),
  isActive: z.boolean().default(true),
});
export type CreatePlanDto = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  planId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  price: z.coerce.number().min(0).optional(),
  currency: z.string().max(5).optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  trialDays: z.coerce.number().int().min(0).optional(),
  features: z.any().optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;

export const subscribeSchema = z.object({
  planId: z.string().min(1),
  autoRenew: z.boolean().default(true),
});
export type SubscribeDto = z.infer<typeof subscribeSchema>;

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  reason: z.string().max(500).optional(),
});
export type CancelSubscriptionDto = z.infer<typeof cancelSubscriptionSchema>;

export const listPlansSchema = z.object({
  isActive: z.boolean().optional(),
});
export type ListPlansDto = z.infer<typeof listPlansSchema>;

export const listInvoicesSchema = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type ListInvoicesDto = z.infer<typeof listInvoicesSchema>;

export const payInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  method: z.enum(['MPESA', 'CARD', 'BANK_TRANSFER']),
});
export type PayInvoiceDto = z.infer<typeof payInvoiceSchema>;
