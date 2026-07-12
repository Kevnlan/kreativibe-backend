import { z } from 'zod';

export const saveTaxInfoSchema = z.object({
  kraPin: z.string().min(1),
  taxResidency: z.string().optional(),
  withholdingTaxOptIn: z.boolean().optional(),
});

export type SaveTaxInfoDto = z.infer<typeof saveTaxInfoSchema>;

export const generateReportSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  format: z.enum(['PDF', 'CSV']).default('PDF'),
});

export type GenerateReportDto = z.infer<typeof generateReportSchema>;

export const uploadTaxDocSchema = z.object({
  type: z.string().min(1),
});

export type UploadTaxDocDto = z.infer<typeof uploadTaxDocSchema>;
