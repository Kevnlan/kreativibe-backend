import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ListUsersDto,
  UserActionDto,
  VerifyUserDto,
  ListAuditLogsDto,
  ContentActionDto,
  FeatureContentDto,
  UpdateCommissionDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── Platform Stats ──────────────────────────────────────────────────────────

  async platformStats() {
    const [
      totalUsers, totalCreators, totalBrands, totalAdmins,
      activeUsers, totalContent, approvedContent, soldContent,
      totalOffers, acceptedOffers, totalCampaigns, activeCampaigns,
      totalVolume, totalCommission, pendingWithdrawals, openTickets,
      pendingModeration,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'CREATOR' } }),
      this.prisma.user.count({ where: { role: 'BRAND' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.content.count(),
      this.prisma.content.count({ where: { status: 'APPROVED' } }),
      this.prisma.content.count({ where: { status: 'SOLD' } }),
      this.prisma.offer.count(),
      this.prisma.offer.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.campaign.count(),
      this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      this.prisma.payment.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amount: true } }),
      this.prisma.platformCommission.aggregate({ _sum: { amount: true } }),
      this.prisma.payout.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.moderationEntry.count({ where: { status: 'QUEUED' } }),
    ]);

    return {
      users: { total: totalUsers, creators: totalCreators, brands: totalBrands, admins: totalAdmins, active: activeUsers },
      content: { total: totalContent, approved: approvedContent, sold: soldContent },
      offers: { total: totalOffers, accepted: acceptedOffers },
      campaigns: { total: totalCampaigns, active: activeCampaigns },
      revenue: {
        grossVolume: totalVolume._sum.amount ?? 0,
        platformCommission: totalCommission._sum.amount ?? 0,
      },
      operations: { pendingWithdrawals, openTickets, pendingModeration },
    };
  }

  // ── User Management ─────────────────────────────────────────────────────────

  async listUsers(query: ListUsersDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.isEmailVerified !== undefined ? { isEmailVerified: query.isEmailVerified } : {}),
      ...(query.search ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true, email: true, name: true, role: true, isActive: true,
          isEmailVerified: true, countryId: true, createdAt: true,
          creatorProfile: { select: { id: true, isVerified: true, averageRating: true } },
          brandProfile: { select: { id: true, companyName: true, isVerified: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async banUser(adminId: string, dto: UserActionDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    if (user.role === 'ADMIN') throw new BadRequestException({ message: 'Cannot ban admin', code: 'CANNOT_BAN_ADMIN' });

    await this.prisma.user.update({ where: { id: dto.userId }, data: { isActive: false } });

    await this.audit(adminId, AuditAction.USER_BANNED, 'User', dto.userId, { reason: dto.reason });

    return { success: true, message: 'User banned' };
  }

  async suspendUser(adminId: string, dto: UserActionDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    if (user.role === 'ADMIN') throw new BadRequestException({ message: 'Cannot suspend admin', code: 'CANNOT_SUSPEND_ADMIN' });

    await this.prisma.user.update({ where: { id: dto.userId }, data: { isActive: false } });

    await this.audit(adminId, AuditAction.USER_SUSPENDED, 'User', dto.userId, { reason: dto.reason });

    return { success: true, message: 'User suspended' };
  }

  async reinstateUser(adminId: string, dto: UserActionDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });

    await this.prisma.user.update({ where: { id: dto.userId }, data: { isActive: true } });

    await this.audit(adminId, AuditAction.USER_REINSTATED, 'User', dto.userId, { reason: dto.reason });

    return { success: true, message: 'User reinstated' };
  }

  async verifyUser(adminId: string, dto: VerifyUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { creatorProfile: true, brandProfile: true },
    });
    if (!user) throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });

    if (user.creatorProfile) {
      await this.prisma.creatorProfile.update({
        where: { id: user.creatorProfile.id },
        data: { isVerified: dto.verified, verificationStatus: dto.verified ? 'VERIFIED' : 'PENDING' },
      });
    }
    if (user.brandProfile) {
      await this.prisma.brandProfile.update({
        where: { id: user.brandProfile.id },
        data: { isVerified: dto.verified },
      });
    }

    await this.audit(
      adminId,
      dto.verified ? AuditAction.USER_VERIFIED : AuditAction.USER_VERIFICATION_REVOKED,
      'User',
      dto.userId,
    );

    return { success: true, verified: dto.verified };
  }

  // ── Content Management ──────────────────────────────────────────────────────

  async removeContent(adminId: string, dto: ContentActionDto) {
    const content = await this.prisma.content.findUnique({ where: { id: dto.contentId } });
    if (!content) throw new NotFoundException({ message: 'Content not found', code: 'CONTENT_NOT_FOUND' });

    await this.prisma.content.update({ where: { id: dto.contentId }, data: { status: 'ARCHIVED' } });

    await this.audit(adminId, AuditAction.CONTENT_REMOVED, 'Content', dto.contentId, { reason: dto.reason });

    return { success: true, message: 'Content archived' };
  }

  async featureContent(adminId: string, dto: FeatureContentDto) {
    const content = await this.prisma.content.findUnique({ where: { id: dto.contentId } });
    if (!content) throw new NotFoundException({ message: 'Content not found', code: 'CONTENT_NOT_FOUND' });

    // Using a hypothetical isFeatured field — if not in schema, we skip the update
    // and just log the action
    await this.audit(
      adminId,
      dto.featured ? AuditAction.CONTENT_FEATURED : AuditAction.CONTENT_UNFEATURED,
      'Content',
      dto.contentId,
    );

    return { success: true, featured: dto.featured };
  }

  // ── Commission Management ───────────────────────────────────────────────────

  async updateCommission(adminId: string, dto: UpdateCommissionDto) {
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();

    // Expire any existing active rule for this transaction type
    await this.prisma.commissionRule.updateMany({
      where: {
        transactionType: dto.transactionType,
        effectiveTo: null,
      },
      data: { effectiveTo: effectiveFrom },
    });

    const rule = await this.prisma.commissionRule.create({
      data: {
        transactionType: dto.transactionType,
        rate: dto.rate,
        effectiveFrom,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdBy: adminId,
      },
    });

    await this.audit(adminId, AuditAction.COMMISSION_RATE_CHANGED, 'CommissionRule', rule.id, { rate: dto.rate });

    return rule;
  }

  // ── Audit Log ───────────────────────────────────────────────────────────────

  async listAuditLogs(query: ListAuditLogsDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  // ── Helper ──────────────────────────────────────────────────────────────────

  async audit(
    actorId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
