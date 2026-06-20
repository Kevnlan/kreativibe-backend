import { z } from 'zod';

// Fields persisted on CreatorKyc + social handles mirrored onto CreatorProfile.
const socialFields = {
  instagram: z.string().optional(),
  instagramFollowers: z.number().int().nonnegative().optional(),
  tiktok: z.string().optional(),
  tiktokFollowers: z.number().int().nonnegative().optional(),
  youtube: z.string().optional(),
  youtubeFollowers: z.number().int().nonnegative().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
};

export const submitKycSchema = z
  .object({
    nationalId: z.string().min(1),
    kraPin: z.string().min(1),
    phone: z.string().min(1),
    city: z.string().min(1),
    dateOfBirth: z.string().min(1),
    idFrontUrl: z.string().url(),
    idBackUrl: z.string().url(),
    kraCertUrl: z.string().url(),
    bio: z.string().min(1),
    categories: z.array(z.string()).min(1),
    portfolioUrls: z.array(z.string()).optional(),
    ...socialFields,
  })
  .refine(
    (d) => Boolean(d.instagram || d.tiktok || d.youtube || d.facebook || d.twitter),
    { message: 'At least one social platform is required', path: ['instagram'] },
  );

export type SubmitKycDto = z.infer<typeof submitKycSchema>;

// Resubmit accepts any subset of the submit fields (no required-field / social refinement).
export const resubmitKycSchema = z
  .object({
    nationalId: z.string().optional(),
    kraPin: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    dateOfBirth: z.string().optional(),
    idFrontUrl: z.string().url().optional(),
    idBackUrl: z.string().url().optional(),
    kraCertUrl: z.string().url().optional(),
    bio: z.string().optional(),
    categories: z.array(z.string()).optional(),
    portfolioUrls: z.array(z.string()).optional(),
    ...socialFields,
  });

export type ResubmitKycDto = z.infer<typeof resubmitKycSchema>;

export const uploadSchema = z.object({
  purpose: z.string().optional(),
});

export type UploadDto = z.infer<typeof uploadSchema>;
