import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, OfferStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateOfferDto,
  CounterOfferDto,
  ListOffersDto,
  BrowseMarketplaceDto,
} from './dto/offer.dto';

const DEFAULT_COMMISSION_RATE = 0.15;

@Injectable()
export class OfferService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) { }

  private async brandProfileId(userId: string) {
    const profile = await this.prisma.brandProfile.findUniqueOrThrow({ where: { userId } });
    return profile.id;
  }

  private async creatorProfileId(userId: string) {
    const profile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
    return profile.id;
  }

  private async getActiveCommissionRate(): Promise<number> {
    const rule = await this.prisma.commissionRule.findFirst({
      where: {
        transactionType: 'PURCHASE',
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    return rule ? Number(rule.rate) : DEFAULT_COMMISSION_RATE;
  }

  private serialize(offer: any) {
    return {
      id: offer.id,
      contentId: offer.contentId,
      brandProfileId: offer.brandProfileId,
      creatorProfileId: offer.creatorProfileId,
      initialAmount: Number(offer.initialAmount),
      currentAmount: Number(offer.currentAmount),
      currency: offer.currency,
      status: offer.status,
      expiresAt: offer.expiresAt,
      message: offer.message,
      events: offer.events ?? [],
      content: offer.content ?? null,
      license: offer.license ?? null,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    };
  }

  // ── Brand endpoints ──────────────────────────────────────────────────────

  async create(userId: string, dto: CreateOfferDto) {
    const brandProfileId = await this.brandProfileId(userId);
    const content = await this.prisma.content.findUnique({
      where: { id: dto.contentId },
      include: { creatorProfile: true },
    });
    if (!content) throw new NotFoundException({ message: 'Content not found', code: 'CONTENT_NOT_FOUND' });
    if (content.status !== 'APPROVED') {
      throw new BadRequestException({ message: 'Content is not available for purchase', code: 'CONTENT_NOT_AVAILABLE' });
    }

    const offer = await this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.create({
        data: {
          contentId: dto.contentId,
          brandProfileId,
          creatorProfileId: content.creatorProfileId,
          initialAmount: dto.amount,
          currentAmount: dto.amount,
          currency: content.currency,
          status: OfferStatus.PENDING,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          message: dto.message,
        },
      });

      await tx.offerEvent.create({
        data: {
          offerId: offer.id,
          actorId: userId,
          eventType: 'CREATED',
          amount: dto.amount,
          message: dto.message,
        },
      });

      return offer;
    });

    // Notify creator of new offer
    await this.notifications.create(
      content.creatorProfile.userId,
      'OFFER_RECEIVED',
      'New offer received',
      `A brand offered ${dto.amount} ${content.currency} for "${content.title}"`,
      { offerId: offer.id, contentId: dto.contentId, amount: dto.amount },
    );

    return this.serialize(
      await this.prisma.offer.findUniqueOrThrow({
        where: { id: offer.id },
        include: { events: { orderBy: { createdAt: 'asc' } }, content: true },
      }),
    );
  }

  async listForBrand(userId: string, query: ListOffersDto) {
    const brandProfileId = await this.brandProfileId(userId);
    const where: Prisma.OfferWhereInput = {
      brandProfileId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          events: { orderBy: { createdAt: 'asc' } },
          content: { select: { id: true, title: true, type: true, thumbnailUrl: true, price: true } },
        },
      }),
      this.prisma.offer.count({ where }),
    ]);

    return { items: items.map((o) => this.serialize(o)), total, page: query.page, limit: query.limit };
  }

  // ── Creator endpoints ────────────────────────────────────────────────────

  async listForCreator(userId: string, query: ListOffersDto) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const where: Prisma.OfferWhereInput = {
      creatorProfileId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          events: { orderBy: { createdAt: 'asc' } },
          content: { select: { id: true, title: true, type: true, thumbnailUrl: true, price: true } },
          brandProfile: { select: { id: true, companyName: true, logo: true, isVerified: true } },
        },
      }),
      this.prisma.offer.count({ where }),
    ]);

    return { items: items.map((o) => this.serialize(o)), total, page: query.page, limit: query.limit };
  }

  // ── Shared endpoints ─────────────────────────────────────────────────────

  async get(userId: string, role: string, id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        content: true,
        brandProfile: { select: { id: true, companyName: true, logo: true, isVerified: true } },
        license: true,
      },
    });
    if (!offer) throw new NotFoundException({ message: 'Offer not found', code: 'OFFER_NOT_FOUND' });

    await this.assertAccess(userId, role, offer);
    return this.serialize(offer);
  }

  async getHistory(userId: string, role: string, id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!offer) throw new NotFoundException({ message: 'Offer not found', code: 'OFFER_NOT_FOUND' });
    await this.assertAccess(userId, role, offer);
    return { events: offer.events };
  }

  async counter(userId: string, role: string, dto: CounterOfferDto) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: dto.id },
      include: { content: { include: { creatorProfile: true } }, brandProfile: true },
    });
    if (!offer) throw new NotFoundException({ message: 'Offer not found', code: 'OFFER_NOT_FOUND' });
    await this.assertAccess(userId, role, offer);

    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.COUNTERED) {
      throw new BadRequestException({ message: 'Can only counter pending or countered offers', code: 'OFFER_NOT_COUNTERABLE' });
    }

    this.checkExpiry(offer);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.offer.update({
        where: { id: dto.id },
        data: { currentAmount: dto.amount, status: OfferStatus.COUNTERED },
      });

      await tx.offerEvent.create({
        data: {
          offerId: dto.id,
          actorId: userId,
          eventType: 'COUNTER',
          amount: dto.amount,
          message: dto.message,
        },
      });

      return updated;
    });

    // Notify the other party of the counter
    const recipientId = role === 'BRAND' ? offer.content.creatorProfile.userId : offer.brandProfile.userId;
    await this.notifications.create(
      recipientId,
      'OFFER_COUNTERED',
      'Offer countered',
      `Counter-offer of ${dto.amount} ${offer.currency} for "${offer.content.title}"`,
      { offerId: dto.id, amount: dto.amount },
    );

    return this.serialize(
      await this.prisma.offer.findUniqueOrThrow({
        where: { id: updated.id },
        include: { events: { orderBy: { createdAt: 'asc' } }, content: true },
      }),
    );
  }

  async accept(userId: string, role: string, id: string, message?: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: { content: { include: { creatorProfile: true } }, brandProfile: true },
    });
    if (!offer) throw new NotFoundException({ message: 'Offer not found', code: 'OFFER_NOT_FOUND' });
    await this.assertAccess(userId, role, offer);

    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.COUNTERED) {
      throw new BadRequestException({ message: 'Can only accept pending or countered offers', code: 'OFFER_NOT_ACCEPTABLE' });
    }

    this.checkExpiry(offer);

    if (offer.content.status !== 'APPROVED') {
      throw new BadRequestException({ message: 'Content is no longer available', code: 'CONTENT_NOT_AVAILABLE' });
    }

    const commissionRate = await this.getActiveCommissionRate();
    const grossAmount = Number(offer.currentAmount);
    const commission = Math.round(grossAmount * commissionRate * 100) / 100;
    const netToCreator = grossAmount - commission;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Verify brand wallet has sufficient balance
      const brandWallet = await tx.wallet.findUniqueOrThrow({ where: { userId: offer.brandProfile.userId } });
      if (brandWallet.balance.lessThan(offer.currentAmount)) {
        throw new BadRequestException({ message: 'Insufficient wallet balance', code: 'INSUFFICIENT_BALANCE' });
      }

      // 2. Get or create creator wallet
      let creatorWallet = await tx.wallet.findUnique({ where: { userId: offer.content.creatorProfile.userId } });
      if (!creatorWallet) {
        creatorWallet = await tx.wallet.create({ data: { userId: offer.content.creatorProfile.userId } });
      }

      // 3. Debit brand wallet
      const brandBalanceAfter = brandWallet.balance.minus(offer.currentAmount);
      await tx.ledgerEntry.create({
        data: {
          walletId: brandWallet.id,
          type: TransactionType.PURCHASE,
          amount: offer.currentAmount,
          direction: 'DEBIT',
          balanceAfter: brandBalanceAfter,
          currency: offer.currency,
          description: `Content purchase: ${offer.content.title}`,
          referenceId: offer.id,
          referenceType: 'Offer',
        },
      });
      await tx.wallet.update({ where: { id: brandWallet.id }, data: { balance: brandBalanceAfter } });

      // 4. Credit creator wallet (net of commission)
      const creatorBalanceAfter = creatorWallet.balance.add(netToCreator);
      await tx.ledgerEntry.create({
        data: {
          walletId: creatorWallet.id,
          type: TransactionType.PURCHASE,
          amount: new Prisma.Decimal(netToCreator),
          direction: 'CREDIT',
          balanceAfter: creatorBalanceAfter,
          currency: offer.currency,
          description: `Content sale: ${offer.content.title}`,
          referenceId: offer.id,
          referenceType: 'Offer',
        },
      });
      await tx.wallet.update({ where: { id: creatorWallet.id }, data: { balance: creatorBalanceAfter } });

      // 5. Record platform commission
      const payment = await tx.payment.create({
        data: {
          walletId: brandWallet.id,
          amount: offer.currentAmount,
          currency: offer.currency,
          method: 'MPESA',
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });
      await tx.platformCommission.create({
        data: {
          paymentId: payment.id,
          amount: new Prisma.Decimal(commission),
          rate: new Prisma.Decimal(commissionRate),
        },
      });

      // 6. Update offer status
      const updated = await tx.offer.update({
        where: { id },
        data: { status: OfferStatus.ACCEPTED },
      });

      await tx.offerEvent.create({
        data: {
          offerId: id,
          actorId: userId,
          eventType: 'ACCEPTED',
          amount: offer.currentAmount,
          message,
        },
      });

      // 7. Generate perpetual license
      const licenseText = `PERPETUAL USAGE LICENSE\n\nThis license grants ${offer.brandProfile.companyName} perpetual, non-exclusive rights to use the content "${offer.content.title}" (ID: ${offer.content.id}) for marketing and advertising purposes across all platforms.\n\nLicense ID: ${offer.id}\nIssued: ${new Date().toISOString()}\nAmount: ${offer.currentAmount} ${offer.currency}`;

      const license = await tx.contentLicense.create({
        data: {
          contentId: offer.contentId,
          brandUserId: offer.brandProfile.userId,
          offerId: offer.id,
          licenseText,
        },
      });

      // 8. Mark content as sold
      await tx.content.update({
        where: { id: offer.contentId },
        data: { status: 'SOLD' },
      });

      return { offer: updated, license };
    });

    // Notify the other party of acceptance
    const recipientId = role === 'BRAND' ? offer.content.creatorProfile.userId : offer.brandProfile.userId;
    await this.notifications.create(
      recipientId,
      'OFFER_ACCEPTED',
      'Offer accepted',
      `Offer of ${offer.currentAmount} ${offer.currency} for "${offer.content.title}" has been accepted. License generated.`,
      { offerId: id, contentId: offer.contentId, licenseId: result.license.id },
    );

    return this.serialize(
      await this.prisma.offer.findUniqueOrThrow({
        where: { id: result.offer.id },
        include: { events: { orderBy: { createdAt: 'asc' } }, content: true, license: true },
      }),
    );
  }

  async reject(userId: string, role: string, id: string, message?: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: { content: { include: { creatorProfile: true } }, brandProfile: true },
    });
    if (!offer) throw new NotFoundException({ message: 'Offer not found', code: 'OFFER_NOT_FOUND' });
    await this.assertAccess(userId, role, offer);

    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.COUNTERED) {
      throw new BadRequestException({ message: 'Can only reject pending or countered offers', code: 'OFFER_NOT_REJECTABLE' });
    }

    await this.prisma.$transaction([
      this.prisma.offer.update({ where: { id }, data: { status: OfferStatus.REJECTED } }),
      this.prisma.offerEvent.create({
        data: { offerId: id, actorId: userId, eventType: 'REJECTED', message },
      }),
    ]);

    // Notify the other party of rejection
    const rejectRecipientId = role === 'BRAND' ? offer.content.creatorProfile.userId : offer.brandProfile.userId;
    await this.notifications.create(
      rejectRecipientId,
      'OFFER_REJECTED',
      'Offer rejected',
      `Offer for "${offer.content.title}" has been rejected.`,
      { offerId: id, contentId: offer.contentId },
    );

    return this.serialize(
      await this.prisma.offer.findUniqueOrThrow({
        where: { id },
        include: { events: { orderBy: { createdAt: 'asc' } }, content: true },
      }),
    );
  }

  async withdraw(userId: string, role: string, id: string, message?: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: { content: { include: { creatorProfile: true } }, brandProfile: true },
    });
    if (!offer) throw new NotFoundException({ message: 'Offer not found', code: 'OFFER_NOT_FOUND' });
    await this.assertAccess(userId, role, offer);

    if (offer.status === OfferStatus.ACCEPTED || offer.status === OfferStatus.REJECTED) {
      throw new BadRequestException({ message: 'Cannot withdraw a resolved offer', code: 'OFFER_NOT_WITHDRAWABLE' });
    }

    await this.prisma.$transaction([
      this.prisma.offer.update({ where: { id }, data: { status: OfferStatus.WITHDRAWN } }),
      this.prisma.offerEvent.create({
        data: { offerId: id, actorId: userId, eventType: 'WITHDRAWN', message },
      }),
    ]);

    // Notify the other party of withdrawal
    const withdrawRecipientId = role === 'BRAND' ? offer.content.creatorProfile.userId : offer.brandProfile.userId;
    await this.notifications.create(
      withdrawRecipientId,
      'OFFER_WITHDRAWN',
      'Offer withdrawn',
      `Offer for "${offer.content.title}" has been withdrawn.`,
      { offerId: id, contentId: offer.contentId },
    );

    return this.serialize(
      await this.prisma.offer.findUniqueOrThrow({
        where: { id },
        include: { events: { orderBy: { createdAt: 'asc' } }, content: true },
      }),
    );
  }

  // ── Marketplace browse ───────────────────────────────────────────────────

  async browse(query: BrowseMarketplaceDto) {
    const where: Prisma.ContentWhereInput = {
      status: 'APPROVED',
      ...(query.type ? { type: query.type } : {}),
      ...(query.platform ? { platforms: { has: query.platform } } : {}),
      ...(query.category ? { categoryCode: query.category } : {}),
      ...(query.creatorId ? { creatorProfileId: query.creatorId } : {}),
      ...(query.minPrice || query.maxPrice
        ? {
          price: {
            ...(query.minPrice ? { gte: query.minPrice } : {}),
            ...(query.maxPrice ? { lte: query.maxPrice } : {}),
          },
        }
        : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          creatorProfile: {
            select: { id: true, bio: true, avatar: true, isVerified: true, averageRating: true },
          },
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getPublicContent(contentId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id: contentId, status: 'APPROVED' },
      include: {
        creatorProfile: {
          select: { id: true, bio: true, avatar: true, isVerified: true, averageRating: true, totalReviews: true },
        },
      },
    });
    if (!content) throw new NotFoundException({ message: 'Content not found', code: 'CONTENT_NOT_FOUND' });
    return content;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async assertAccess(userId: string, role: string, offer: any) {
    if (role === 'ADMIN') return;

    if (role === 'BRAND') {
      const brandProfile = await this.prisma.brandProfile.findUniqueOrThrow({ where: { userId } });
      if (offer.brandProfileId !== brandProfile.id) {
        throw new ForbiddenException({ message: 'Not authorized for this offer', code: 'FORBIDDEN' });
      }
    } else if (role === 'CREATOR') {
      const creatorProfile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
      if (offer.creatorProfileId !== creatorProfile.id) {
        throw new ForbiddenException({ message: 'Not authorized for this offer', code: 'FORBIDDEN' });
      }
    }
  }

  private checkExpiry(offer: any) {
    if (offer.expiresAt && offer.expiresAt < new Date()) {
      throw new BadRequestException({ message: 'Offer has expired', code: 'OFFER_EXPIRED' });
    }
  }
}
