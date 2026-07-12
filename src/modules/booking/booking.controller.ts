import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createBookingSchema, CreateBookingDto,
  updateBookingStatusSchema, UpdateBookingStatusDto,
  rescheduleBookingSchema, RescheduleBookingDto,
  listBookingsSchema, ListBookingsDto,
  getBookingSchema, GetBookingDto,
} from './dto/booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private bookings: BookingService) {}

  @Post('create')
  create(@CurrentUser() user: any, @Body(new ZodValidationPipe(createBookingSchema)) dto: CreateBookingDto) {
    return this.bookings.create(user.id, dto);
  }

  @Post('list')
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(listBookingsSchema)) dto: ListBookingsDto) {
    return this.bookings.list(user.id, dto);
  }

  @Post('get')
  get(@CurrentUser() user: any, @Body(new ZodValidationPipe(getBookingSchema)) dto: GetBookingDto) {
    return this.bookings.get(user.id, dto.bookingId);
  }

  @Post('status/update')
  updateStatus(@CurrentUser() user: any, @Body(new ZodValidationPipe(updateBookingStatusSchema)) dto: UpdateBookingStatusDto) {
    return this.bookings.updateStatus(user.id, dto);
  }

  @Post('reschedule')
  reschedule(@CurrentUser() user: any, @Body(new ZodValidationPipe(rescheduleBookingSchema)) dto: RescheduleBookingDto) {
    return this.bookings.reschedule(user.id, dto);
  }

  @Post('calendar')
  calendar(@CurrentUser() user: any, @Body() body: { month: number; year: number }) {
    return this.bookings.getCalendar(user.id, body.month ?? new Date().getMonth() + 1, body.year ?? new Date().getFullYear());
  }
}
