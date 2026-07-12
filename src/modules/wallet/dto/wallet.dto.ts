import { z } from 'zod';

export const listTransactionsSchema = z.object({
  type: z.enum(['TOPUP', 'PURCHASE', 'COMMISSION', 'PAYOUT', 'REFUND', 'ADJUSTMENT', 'TAX_DEDUCTION']).optional(),
  direction: z.enum(['CREDIT', 'DEBIT']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListTransactionsDto = z.infer<typeof listTransactionsSchema>;

export const topupSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(['MPESA', 'CARD', 'BANK_TRANSFER']),
  reference: z.string().optional(),
});

export type TopupDto = z.infer<typeof topupSchema>;

export const exportTransactionsSchema = listTransactionsSchema.extend({
  format: z.enum(['CSV', 'PDF']).default('CSV'),
});

export type ExportTransactionsDto = z.infer<typeof exportTransactionsSchema>;
