import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BrowseBrandsDto } from './dto/browse-brands.dto';

@Injectable()
export class DiscoveryService {
  constructor(private prisma: PrismaService) {}

  private toBrowseItem(brand: Prisma.BrandProfileGetPayload<{ include: { campaigns: true } }>) {
    const active = brand.campaigns;
    const mins = active.map((c) => Number(c.budgetMin));
    const maxs = active.filter((c) => c.budgetMax != null).map((c) => Number(c.budgetMax));
    const niches = Array.from(new Set(active.flatMap((c) => c.categories)));

    return {
      id: brand.id,
      companyName: brand.companyName,
      logo: brand.logo,
      industry: brand.industry,
      isVerified: brand.isVerified,
      description: brand.description,
      location: brand.city,
      niches,
      activeCampaigns: active.length,
      budgetMin: mins.length ? Math.min(...mins) : null,
      budgetMax: maxs.length ? Math.max(...maxs) : null,
    };
  }

  async browse(query: BrowseBrandsDto) {
    const campaignFilter: Prisma.CampaignWhereInput = {
      status: 'ACTIVE',
      ...(query.niche ? { categories: { has: query.niche } } : {}),
    };
    const where: Prisma.BrandProfileWhereInput = {
      campaigns: { some: campaignFilter },
      ...(query.industry ? { industry: query.industry } : {}),
      ...(query.search ? { companyName: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [brands, total] = await Promise.all([
      this.prisma.brandProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { campaigns: { where: { status: 'ACTIVE' } } },
      }),
      this.prisma.brandProfile.count({ where }),
    ]);

    return { items: brands.map((b) => this.toBrowseItem(b)), total, page: query.page, limit: query.limit };
  }

  async getPublic(brandProfileId: string) {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { id: brandProfileId },
      include: { campaigns: { where: { status: 'ACTIVE' } } },
    });
    if (!brand) throw new NotFoundException({ message: 'Brand not found', code: 'BRAND_NOT_FOUND' });

    return {
      id: brand.id,
      companyName: brand.companyName,
      logo: brand.logo,
      coverImage: brand.coverImage,
      industry: brand.industry,
      isVerified: brand.isVerified,
      description: brand.description,
      website: brand.website,
      activeCampaigns: brand.campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        budgetMin: c.budgetMin,
        budgetMax: c.budgetMax,
        platforms: c.platforms,
      })),
    };
  }
}
