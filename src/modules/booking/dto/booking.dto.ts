import { z } from 'zod';

export const createBookingSchema = z.object({
  creatorId: z.string().min(1),
  campaignId: z.string().optional(),
  type: z.enum(['CONTENT_CREATION', 'CAMPAIGN_COLLAB', 'CONSULTATION', 'MEET_AND_GREET', 'OTHER']).default('CONTENT_CREATION'),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string(),
  endDate: z.string(),
  timezone: z.string().max(50).default('Africa/Nairobi'),
  location: z.string().max(200).optional(),
  meetingLink: z.string().url().optional(),
  price: z.coerce.number().min(0).optional(),
  currency: z.string().max(5).default('KES'),
  notes: z.string().max(2000).optional(),
});
export type CreateBookingDto = z.infer<typeof createBookingSchema>;

export const updateBookingStatusSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DECLINED', 'RESCHEDULED']),
  cancellationReason: z.string().max(500).optional(),
});
export type UpdateBookingStatusDto = z.infer<typeof updateBookingStatusSchema>;

export const rescheduleBookingSchema = z.object({
  bookingId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string().max(2000).optional(),
});
export type RescheduleBookingDto = z.infer<typeof rescheduleBookingSchema>;

export const listBookingsSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DECLINED', 'RESCHEDULED']).optional(),
  type: z.enum(['CONTENT_CREATION', 'CAMPAIGN_COLLAB', 'CONSULTATION', 'MEET_AND_GREET', 'OTHER']).optional(),
  startDateFrom: z.string().optional(),
  startDateTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type ListBookingsDto = z.infer<typeof listBookingsSchema>;

export const getBookingSchema = z.object({
  bookingId: z.string().min(1),
});
export type GetBookingDto = z.infer<typeof getBookingSchema>;
