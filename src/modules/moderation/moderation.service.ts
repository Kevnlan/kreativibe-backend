import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ModerationStatus, ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ListModerationQueueDto,
  ModerationActionDto,
  RejectContentDto,
  CreateModerationRuleDto,
  UpdateModerationRuleDto,
} from './dto/moderation.dto';

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  private async creatorProfileId(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException({ message: 'Creator profile not found', code: 'CREATOR_PROFILE_NOT_FOUND' });
    return profile.id;
  }

  // ── Admin: Queue ──────────────────────────────────────────────────────────

  async listQueue(query: ListModerationQueueDto) {
    const where: Prisma.ModerationEntryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.moderationEntry.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          content: {
            select: {
              id: true,
              title: true,
              type: true,
              thumbnailUrl: true,
              coverImage: true,
              creatorProfile: { select: { id: true, avatar: true, bio: true } },
            },
          },
          ruleResults: { include: { rule: true } },
          rejectionReasons: true,
        },
      }),
      this.prisma.moderationEntry.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getEntry(contentId: string) {
    const entry = await this.prisma.moderationEntry.findUnique({
      where: { contentId },
      include: {
        content: true,
        ruleResults: { include: { rule: true } },
        rejectionReasons: true,
      },
    });
    if (!entry) throw new NotFoundException({ message: 'Moderation entry not found', code: 'MODERATION_NOT_FOUND' });
    return entry;
  }

  async assign(adminId: string, contentId: string) {
    const entry = await this.prisma.moderationEntry.findUnique({ where: { contentId } });
    if (!entry) throw new NotFoundException({ message: 'Moderation entry not found', code: 'MODERATION_NOT_FOUND' });
    if (entry.status !== 'QUEUED') {
      throw new BadRequestException({ message: 'Entry is not in queue', code: 'MODERATION_NOT_QUEUED' });
    }

    return this.prisma.moderationEntry.update({
      where: { contentId },
      data: {
        status: ModerationStatus.IN_REVIEW,
        assignedAdminId: adminId,
      },
    });
  }

  async approve(adminId: string, dto: ModerationActionDto) {
    const entry = await this.prisma.moderationEntry.findUnique({
      where: { contentId: dto.contentId },
      include: { content: true },
    });
    if (!entry) throw new NotFoundException({ message: 'Moderation entry not found', code: 'MODERATION_NOT_FOUND' });
    if (entry.status === 'APPROVED') {
      throw new BadRequestException({ message: 'Content already approved', code: 'ALREADY_APPROVED' });
    }

    const [updatedEntry, _updatedContent] = await this.prisma.$transaction([
      this.prisma.moderationEntry.update({
        where: { contentId: dto.contentId },
        data: {
          status: ModerationStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      }),
      this.prisma.content.update({
        where: { id: dto.contentId },
        data: { status: ContentStatus.APPROVED },
      }),
    ]);

    return updatedEntry;
  }

  async reject(adminId: string, dto: RejectContentDto) {
    const entry = await this.prisma.moderationEntry.findUnique({
      where: { contentId: dto.contentId },
    });
    if (!entry) throw new NotFoundException({ message: 'Moderation entry not found', code: 'MODERATION_NOT_FOUND' });
    if (entry.status === 'REJECTED') {
      throw new BadRequestException({ message: 'Content already rejected', code: 'ALREADY_REJECTED' });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.moderationEntry.update({
        where: { contentId: dto.contentId },
        data: {
          status: ModerationStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      });

      await tx.content.update({
        where: { id: dto.contentId },
        data: { status: ContentStatus.REJECTED },
      });

      await tx.rejectionReason.createMany({
        data: dto.reasons.map((r) => ({
          moderationEntryId: entry.id,
          reasonCode: r.reasonCode,
          notes: r.notes,
        })),
      });
    });

    return this.getEntry(dto.contentId);
  }

  // ── Admin: Rules ──────────────────────────────────────────────────────────

  async listRules() {
    const rules = await this.prisma.moderationRule.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { results: true } } },
    });
    return { items: rules };
  }

  async createRule(dto: CreateModerationRuleDto) {
    return this.prisma.moderationRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        ruleType: dto.ruleType,
        countryId: dto.countryId,
        isActive: dto.isActive,
      },
    });
  }

  async updateRule(dto: UpdateModerationRuleDto) {
    const { id, ...data } = dto;
    const existing = await this.prisma.moderationRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ message: 'Rule not found', code: 'RULE_NOT_FOUND' });

    return this.prisma.moderationRule.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.ruleType !== undefined ? { ruleType: data.ruleType } : {}),
        ...(data.countryId !== undefined ? { countryId: data.countryId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async deleteRule(id: string) {
    const existing = await this.prisma.moderationRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ message: 'Rule not found', code: 'RULE_NOT_FOUND' });
    await this.prisma.moderationRule.delete({ where: { id } });
  }

  // ── Creator endpoints ─────────────────────────────────────────────────────

  async getStatus(userId: string, contentId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const content = await this.prisma.content.findFirst({ where: { id: contentId, creatorProfileId } });
    if (!content) throw new NotFoundException({ message: 'Content not found', code: 'CONTENT_NOT_FOUND' });

    const entry = await this.prisma.moderationEntry.findUnique({
      where: { contentId },
      include: { rejectionReasons: true },
    });

    if (!entry) {
      return {
        moderationStatus: 'QUEUED',
        contentStatus: content.status,
        rejectionReasons: [],
        reviewedAt: null,
      };
    }

    return {
      moderationStatus: entry.status,
      contentStatus: content.status,
      rejectionReasons: entry.rejectionReasons,
      reviewedAt: entry.reviewedAt,
    };
  }

  async resubmit(userId: string, contentId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const content = await this.prisma.content.findFirst({ where: { id: contentId, creatorProfileId } });
    if (!content) throw new NotFoundException({ message: 'Content not found', code: 'CONTENT_NOT_FOUND' });

    if (content.status !== 'REJECTED') {
      throw new BadRequestException({ message: 'Only rejected content can be resubmitted', code: 'CONTENT_NOT_REJECTED' });
    }

    await this.prisma.$transaction([
      this.prisma.content.update({
        where: { id: contentId },
        data: { status: ContentStatus.SUBMITTED },
      }),
      this.prisma.moderationEntry.updateMany({
        where: { contentId },
        data: { status: ModerationStatus.QUEUED, reviewedAt: null, reviewedBy: null, assignedAdminId: null },
      }),
    ]);

    return { message: 'Content resubmitted for moderation' };
  }

  // ── Internal: auto-create entry on content submit ─────────────────────────

  async autoCreateEntry(contentId: string) {
    const existing = await this.prisma.moderationEntry.findUnique({ where: { contentId } });
    if (existing) return existing;

    return this.prisma.moderationEntry.create({
      data: { contentId, status: ModerationStatus.QUEUED },
    });
  }
}
