import { z } from 'zod';

export const updateSettingsSchema = z.object({
  emailFrequency: z.enum(['INSTANT', 'DAILY', 'WEEKLY', 'NEVER']).optional(),
  pushEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  notificationTypes: z.array(z.string()).optional(),
  profileVisible: z.boolean().optional(),
  showEarnings: z.boolean().optional(),
  allowDirectMessages: z.boolean().optional(),
  showInSearch: z.boolean().optional(),
  preferredLanguage: z.string().max(10).optional(),
  preferredCurrency: z.string().max(5).optional(),
  timezone: z.string().max(50).optional(),
});
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
