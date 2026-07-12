import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  SearchContentDto,
  SearchCreatorsDto,
  SearchCampaignsDto,
  RecommendationsDto,
} from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  // ── Content Search ──────────────────────────────────────────────────────────

  async searchContent(dto: SearchContentDto) {
    const where: Prisma.ContentWhereInput = {
      status: 'APPROVED',
      ...(dto.type ? { type: dto.type } : {}),
      ...(dto.platform ? { platforms: { has: dto.platform } } : {}),
      ...(dto.category ? { categoryCode: dto.category } : {}),
      ...(dto.minPrice || dto.maxPrice
        ? {
          price: {
            ...(dto.minPrice ? { gte: dto.minPrice } : {}),
            ...(dto.maxPrice ? { lte: dto.maxPrice } : {}),
          },
        }
        : {}),
      OR: [
        { title: { contains: dto.query, mode: 'insensitive' } },
        { description: { contains: dto.query, mode: 'insensitive' } },
        { tags: { has: dto.query } },
      ],
    };

    let orderBy: Prisma.ContentOrderByWithRelationInput = { createdAt: 'desc' };
    if (dto.sortBy === 'price_low') orderBy = { price: 'asc' };
    else if (dto.sortBy === 'price_high') orderBy = { price: 'desc' };
    else if (dto.sortBy === 'newest') orderBy = { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy,
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: {
          creatorProfile: {
            select: { id: true, bio: true, avatar: true, isVerified: true, averageRating: true },
          },
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return { items, total, page: dto.page, limit: dto.limit };
  }

  // ── Creator Search ──────────────────────────────────────────────────────────

  async searchCreators(dto: SearchCreatorsDto) {
    const where: Prisma.CreatorProfileWhereInput = {
      ...(dto.category ? { categories: { has: dto.category } } : {}),
      ...(dto.minRating !== undefined ? { averageRating: { gte: dto.minRating } } : {}),
      ...(dto.isVerified !== undefined ? { isVerified: dto.isVerified } : {}),
      ...(dto.country ? { user: { countryId: dto.country } } : {}),
      OR: [
        { bio: { contains: dto.query, mode: 'insensitive' } },
        { user: { name: { contains: dto.query, mode: 'insensitive' } } },
        { categories: { has: dto.query } },
      ],
    };

    let orderBy: Prisma.CreatorProfileOrderByWithRelationInput = { createdAt: 'desc' };
    if (dto.sortBy === 'rating') orderBy = { averageRating: 'desc' };
    else if (dto.sortBy === 'earnings') orderBy = { totalEarnings: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.creatorProfile.findMany({
        where,
        orderBy,
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        select: {
          id: true, bio: true, avatar: true, isVerified: true,
          averageRating: true, totalReviews: true, categories: true,
          user: { select: { id: true, name: true, countryId: true } },
        },
      }),
      this.prisma.creatorProfile.count({ where }),
    ]);

    return { items, total, page: dto.page, limit: dto.limit };
  }

  // ── Campaign Search ─────────────────────────────────────────────────────────

  async searchCampaigns(dto: SearchCampaignsDto) {
    const where: Prisma.CampaignWhereInput = {
      status: dto.status ?? 'ACTIVE',
      ...(dto.platform ? { platforms: { has: dto.platform } } : {}),
      ...(dto.contentType ? { contentTypes: { has: dto.contentType } } : {}),
      ...(dto.minBudget || dto.maxBudget
        ? {
          budgetMin: {
            ...(dto.minBudget ? { gte: dto.minBudget } : {}),
          },
          budgetMax: {
            ...(dto.maxBudget ? { lte: dto.maxBudget } : {}),
          },
        }
        : {}),
      OR: [
        { title: { contains: dto.query, mode: 'insensitive' } },
        { description: { contains: dto.query, mode: 'insensitive' } },
        { objective: { contains: dto.query, mode: 'insensitive' } },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        select: {
          id: true, title: true, objective: true, budgetMin: true, budgetMax: true,
          currency: true, status: true, startDate: true, endDate: true,
          brandProfile: { select: { id: true, companyName: true, logo: true, isVerified: true } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { items, total, page: dto.page, limit: dto.limit };
  }

  // ── Recommendations ─────────────────────────────────────────────────────────

  async recommendations(userId: string, dto: RecommendationsDto) {
    // Get user's categories from their profile for personalization
    const creatorProfile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    const brandProfile = await this.prisma.brandProfile.findUnique({ where: { userId } });

    const userCategories = creatorProfile?.categories ?? [];

    if (dto.type === 'content') {
      const where: Prisma.ContentWhereInput = {
        status: 'APPROVED',
        ...(userCategories.length > 0 ? { categoryCode: { in: userCategories } } : {}),
      };

      const items = await this.prisma.content.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: dto.limit,
        include: {
          creatorProfile: { select: { id: true, avatar: true, isVerified: true, averageRating: true } },
        },
      });

      return { type: 'content', items };
    }

    if (dto.type === 'creators') {
      const where: Prisma.CreatorProfileWhereInput = {
        isVerified: true,
        ...(userCategories.length > 0 ? { categories: { hasSome: userCategories } } : {}),
      };

      const items = await this.prisma.creatorProfile.findMany({
        where,
        orderBy: { averageRating: 'desc' },
        take: dto.limit,
        select: {
          id: true, bio: true, avatar: true, isVerified: true,
          averageRating: true, totalReviews: true, categories: true,
          user: { select: { id: true, name: true } },
        },
      });

      return { type: 'creators', items };
    }

    // campaigns
    const items = await this.prisma.campaign.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: dto.limit,
      select: {
        id: true, title: true, objective: true, budgetMin: true, budgetMax: true,
        currency: true, startDate: true, endDate: true,
        brandProfile: { select: { id: true, companyName: true, logo: true, isVerified: true } },
      },
    });

    return { type: 'campaigns', items };
  }
}
