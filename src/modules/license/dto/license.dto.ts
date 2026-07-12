import { z } from 'zod';

export const listLicensesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListLicensesDto = z.infer<typeof listLicensesSchema>;

export const licenseContentSchema = z.object({
  contentId: z.string().min(1),
});
export type LicenseContentDto = z.infer<typeof licenseContentSchema>;

export const adminListLicensesSchema = z.object({
  brandUserId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type AdminListLicensesDto = z.infer<typeof adminListLicensesSchema>;

export const revokeLicenseSchema = z.object({
  contentId: z.string().min(1),
  reason: z.string().min(1).max(500),
});
export type RevokeLicenseDto = z.infer<typeof revokeLicenseSchema>;
