import { z } from 'zod';

// Country config blob — kept permissive (passthrough) so the admin UI can evolve
// the shape without backend churn; the documented keys are validated when present.
export const countryConfigSchema = z
  .object({
    kycRules: z.array(z.any()).optional(),
    payoutMethods: z.array(z.any()).optional(),
    taxRules: z.array(z.any()).optional(),
    currencies: z.array(z.string()).optional(),
    minWithdrawalAmount: z.number().nonnegative().optional(),
    maxWithdrawalAmount: z.number().nonnegative().optional(),
  })
  .passthrough();

export const createCountrySchema = z.object({
  code: z.string().min(2).max(5),
  name: z.string().min(1),
  currency: z.string().min(1),
  currencySymbol: z.string().min(1).optional(),
  taxRate: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
  config: countryConfigSchema.optional(),
});

export type CreateCountryDto = z.infer<typeof createCountrySchema>;

export const updateCountrySchema = createCountrySchema.partial().omit({ code: true });

export type UpdateCountryDto = z.infer<typeof updateCountrySchema>;

export type UpdateCountryConfigDto = z.infer<typeof countryConfigSchema>;
