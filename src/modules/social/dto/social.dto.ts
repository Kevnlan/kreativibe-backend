import { z } from 'zod';

export const socialPlatformSchema = z.enum(['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'YOUTUBE', 'X']);

export const connectSchema = z.object({
  platform: socialPlatformSchema,
  redirectUrl: z.string(),
});

export type ConnectDto = z.infer<typeof connectSchema>;

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type OauthCallbackDto = z.infer<typeof oauthCallbackSchema>;

export const refreshTokenSchema = z.object({
  accountId: z.string().min(1),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
