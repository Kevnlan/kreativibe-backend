import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const CONTENT_SALE_REF_TYPES = ['Payment'];
const CUSTOM_REQUEST_REF_TYPES = ['CampaignMilestone'];

@Injectable()
export class EarningsService {
  constructor(private prisma: PrismaService) {}

  async summary(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const currency = wallet?.currency ?? 'KES';
    if (!wallet) {
      return {
        thisMonth: 0, lastMonth: 0, thisYear: 0, totalSales: 0, averagePerSale: 0, currency,
        breakdown: { contentSales: { amount: 0, percent: 0 }, customRequests: { amount: 0, percent: 0 }, bonuses: { amount: 0, percent: 0 } },
        topPerformingContent: [],
      };
    }

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const credits = await this.prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id, direction: 'CREDIT', createdAt: { gte: startOfYear } },
    });

    const sumSince = (since: Date, before?: Date) =>
      credits
        .filter((c) => c.createdAt >= since && (!before || c.createdAt < before))
        .reduce((sum, c) => sum + Number(c.amount), 0);

    const thisMonth = sumSince(startOfThisMonth);
    const lastMonth = sumSince(startOfLastMonth, startOfThisMonth);
    const thisYear = sumSince(startOfYear);
    const totalSales = credits.length;
    const averagePerSale = totalSales ? Math.round(thisYear / totalSales) : 0;

    const sumByRefTypes = (types: string[]) =>
      credits.filter((c) => c.referenceType && types.includes(c.referenceType)).reduce((sum, c) => sum + Number(c.amount), 0);
    const contentSalesAmount = sumByRefTypes(CONTENT_SALE_REF_TYPES);
    const customRequestsAmount = sumByRefTypes(CUSTOM_REQUEST_REF_TYPES);
    const bonusesAmount = Math.max(thisYear - contentSalesAmount - customRequestsAmount, 0);
    const pct = (amount: number) => (thisYear > 0 ? Math.round((amount / thisYear) * 100) : 0);

    const creatorProfile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    const topPerformingContent = creatorProfile
      ? await this.topContent(creatorProfile.id)
      : [];

    return {
      thisMonth,
      lastMonth,
      thisYear,
      totalSales,
      averagePerSale,
      currency,
      breakdown: {
        contentSales: { amount: contentSalesAmount, percent: pct(contentSalesAmount) },
        customRequests: { amount: customRequestsAmount, percent: pct(customRequestsAmount) },
        bonuses: { amount: bonusesAmount, percent: pct(bonusesAmount) },
      },
      topPerformingContent,
    };
  }

  private async topContent(creatorProfileId: string) {
    const offers = await this.prisma.offer.findMany({
      where: { creatorProfileId, license: { isNot: null } },
      select: { contentId: true, currentAmount: true, content: { select: { title: true } } },
    });

    const byContent = new Map<string, { contentId: string; title: string; salesCount: number; revenue: number }>();
    for (const offer of offers) {
      const entry = byContent.get(offer.contentId) ?? { contentId: offer.contentId, title: offer.content.title, salesCount: 0, revenue: 0 };
      entry.salesCount += 1;
      entry.revenue += Number(offer.currentAmount);
      byContent.set(offer.contentId, entry);
    }

    return Array.from(byContent.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }
}
