import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private async verificationStatus(creatorProfileId: string) {
    const kyc = await this.prisma.creatorKyc.findUnique({ where: { creatorProfileId } });
    if (!kyc) return 'NOT_SUBMITTED';
    return kyc.status === 'SUBMITTED' ? 'PENDING' : kyc.status;
  }

  async summary(userId: string) {
    const creatorProfile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
    const creatorProfileId = creatorProfile.id;

    const [verificationStatusValue, postAggregates, activePosts, pendingOrders, wallet, recentContent, recentMilestones] = await Promise.all([
      this.verificationStatus(creatorProfileId),
      this.prisma.publishedPost.aggregate({ where: { creatorProfileId }, _sum: { views: true, likes: true, comments: true } }),
      this.prisma.publishedPost.count({ where: { creatorProfileId, status: 'ACTIVE' } }),
      this.prisma.campaignApplication.count({ where: { creatorProfileId, status: 'PENDING' } }),
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.content.findMany({
        where: { creatorProfileId, status: 'APPROVED' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { title: true, updatedAt: true },
      }),
      this.prisma.milestoneDelivery.findMany({
        where: { submittedByUserId: userId, milestone: { status: 'APPROVED' } },
        orderBy: { milestone: { approvedAt: 'desc' } },
        take: 5,
        include: { milestone: { select: { title: true, approvedAt: true } } },
      }),
    ]);

    const recentActivity = [
      ...recentContent.map((c) => ({ type: 'CONTENT_PUBLISHED', message: `${c.title} was published`, createdAt: c.updatedAt })),
      ...recentMilestones.map((d) => ({
        type: 'MILESTONE_APPROVED',
        message: `Milestone "${d.milestone.title}" was approved`,
        createdAt: d.milestone.approvedAt,
      })),
    ]
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, 10);

    return {
      verificationStatus: verificationStatusValue,
      stats: {
        totalViews: postAggregates._sum.views ?? 0,
        totalLikes: postAggregates._sum.likes ?? 0,
        totalComments: postAggregates._sum.comments ?? 0,
        totalEarnings: wallet ? Number(wallet.balance) : 0,
        activePosts,
        pendingOrders,
      },
      recentActivity,
    };
  }
}
