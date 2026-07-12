import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingStatus, BookingType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
  RescheduleBookingDto,
  ListBookingsDto,
} from './dto/booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  async create(brandId: string, dto: CreateBookingDto) {
    const creator = await this.prisma.user.findUnique({ where: { id: dto.creatorId } });
    if (!creator) throw new NotFoundException({ message: 'Creator not found', code: 'CREATOR_NOT_FOUND' });
    if (creator.role !== 'CREATOR') {
      throw new BadRequestException({ message: 'Can only book creators', code: 'NOT_CREATOR' });
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException({ message: 'End date must be after start date', code: 'INVALID_DATE_RANGE' });
    }

    const booking = await this.prisma.booking.create({
      data: {
        creatorId: dto.creatorId,
        brandId,
        campaignId: dto.campaignId,
        type: dto.type as BookingType,
        title: dto.title,
        description: dto.description,
        startDate,
        endDate,
        timezone: dto.timezone,
        location: dto.location,
        meetingLink: dto.meetingLink,
        price: dto.price,
        currency: dto.currency,
        notes: dto.notes,
      },
      include: {
        creator: { select: { id: true, name: true, creatorProfile: { select: { avatar: true } } } },
        brand: { select: { id: true, name: true, brandProfile: { select: { companyName: true, logo: true } } } },
      },
    });

    await this.notifications.create(
      dto.creatorId,
      'COMMUNITY_REPLY',
      'New booking request',
      `Booking request: ${dto.title}`,
      { bookingId: booking.id },
    );

    return booking;
  }

  async list(userId: string, dto: ListBookingsDto) {
    const where: Prisma.BookingWhereInput = {
      OR: [{ creatorId: userId }, { brandId: userId }],
      ...(dto.status ? { status: dto.status as BookingStatus } : {}),
      ...(dto.type ? { type: dto.type as BookingType } : {}),
      ...(dto.startDateFrom || dto.startDateTo
        ? {
          startDate: {
            ...(dto.startDateFrom ? { gte: new Date(dto.startDateFrom) } : {}),
            ...(dto.startDateTo ? { lte: new Date(dto.startDateTo) } : {}),
          },
        }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: {
          creator: { select: { id: true, name: true, creatorProfile: { select: { avatar: true } } } },
          brand: { select: { id: true, name: true, brandProfile: { select: { companyName: true, logo: true } } } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items, total, page: dto.page, limit: dto.limit };
  }

  async get(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        creator: { select: { id: true, name: true, creatorProfile: { select: { avatar: true } } } },
        brand: { select: { id: true, name: true, brandProfile: { select: { companyName: true, logo: true } } } },
      },
    });
    if (!booking) throw new NotFoundException({ message: 'Booking not found', code: 'BOOKING_NOT_FOUND' });

    if (booking.creatorId !== userId && booking.brandId !== userId) {
      throw new ForbiddenException({ message: 'Not authorized to view this booking', code: 'NOT_AUTHORIZED' });
    }

    return booking;
  }

  async updateStatus(userId: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException({ message: 'Booking not found', code: 'BOOKING_NOT_FOUND' });

    if (booking.creatorId !== userId && booking.brandId !== userId) {
      throw new ForbiddenException({ message: 'Not authorized', code: 'NOT_AUTHORIZED' });
    }

    // Creators can confirm/decline; brands can cancel
    if (dto.status === 'CONFIRMED' && booking.creatorId !== userId) {
      throw new ForbiddenException({ message: 'Only the creator can confirm bookings', code: 'CREATOR_ONLY' });
    }
    if (dto.status === 'DECLINED' && booking.creatorId !== userId) {
      throw new ForbiddenException({ message: 'Only the creator can decline bookings', code: 'CREATOR_ONLY' });
    }

    const updated = await this.prisma.booking.update({
      where: { id: dto.bookingId },
      data: {
        status: dto.status as BookingStatus,
        cancellationReason: dto.cancellationReason,
      },
      include: {
        creator: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });

    // Notify the other party
    const notifyUserId = booking.creatorId === userId ? booking.brandId : booking.creatorId;
    await this.notifications.create(
      notifyUserId,
      'COMMUNITY_REPLY',
      `Booking ${dto.status.toLowerCase()}`,
      `Booking "${booking.title}" has been ${dto.status.toLowerCase()}`,
      { bookingId: booking.id },
    );

    return updated;
  }

  async reschedule(userId: string, dto: RescheduleBookingDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException({ message: 'Booking not found', code: 'BOOKING_NOT_FOUND' });

    if (booking.creatorId !== userId && booking.brandId !== userId) {
      throw new ForbiddenException({ message: 'Not authorized', code: 'NOT_AUTHORIZED' });
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException({ message: 'End date must be after start date', code: 'INVALID_DATE_RANGE' });
    }

    const updated = await this.prisma.booking.update({
      where: { id: dto.bookingId },
      data: {
        startDate,
        endDate,
        status: 'RESCHEDULED',
        notes: dto.notes ? `${booking.notes ?? ''}\n[Rescheduled] ${dto.notes}` : booking.notes,
      },
    });

    const notifyUserId = booking.creatorId === userId ? booking.brandId : booking.creatorId;
    await this.notifications.create(
      notifyUserId,
      'COMMUNITY_REPLY',
      'Booking rescheduled',
      `Booking "${booking.title}" has been rescheduled`,
      { bookingId: booking.id },
    );

    return updated;
  }

  async getCalendar(userId: string, month: number, year: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const bookings = await this.prisma.booking.findMany({
      where: {
        OR: [{ creatorId: userId }, { brandId: userId }],
        startDate: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['CONFIRMED', 'IN_PROGRESS', 'PENDING'] },
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true, title: true, startDate: true, endDate: true,
        status: true, type: true, location: true, meetingLink: true,
        creator: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });

    return { bookings, month, year };
  }
}
