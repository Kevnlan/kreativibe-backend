import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  name: z.string().min(2).max(100),
  role: z.enum(['CREATOR', 'BRAND']),
  countryId: z.string().optional(),
});

export type SignupDto = z.infer<typeof signupSchema>;
