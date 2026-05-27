import { z } from 'zod';

export const updateBrandProfileSchema = z.object({
  companyName: z.string().min(2).max(200).optional(),
  industry: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  website: z.string().url().optional().nullable(),
  phone: z.string().regex(/^\+\d{7,15}$/, 'Must be E.164 format').optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  registrationNumber: z.string().max(100).optional().nullable(),
  contactPersonName: z.string().max(100).optional().nullable(),
  contactPersonId: z.string().max(50).optional().nullable(),
  contactPersonRole: z.string().max(100).optional().nullable(),
  instagram: z.string().max(100).optional().nullable(),
  tiktok: z.string().max(100).optional().nullable(),
  youtube: z.string().max(100).optional().nullable(),
  facebook: z.string().max(100).optional().nullable(),
  twitter: z.string().max(100).optional().nullable(),
  linkedin: z.string().max(100).optional().nullable(),
});

export type UpdateBrandProfileDto = z.infer<typeof updateBrandProfileSchema>;
