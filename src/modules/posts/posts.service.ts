import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ListPostsDto } from './dto/list-posts.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, query: ListPostsDto) {
    const creatorProfileId = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } }).then((p) => p.id);
    const where: Prisma.PublishedPostWhereInput = {
      creatorProfileId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total, aggregates, statusCounts] = await Promise.all([
      this.prisma.publishedPost.findMany({
        where,
        orderBy: { postedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.publishedPost.count({ where }),
      this.prisma.publishedPost.aggregate({
        where: { creatorProfileId },
        _sum: { views: true, price: true },
      }),
      this.prisma.publishedPost.groupBy({ by: ['status'], where: { creatorProfileId }, _count: { _all: true } }),
    ]);

    const totalPosts = statusCounts.reduce((sum, s) => sum + s._count._all, 0);
    const activeCount = statusCounts.find((s) => s.status === 'ACTIVE')?._count._all ?? 0;

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      stats: {
        totalPosts,
        activeCount,
        totalViews: aggregates._sum.views ?? 0,
        totalEarned: Number(aggregates._sum.price ?? 0),
      },
    };
  }
}
