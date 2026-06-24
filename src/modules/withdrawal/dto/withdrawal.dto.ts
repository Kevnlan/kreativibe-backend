import { z } from 'zod';

export const listWithdrawalsSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'APPROVED', 'COMPLETED', 'REJECTED', 'FAILED']).optional(),
  method: z.enum(['MPESA', 'BANK']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListWithdrawalsDto = z.infer<typeof listWithdrawalsSchema>;

const mpesaDetails = z.object({
  phoneNumber: z.string().min(1),
  accountName: z.string().min(1),
});

const bankDetails = z.object({
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  accountName: z.string().min(1),
  branchCode: z.string().optional(),
  swiftCode: z.string().optional(),
});

export const createWithdrawalSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('MPESA'), amount: z.number().positive(), accountDetails: mpesaDetails }),
  z.object({ method: z.literal('BANK'), amount: z.number().positive(), accountDetails: bankDetails }),
]);

export type CreateWithdrawalDto = z.infer<typeof createWithdrawalSchema>;

export const approveWithdrawalSchema = z.object({
  id: z.string(),
  adminComments: z.string().optional(),
});

export type ApproveWithdrawalDto = z.infer<typeof approveWithdrawalSchema>;

export const rejectWithdrawalSchema = z.object({
  id: z.string(),
  rejectionReason: z.string().min(1),
  adminComments: z.string().optional(),
});

export type RejectWithdrawalDto = z.infer<typeof rejectWithdrawalSchema>;
