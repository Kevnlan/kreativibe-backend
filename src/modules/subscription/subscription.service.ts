import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BillingCycle, InvoiceStatus, SubscriptionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreatePlanDto,
  UpdatePlanDto,
  SubscribeDto,
  CancelSubscriptionDto,
  ListPlansDto,
  ListInvoicesDto,
  PayInvoiceDto,
} from './dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  // ── Plans (Admin) ────────────────────────────────────────────────────────────

  async createPlan(dto: CreatePlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        tier: dto.tier,
        price: dto.price,
        currency: dto.currency,
        billingCycle: dto.billingCycle as BillingCycle,
        trialDays: dto.trialDays,
        features: dto.features,
        isActive: dto.isActive,
      },
    });
  }

  async updatePlan(dto: UpdatePlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException({ message: 'Plan not found', code: 'PLAN_NOT_FOUND' });

    return this.prisma.subscriptionPlan.update({
      where: { id: dto.planId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.billingCycle !== undefined ? { billingCycle: dto.billingCycle as BillingCycle } : {}),
        ...(dto.trialDays !== undefined ? { trialDays: dto.trialDays } : {}),
        ...(dto.features !== undefined ? { features: dto.features } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async listPlans(dto: ListPlansDto) {
    return this.prisma.subscriptionPlan.findMany({
      where: { ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}) },
      orderBy: { price: 'asc' },
    });
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────────

  async subscribe(userId: string, dto: SubscribeDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException({ message: 'Plan not found', code: 'PLAN_NOT_FOUND' });
    if (!plan.isActive) throw new BadRequestException({ message: 'Plan is not active', code: 'PLAN_INACTIVE' });

    // Check for existing active subscription
    const existing = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } },
    });
    if (existing) {
      throw new BadRequestException({ message: 'Active subscription already exists', code: 'SUBSCRIPTION_EXISTS' });
    }

    const startDate = new Date();
    const trialEndDate = plan.trialDays > 0 ? new Date(startDate.getTime() + plan.trialDays * 86400000) : null;
    const endDate = this.calculateEndDate(startDate, plan.billingCycle);

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: dto.planId,
        status: trialEndDate ? 'TRIALING' : 'ACTIVE',
        startDate,
        endDate,
        trialEndDate,
        autoRenew: dto.autoRenew,
      },
      include: { plan: true },
    });

    // Generate first invoice
    await this.generateInvoice(subscription.id, userId, plan);

    await this.notifications.create(
      userId,
      'COMMUNITY_REPLY',
      'Subscription activated',
      `You've subscribed to ${plan.name}`,
      { subscriptionId: subscription.id },
    );

    return subscription;
  }

  async getMySubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return { subscription: null };
    }

    return { subscription };
  }

  async cancel(userId: string, dto: CancelSubscriptionDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
    });
    if (!subscription) throw new NotFoundException({ message: 'Subscription not found', code: 'SUBSCRIPTION_NOT_FOUND' });
    if (subscription.userId !== userId) {
      throw new BadRequestException({ message: 'Not your subscription', code: 'NOT_AUTHORIZED' });
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        status: 'CANCELLED' as SubscriptionStatus,
        cancelledAt: new Date(),
        cancellationReason: dto.reason,
        autoRenew: false,
      },
      include: { plan: true },
    });

    return updated;
  }

  async listMyInvoices(userId: string, dto: ListInvoicesDto) {
    const where: Prisma.InvoiceWhereInput = {
      userId,
      ...(dto.status ? { status: dto.status as InvoiceStatus } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { items, total, page: dto.page, limit: dto.limit };
  }

  async payInvoice(userId: string, dto: PayInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId } });
    if (!invoice) throw new NotFoundException({ message: 'Invoice not found', code: 'INVOICE_NOT_FOUND' });
    if (invoice.userId !== userId) {
      throw new BadRequestException({ message: 'Not your invoice', code: 'NOT_AUTHORIZED' });
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException({ message: 'Invoice already paid', code: 'ALREADY_PAID' });
    }

    const updated = await this.prisma.invoice.update({
      where: { id: dto.invoiceId },
      data: {
        status: 'PAID' as InvoiceStatus,
        paidAt: new Date(),
        metadata: { ...((invoice.metadata as any) ?? {}), paymentMethod: dto.method, paidAt: new Date().toISOString() },
      },
    });

    await this.notifications.create(
      userId,
      'COMMUNITY_REPLY',
      'Invoice paid',
      `Invoice ${invoice.number} has been paid`,
      { invoiceId: invoice.id },
    );

    return updated;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private calculateEndDate(startDate: Date, cycle: BillingCycle): Date {
    const end = new Date(startDate);
    if (cycle === 'MONTHLY') end.setMonth(end.getMonth() + 1);
    else if (cycle === 'QUARTERLY') end.setMonth(end.getMonth() + 3);
    else if (cycle === 'YEARLY') end.setFullYear(end.getFullYear() + 1);
    return end;
  }

  private async generateInvoice(subscriptionId: string, userId: string, plan: any) {
    const count = await this.prisma.invoice.count();
    const number = `INV-${String(count + 1).padStart(6, '0')}`;
    const tax = plan.price * 0.16; // 16% tax
    const total = plan.price + tax;

    return this.prisma.invoice.create({
      data: {
        subscriptionId,
        userId,
        number,
        amount: plan.price,
        currency: plan.currency,
        tax,
        total,
        status: 'ISSUED' as InvoiceStatus,
        dueDate: new Date(Date.now() + 7 * 86400000), // 7 days to pay
        items: [{ description: plan.name, amount: plan.price, quantity: 1 }],
      },
    });
  }
}
