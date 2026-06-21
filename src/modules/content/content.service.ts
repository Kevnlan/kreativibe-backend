import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ListContentDto } from './dto/list-content.dto';

// The contract exposes a "PUBLISHED" lifecycle state; internally that's APPROVED (content live in the marketplace).
const toInternalStatus = (status?: string): ContentStatus | undefined =>
  status === 'PUBLISHED' ? 'APPROVED' : (status as ContentStatus | undefined);

const toContractStatus = (status: ContentStatus): string => (status === 'APPROVED' ? 'PUBLISHED' : status);

const present = <T extends { status: ContentStatus }>(content: T) => ({ ...content, status: toContractStatus(content.status) });

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  private async creatorProfileId(userId: string) {
    const profile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
    return profile.id;
  }

  private async revenue(creatorProfileId: string) {
    const result = await this.prisma.offer.aggregate({
      where: { creatorProfileId, license: { isNot: null } },
      _sum: { currentAmount: true },
    });
    return Number(result._sum.currentAmount ?? 0);
  }

  async list(userId: string, query: ListContentDto) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const where: Prisma.ContentWhereInput = {
      creatorProfileId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.category ? { categoryCode: query.category } : {}),
      ...(query.platform ? { platforms: { has: query.platform } } : {}),
      ...(query.status ? { status: toInternalStatus(query.status) } : {}),
      ...(query.query ? { title: { contains: query.query, mode: 'insensitive' } } : {}),
    };

    const [items, total, statusCounts, totalRevenue] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.content.count({ where }),
      this.prisma.content.groupBy({ by: ['status'], where: { creatorProfileId }, _count: { _all: true } }),
      this.revenue(creatorProfileId),
    ]);

    const countFor = (...statuses: ContentStatus[]) =>
      statusCounts.filter((s) => statuses.includes(s.status)).reduce((sum, s) => sum + s._count._all, 0);

    return {
      items: items.map(present),
      total,
      page: query.page,
      limit: query.limit,
      stats: {
        total: statusCounts.reduce((sum, s) => sum + s._count._all, 0),
        published: countFor('APPROVED', 'SOLD'),
        draft: countFor('DRAFT'),
        underReview: countFor('SUBMITTED', 'UNDER_REVIEW'),
        totalRevenue,
      },
    };
  }

  async get(userId: string, id: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const content = await this.prisma.content.findFirst({ where: { id, creatorProfileId } });
    if (!content) throw new NotFoundException({ message: 'Content not found', code: 'CONTENT_NOT_FOUND' });
    return present(content);
  }

  async create(userId: string, dto: CreateContentDto) {
    const creatorProfileId = await this.prisma.creatorProfile
      .findUniqueOrThrow({ where: { userId } })
      .then((p) => p.id);
    const status: ContentStatus = dto.intent === 'SUBMIT' ? 'SUBMITTED' : 'DRAFT';

    const created = await this.prisma.content.create({
      data: {
        creatorProfileId,
        type: dto.type,
        format: dto.format,
        title: dto.metadata.title,
        description: dto.metadata.description,
        categoryCode: dto.metadata.category,
        platforms: dto.metadata.platforms,
        tags: dto.metadata.tags,
        brand: dto.metadata.brand,
        coverImage: dto.coverImage,
        mediaUrls: dto.mediaUrls,
        fileUrl: dto.mediaUrls[0],
        thumbnailUrl: dto.thumbnailUrl,
        price: dto.price,
        currency: dto.currency,
        status,
      },
    });
    return present(created);
  }

  private async findOwned(creatorProfileId: string, id: string) {
    const content = await this.prisma.content.findFirst({ where: { id, creatorProfileId } });
    if (!content) throw new NotFoundException({ message: 'Content not found', code: 'CONTENT_NOT_FOUND' });
    return content;
  }

  async update(userId: string, id: string, dto: UpdateContentDto) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const existing = await this.findOwned(creatorProfileId, id);
    if (existing.status === 'UNDER_REVIEW' || existing.status === 'SOLD') {
      throw new BadRequestException({ message: 'Content cannot be edited while under review or sold', code: 'CONTENT_NOT_EDITABLE' });
    }

    const metadata = dto.metadata ?? {};
    const updated = await this.prisma.content.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.format !== undefined ? { format: dto.format } : {}),
        ...(metadata.title !== undefined ? { title: metadata.title } : {}),
        ...(metadata.description !== undefined ? { description: metadata.description } : {}),
        ...(metadata.category !== undefined ? { categoryCode: metadata.category } : {}),
        ...(metadata.platforms !== undefined ? { platforms: metadata.platforms } : {}),
        ...(metadata.tags !== undefined ? { tags: metadata.tags } : {}),
        ...(metadata.brand !== undefined ? { brand: metadata.brand } : {}),
        ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage } : {}),
        ...(dto.mediaUrls !== undefined ? { mediaUrls: dto.mediaUrls } : {}),
        ...(dto.thumbnailUrl !== undefined ? { thumbnailUrl: dto.thumbnailUrl } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      },
    });
    return present(updated);
  }

  async remove(userId: string, id: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    await this.findOwned(creatorProfileId, id);
    await this.prisma.content.delete({ where: { id } });
  }

  async duplicate(userId: string, id: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const existing = await this.findOwned(creatorProfileId, id);
    const { id: _id, createdAt, updatedAt, currentVersionId, moderationStatus, status, ...rest } = existing;

    const copy = await this.prisma.content.create({
      data: { ...rest, title: `${existing.title} (Copy)`, status: 'DRAFT' },
    });
    return present(copy);
  }

  async listVersions(userId: string, id: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    await this.findOwned(creatorProfileId, id);
    const versions = await this.prisma.contentVersion.findMany({ where: { contentId: id }, orderBy: { version: 'desc' } });
    return { versions };
  }
}
