import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ListPointsDto } from './dto/points-list.dto';

const TIERS = [
  { level: 'RISING_STAR', min: 0, max: 500 },
  { level: 'CONTENT_PRO', min: 500, max: 1500 },
  { level: 'TOP_CREATOR', min: 1500, max: 3000 },
  { level: 'ELITE_CREATOR', min: 3000, max: Infinity },
] as const;

const PERKS: Record<string, string[]> = {
  RISING_STAR: ['Access to beginner-friendly campaigns'],
  CONTENT_PRO: ['Priority in search results', 'Featured in brand recommendations'],
  TOP_CREATOR: ['Priority in search results', 'Featured in brand recommendations', 'Early access to high-budget campaigns'],
  ELITE_CREATOR: ['Priority in search results', 'Featured in brand recommendations', 'Early access to high-budget campaigns', 'Dedicated account support'],
};

interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  target: number;
  progress: (creatorProfileId: string, prisma: PrismaService) => Promise<number>;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: 'first-campaign',
    title: 'First Campaign Complete',
    description: 'Successfully completed your first brand campaign',
    icon: 'trophy',
    points: 100,
    target: 1,
    progress: (creatorProfileId, prisma) =>
      prisma.campaignApplication.count({ where: { creatorProfileId, status: 'ACCEPTED', campaign: { status: 'COMPLETED' } } }),
  },
  {
    key: 'ten-campaigns',
    title: '10 Campaigns Strong',
    description: 'Complete 10 brand campaigns',
    icon: 'star',
    points: 500,
    target: 10,
    progress: (creatorProfileId, prisma) =>
      prisma.campaignApplication.count({ where: { creatorProfileId, status: 'ACCEPTED', campaign: { status: 'COMPLETED' } } }),
  },
  {
    key: 'milestone-master',
    title: 'Milestone Master',
    description: 'Get 5 milestone deliveries approved',
    icon: 'medal',
    points: 250,
    target: 5,
    progress: async (creatorProfileId, prisma) => {
      const profile = await prisma.creatorProfile.findUnique({ where: { id: creatorProfileId } });
      if (!profile) return 0;
      return prisma.milestoneDelivery.count({
        where: { submittedByUserId: profile.userId, milestone: { status: 'APPROVED' } },
      });
    },
  },
  {
    key: 'verified-creator',
    title: 'Verified Creator',
    description: 'Complete KYC verification',
    icon: 'shield-check',
    points: 50,
    target: 1,
    progress: async (creatorProfileId, prisma) => {
      const profile = await prisma.creatorProfile.findUnique({ where: { id: creatorProfileId } });
      return profile?.verificationStatus === 'VERIFIED' ? 1 : 0;
    },
  },
];

@Injectable()
export class ReputationService {
  constructor(private prisma: PrismaService) {}

  private async creatorProfileId(userId: string) {
    const profile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
    return profile.id;
  }

  private tierFor(totalPoints: number) {
    const tier = TIERS.find((t) => totalPoints >= t.min && totalPoints < t.max) ?? TIERS[TIERS.length - 1];
    const progressToNext = tier.max === Infinity ? 100 : Math.round(((totalPoints - tier.min) / (tier.max - tier.min)) * 100);
    return { level: tier.level, progressToNext };
  }

  async summary(userId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const result = await this.prisma.reputationPoint.aggregate({ where: { creatorProfileId }, _sum: { points: true } });
    const totalPoints = result._sum.points ?? 0;
    const { level, progressToNext } = this.tierFor(totalPoints);

    return { totalPoints, currentLevel: level, progressToNext, perks: PERKS[level] };
  }

  async listPoints(userId: string, query: ListPointsDto) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const where = { creatorProfileId };

    const [points, total] = await Promise.all([
      this.prisma.reputationPoint.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.reputationPoint.count({ where }),
    ]);

    return {
      items: points.map((p) => ({ id: p.id, activity: p.activity, points: p.points, type: p.type, date: p.createdAt })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async listAchievements(userId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const earned = await this.prisma.creatorAchievement.findMany({ where: { creatorProfileId } });
    const earnedMap = new Map(earned.map((e) => [e.key, e.earnedAt]));

    const items = await Promise.all(
      ACHIEVEMENTS.map(async (def) => {
        const progress = Math.min(await def.progress(creatorProfileId, this.prisma), def.target);
        let earnedAt = earnedMap.get(def.key) ?? null;

        if (!earnedAt && progress >= def.target) {
          const created = await this.prisma.creatorAchievement.upsert({
            where: { creatorProfileId_key: { creatorProfileId, key: def.key } },
            create: { creatorProfileId, key: def.key },
            update: {},
          });
          earnedAt = created.earnedAt;
        }

        return {
          id: def.key,
          title: def.title,
          description: def.description,
          icon: def.icon,
          points: def.points,
          earnedAt,
          progress,
          target: def.target,
        };
      }),
    );

    return { items };
  }
}
