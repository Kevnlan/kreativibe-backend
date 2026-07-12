import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsMetricType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  IngestMetricsDto,
  CreatorAnalyticsDto,
  CampaignAnalyticsDto,
  ContentAnalyticsDto,
  ExportAnalyticsDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ── Ingestion ──────────────────────────────────────────────────────────────

  async ingest(dto: IngestMetricsDto) {
    const snapshotDate = dto.snapshotDate ? new Date(dto.snapshotDate) : new Date();

    const records = await Promise.all(
      dto.metrics.map(async (m) => {
        const existing = await this.prisma.analyticsSnapshot.findFirst({
          where: {
            publishedPostId: dto.publishedPostId ?? null,
            creatorProfileId: dto.creatorProfileId ?? null,
            campaignId: dto.campaignId ?? null,
            metricType: m.metricType as AnalyticsMetricType,
            platform: dto.platform ?? null,
            snapshotDate,
          },
        });

        if (existing) {
          return this.prisma.analyticsSnapshot.update({
            where: { id: existing.id },
            data: { value: m.value },
          });
        }

        return this.prisma.analyticsSnapshot.create({
          data: {
            publishedPostId: dto.publishedPostId,
            creatorProfileId: dto.creatorProfileId,
            campaignId: dto.campaignId,
            metricType: m.metricType as AnalyticsMetricType,
            platform: dto.platform,
            value: m.value,
            snapshotDate,
          },
        });
      }),
    );

    return { ingested: records.length };
  }

  // ── Creator analytics ──────────────────────────────────────────────────────

  async creatorSummary(userId: string, query: CreatorAnalyticsDto) {
    const creatorProfile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creatorProfile) throw new NotFoundException({ message: 'Creator profile not found', code: 'CREATOR_PROFILE_NOT_FOUND' });

    const dateFilter = this.dateRange(query.startDate, query.endDate);

    const where: Prisma.AnalyticsSnapshotWhereInput = {
      creatorProfileId: creatorProfile.id,
      ...dateFilter,
      ...(query.platform ? { platform: query.platform } : {}),
    };

    const [byMetric, byPlatform, topPosts, timeSeries] = await Promise.all([
      this.prisma.analyticsSnapshot.groupBy({
        by: ['metricType'],
        where,
        _sum: { value: true },
      }),
      this.prisma.analyticsSnapshot.groupBy({
        by: ['platform'],
        where,
        _sum: { value: true },
      }),
      this.prisma.analyticsSnapshot.findMany({
        where: { ...where, metricType: 'VIEWS' },
        orderBy: { value: 'desc' },
        take: 5,
        include: { publishedPost: { select: { id: true, title: true, platform: true } } },
      }),
      this.prisma.analyticsSnapshot.findMany({
        where: { ...where, metricType: 'VIEWS' },
        orderBy: { snapshotDate: 'asc' },
        select: { snapshotDate: true, value: true, platform: true },
      }),
    ]);

    return {
      totals: byMetric.map((m) => ({ metric: m.metricType, value: m._sum.value ?? 0 })),
      byPlatform: byPlatform.map((p) => ({ platform: p.platform, value: p._sum.value ?? 0 })),
      topPosts: topPosts.map((p) => ({
        post: p.publishedPost,
        views: p.value,
      })),
      timeSeries: timeSeries.map((t) => ({ date: t.snapshotDate, value: t.value, platform: t.platform })),
    };
  }

  // ── Campaign analytics ─────────────────────────────────────────────────────

  async campaignSummary(dto: CampaignAnalyticsDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: dto.campaignId } });
    if (!campaign) throw new NotFoundException({ message: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });

    const dateFilter = this.dateRange(dto.startDate, dto.endDate);
    const where: Prisma.AnalyticsSnapshotWhereInput = {
      campaignId: dto.campaignId,
      ...dateFilter,
    };

    const [byMetric, byPlatform, byPost, timeSeries] = await Promise.all([
      this.prisma.analyticsSnapshot.groupBy({
        by: ['metricType'],
        where,
        _sum: { value: true },
      }),
      this.prisma.analyticsSnapshot.groupBy({
        by: ['platform'],
        where,
        _sum: { value: true },
      }),
      this.prisma.analyticsSnapshot.findMany({
        where: { ...where, metricType: 'VIEWS' },
        orderBy: { value: 'desc' },
        take: 10,
        include: { publishedPost: { select: { id: true, title: true, platform: true } } },
      }),
      this.prisma.analyticsSnapshot.findMany({
        where: { ...where, metricType: 'VIEWS' },
        orderBy: { snapshotDate: 'asc' },
        select: { snapshotDate: true, value: true },
      }),
    ]);

    return {
      campaign: { id: campaign.id, title: campaign.title, status: campaign.status },
      totals: byMetric.map((m) => ({ metric: m.metricType, value: m._sum.value ?? 0 })),
      byPlatform: byPlatform.map((p) => ({ platform: p.platform, value: p._sum.value ?? 0 })),
      topPosts: byPost.map((p) => ({ post: p.publishedPost, views: p.value })),
      timeSeries: timeSeries.map((t) => ({ date: t.snapshotDate, value: t.value })),
    };
  }

  // ── Content (single post) analytics ────────────────────────────────────────

  async contentSummary(dto: ContentAnalyticsDto) {
    const post = await this.prisma.publishedPost.findUnique({ where: { id: dto.publishedPostId } });
    if (!post) throw new NotFoundException({ message: 'Published post not found', code: 'POST_NOT_FOUND' });

    const dateFilter = this.dateRange(dto.startDate, dto.endDate);
    const where: Prisma.AnalyticsSnapshotWhereInput = {
      publishedPostId: dto.publishedPostId,
      ...dateFilter,
    };

    const [byMetric, timeSeries] = await Promise.all([
      this.prisma.analyticsSnapshot.groupBy({
        by: ['metricType'],
        where,
        _sum: { value: true },
      }),
      this.prisma.analyticsSnapshot.findMany({
        where,
        orderBy: { snapshotDate: 'asc' },
        select: { snapshotDate: true, metricType: true, value: true },
      }),
    ]);

    return {
      post: { id: post.id, title: post.title, platform: post.platform, postedAt: post.postedAt },
      totals: byMetric.map((m) => ({ metric: m.metricType, value: m._sum.value ?? 0 })),
      timeSeries: timeSeries.map((t) => ({ date: t.snapshotDate, metric: t.metricType, value: t.value })),
    };
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  async export(dto: ExportAnalyticsDto) {
    const dateFilter = this.dateRange(dto.startDate, dto.endDate);
    const where: Prisma.AnalyticsSnapshotWhereInput = {
      ...dateFilter,
      ...(dto.scope === 'creator' ? { creatorProfileId: dto.scopeId } : {}),
      ...(dto.scope === 'campaign' ? { campaignId: dto.scopeId } : {}),
      ...(dto.scope === 'content' ? { publishedPostId: dto.scopeId } : {}),
    };

    const rows = await this.prisma.analyticsSnapshot.findMany({
      where,
      orderBy: { snapshotDate: 'asc' },
    });

    if (dto.format === 'JSON') {
      return { format: 'JSON', rows };
    }

    const header = 'id,publishedPostId,creatorProfileId,campaignId,metricType,platform,value,snapshotDate';
    const lines = rows.map((r) =>
      [r.id, r.publishedPostId ?? '', r.creatorProfileId ?? '', r.campaignId ?? '', r.metricType, r.platform ?? '', r.value, r.snapshotDate.toISOString()].join(','),
    );
    return { format: 'CSV', filename: `analytics-${dto.scope}-${dto.scopeId}-${Date.now()}.csv`, content: [header, ...lines].join('\n') };
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  private dateRange(startDate?: string, endDate?: string): Prisma.AnalyticsSnapshotWhereInput {
    if (!startDate && !endDate) return {};
    return {
      snapshotDate: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      },
    };
  }
}
