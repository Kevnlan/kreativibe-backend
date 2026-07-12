import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createPlanSchema, CreatePlanDto,
  updatePlanSchema, UpdatePlanDto,
  subscribeSchema, SubscribeDto,
  cancelSubscriptionSchema, CancelSubscriptionDto,
  listPlansSchema, ListPlansDto,
  listInvoicesSchema, ListInvoicesDto,
  payInvoiceSchema, PayInvoiceDto,
} from './dto/subscription.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private subs: SubscriptionService) {}

  @Post('plans/list')
  listPlans(@Body(new ZodValidationPipe(listPlansSchema)) dto: ListPlansDto) {
    return this.subs.listPlans(dto);
  }

  @Post('subscribe')
  subscribe(@CurrentUser() user: any, @Body(new ZodValidationPipe(subscribeSchema)) dto: SubscribeDto) {
    return this.subs.subscribe(user.id, dto);
  }

  @Post('me')
  mySubscription(@CurrentUser() user: any) {
    return this.subs.getMySubscription(user.id);
  }

  @Post('cancel')
  cancel(@CurrentUser() user: any, @Body(new ZodValidationPipe(cancelSubscriptionSchema)) dto: CancelSubscriptionDto) {
    return this.subs.cancel(user.id, dto);
  }

  @Post('invoices/list')
  listInvoices(@CurrentUser() user: any, @Body(new ZodValidationPipe(listInvoicesSchema)) dto: ListInvoicesDto) {
    return this.subs.listMyInvoices(user.id, dto);
  }

  @Post('invoices/pay')
  payInvoice(@CurrentUser() user: any, @Body(new ZodValidationPipe(payInvoiceSchema)) dto: PayInvoiceDto) {
    return this.subs.payInvoice(user.id, dto);
  }
}

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminSubscriptionController {
  constructor(private subs: SubscriptionService) {}

  @Post('plans/create')
  createPlan(@Body(new ZodValidationPipe(createPlanSchema)) dto: CreatePlanDto) {
    return this.subs.createPlan(dto);
  }

  @Post('plans/update')
  updatePlan(@Body(new ZodValidationPipe(updatePlanSchema)) dto: UpdatePlanDto) {
    return this.subs.updatePlan(dto);
  }
}
