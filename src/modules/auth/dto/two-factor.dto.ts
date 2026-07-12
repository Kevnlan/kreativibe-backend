import { z } from 'zod';

export const verifyTwoFactorSchema = z.object({
  code: z.string().min(6).max(8),
});

export type VerifyTwoFactorDto = z.infer<typeof verifyTwoFactorSchema>;

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
  code: z.string().min(6).max(8),
});

export type DisableTwoFactorDto = z.infer<typeof disableTwoFactorSchema>;

export const loginTwoFactorSchema = z.object({
  sessionToken: z.string().min(1),
  code: z.string().min(6).max(8),
});

export type LoginTwoFactorDto = z.infer<typeof loginTwoFactorSchema>;
