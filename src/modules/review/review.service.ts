import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewEntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateReviewDto,
  ListReviewsDto,
  RespondToReviewDto,
} from './dto/review.dto';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  async create(reviewerId: string, dto: CreateReviewDto) {
    // Prevent self-review
    if (reviewerId === dto.subjectId) {
      throw new BadRequestException({ message: 'Cannot review yourself', code: 'SELF_REVIEW_FORBIDDEN' });
    }

    // Verify subject exists
    const subject = await this.prisma.user.findUnique({ where: { id: dto.subjectId } });
    if (!subject) throw new NotFoundException({ message: 'Subject not found', code: 'SUBJECT_NOT_FOUND' });

    // Check for duplicate review (same reviewer + subject + campaign + offer)
    const existing = await this.prisma.review.findFirst({
      where: {
        reviewerId,
        subjectId: dto.subjectId,
        campaignId: dto.campaignId ?? null,
        offerId: dto.offerId ?? null,
      },
    });
    if (existing) {
      throw new BadRequestException({ message: 'Review already exists', code: 'REVIEW_EXISTS' });
    }

    // If campaignId provided, verify the reviewer was part of the campaign
    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findUnique({ where: { id: dto.campaignId } });
      if (!campaign) throw new NotFoundException({ message: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
    }

    // If offerId provided, verify the offer was accepted
    if (dto.offerId) {
      const offer = await this.prisma.offer.findUnique({ where: { id: dto.offerId } });
      if (!offer) throw new NotFoundException({ message: 'Offer not found', code: 'OFFER_NOT_FOUND' });
      if (offer.status !== 'ACCEPTED') {
        throw new BadRequestException({ message: 'Can only review accepted offers', code: 'OFFER_NOT_ACCEPTED' });
      }
    }

    const review = await this.prisma.review.create({
      data: {
        reviewerId,
        subjectId: dto.subjectId,
        subjectType: dto.subjectType as ReviewEntityType,
        campaignId: dto.campaignId,
        offerId: dto.offerId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        isPublic: dto.isPublic,
      },
      include: {
        reviewer: { select: { id: true, name: true, role: true } },
      },
    });

    // Update creator/brand average rating
    if (dto.subjectType === 'CREATOR') {
      await this.updateCreatorRating(dto.subjectId);
    } else if (dto.subjectType === 'BRAND') {
      await this.updateBrandRating(dto.subjectId);
    }

    // Notify the subject of the new review
    await this.notifications.create(
      dto.subjectId,
      'COMMUNITY_REPLY',
      'New review received',
      `${review.reviewer.name} left a ${dto.rating}-star review${dto.title ? `: "${dto.title}"` : ''}`,
      { reviewId: review.id, rating: dto.rating },
    );

    return review;
  }

  async list(query: ListReviewsDto) {
    const where: Prisma.ReviewWhereInput = {
      subjectId: query.subjectId,
      isPublic: true,
      ...(query.subjectType ? { subjectType: query.subjectType } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.minRating || query.maxRating
        ? {
          rating: {
            ...(query.minRating ? { gte: query.minRating } : {}),
            ...(query.maxRating ? { lte: query.maxRating } : {}),
          },
        }
        : {}),
    };

    const [items, total, avgRating] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          reviewer: { select: { id: true, name: true, role: true, creatorProfile: { select: { avatar: true } }, brandProfile: { select: { logo: true, companyName: true } } } },
        },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    return {
      items,
      total,
      averageRating: avgRating._avg.rating ?? 0,
      page: query.page,
      limit: query.limit,
    };
  }

  async getMyReviews(reviewerId: string, page: number = 1, limit: number = 20) {
    const where: Prisma.ReviewWhereInput = { reviewerId };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subject: { select: { id: true, name: true, role: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async respond(userId: string, dto: RespondToReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: dto.reviewId },
    });
    if (!review) throw new NotFoundException({ message: 'Review not found', code: 'REVIEW_NOT_FOUND' });

    // Only the subject can respond
    if (review.subjectId !== userId) {
      throw new ForbiddenException({ message: 'Only the reviewed entity can respond', code: 'NOT_AUTHORIZED' });
    }

    if (review.response) {
      throw new BadRequestException({ message: 'Review already has a response', code: 'ALREADY_RESPONDED' });
    }

    const updated = await this.prisma.review.update({
      where: { id: dto.reviewId },
      data: { response: dto.response, respondedAt: new Date() },
    });

    // Notify reviewer of the response
    await this.notifications.create(
      review.reviewerId,
      'COMMUNITY_REPLY',
      'Review response received',
      'Your review has received a response.',
      { reviewId: review.id },
    );

    return updated;
  }

  async adminDelete(dto: { reviewId: string; reason: string }) {
    const review = await this.prisma.review.findUnique({ where: { id: dto.reviewId } });
    if (!review) throw new NotFoundException({ message: 'Review not found', code: 'REVIEW_NOT_FOUND' });

    await this.prisma.review.delete({ where: { id: dto.reviewId } });

    // Recalculate subject's rating
    if (review.subjectType === 'CREATOR') {
      await this.updateCreatorRating(review.subjectId);
    } else if (review.subjectType === 'BRAND') {
      await this.updateBrandRating(review.subjectId);
    }

    return { success: true };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async updateCreatorRating(userId: string) {
    const creatorProfile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creatorProfile) return;

    const agg = await this.prisma.review.aggregate({
      where: { subjectId: userId, subjectType: 'CREATOR', isPublic: true },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await this.prisma.creatorProfile.update({
      where: { userId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        totalReviews: agg._count._all,
      },
    });
  }

  private async updateBrandRating(userId: string) {
    const brandProfile = await this.prisma.brandProfile.findUnique({ where: { userId } });
    if (!brandProfile) return;

    const agg = await this.prisma.review.aggregate({
      where: { subjectId: userId, subjectType: 'BRAND', isPublic: true },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await this.prisma.brandProfile.update({
      where: { userId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        totalReviews: agg._count._all,
      },
    });
  }
}
