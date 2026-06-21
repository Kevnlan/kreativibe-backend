import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ListPortfolioDto, AddPortfolioItemDto } from './dto/portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  private async resolveCreatorProfileId(userId: string, dto: ListPortfolioDto) {
    if (dto.creatorUserId) {
      const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: dto.creatorUserId } });
      if (!profile) throw new NotFoundException({ message: 'Creator not found', code: 'CREATOR_NOT_FOUND' });
      return profile.id;
    }
    const profile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
    return profile.id;
  }

  async list(userId: string, dto: ListPortfolioDto) {
    const creatorProfileId = await this.resolveCreatorProfileId(userId, dto);

    const completedApplications = await this.prisma.campaignApplication.findMany({
      where: { creatorProfileId, status: 'ACCEPTED', campaign: { status: 'COMPLETED' } },
      include: { campaign: { include: { brandProfile: true } } },
      orderBy: { campaign: { completedAt: 'desc' } },
    });

    const derivedItems = await Promise.all(
      completedApplications.map(async (application) => {
        const campaign = application.campaign;
        const posts = await this.prisma.publishedPost.findMany({
          where: { creatorProfileId, scheduledPost: { campaignId: campaign.id } },
        });
        const reach = posts.reduce((sum, p) => sum + p.views, 0);
        const engagement = posts.length
          ? posts.reduce((sum, p) => sum + (p.views > 0 ? ((p.likes + p.comments) / p.views) * 100 : 0), 0) / posts.length
          : 0;

        return {
          id: campaign.id,
          title: campaign.title,
          brand: campaign.brandProfile.companyName,
          platform: campaign.platforms[0] ?? 'GENERAL',
          type: 'CAMPAIGN',
          completedAt: campaign.completedAt,
          reach,
          engagement: Math.round(engagement * 10) / 10,
          earnings: application.proposedRate ? Number(application.proposedRate) : 0,
          rating: null,
          tags: campaign.categories,
        };
      }),
    );

    const externalItems = await this.prisma.portfolioItem.findMany({
      where: { creatorProfileId },
      orderBy: { completedAt: 'desc' },
    });

    const items = [
      ...derivedItems,
      ...externalItems.map((item) => ({
        id: item.id,
        title: item.title,
        brand: item.brand,
        platform: item.platform,
        type: 'EXTERNAL',
        completedAt: item.completedAt,
        reach: null,
        engagement: null,
        earnings: null,
        rating: null,
        tags: item.tags,
      })),
    ];

    const totalCompleted = items.length;
    const totalReach = derivedItems.reduce((sum, i) => sum + i.reach, 0);
    const avgEngagement = derivedItems.length
      ? Math.round((derivedItems.reduce((sum, i) => sum + i.engagement, 0) / derivedItems.length) * 10) / 10
      : 0;
    const totalEarned = derivedItems.reduce((sum, i) => sum + i.earnings, 0);

    return { items, summary: { totalCompleted, totalReach, avgEngagement, totalEarned } };
  }

  async add(userId: string, dto: AddPortfolioItemDto) {
    const creatorProfileId = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } }).then((p) => p.id);
    return this.prisma.portfolioItem.create({
      data: {
        creatorProfileId,
        title: dto.title,
        brand: dto.brand,
        platform: dto.platform,
        mediaUrl: dto.mediaUrl,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        tags: dto.tags,
      },
    });
  }

  async remove(userId: string, id: string) {
    const creatorProfileId = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } }).then((p) => p.id);
    const item = await this.prisma.portfolioItem.findFirst({ where: { id, creatorProfileId } });
    if (!item) throw new NotFoundException({ message: 'Portfolio item not found', code: 'PORTFOLIO_ITEM_NOT_FOUND' });
    await this.prisma.portfolioItem.delete({ where: { id } });
  }
}
