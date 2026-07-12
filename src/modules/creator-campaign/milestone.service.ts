import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SubmitDeliveryDto, RejectDeliveryDto, RequestRevisionDto } from './dto/delivery.dto';

@Injectable()
export class MilestoneService {
  constructor(private prisma: PrismaService) {}

  private async assertAccess(userId: string, role: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, include: { brandProfile: true } });
    if (!campaign) throw new NotFoundException({ message: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });

    if (role === 'BRAND') {
      if (campaign.brandProfile.userId !== userId) {
        throw new ForbiddenException({ message: 'Not authorized for this campaign', code: 'FORBIDDEN' });
      }
      return campaign;
    }

    const creatorProfile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
    const application = await this.prisma.campaignApplication.findUnique({
      where: { campaignId_creatorProfileId: { campaignId, creatorProfileId: creatorProfile.id } },
    });
    if (!application || application.status !== 'ACCEPTED') {
      throw new ForbiddenException({ message: 'Not assigned to this campaign', code: 'FORBIDDEN' });
    }
    return campaign;
  }

  private async findMilestone(campaignId: string, milestoneId: string) {
    const milestone = await this.prisma.campaignMilestone.findFirst({ where: { id: milestoneId, campaignId } });
    if (!milestone) throw new NotFoundException({ message: 'Milestone not found', code: 'MILESTONE_NOT_FOUND' });
    return milestone;
  }

  async list(userId: string, role: string, campaignId: string) {
    await this.assertAccess(userId, role, campaignId);
    const milestones = await this.prisma.campaignMilestone.findMany({ where: { campaignId }, orderBy: { dueDate: 'asc' } });
    return { milestones };
  }

  async getDelivery(userId: string, role: string, campaignId: string, milestoneId: string) {
    await this.assertAccess(userId, role, campaignId);
    const milestone = await this.findMilestone(campaignId, milestoneId);

    const delivery = await this.prisma.milestoneDelivery.findUnique({
      where: { milestoneId: milestone.id },
      include: { items: true },
    });
    if (!delivery) throw new NotFoundException({ message: 'No delivery submitted for this milestone', code: 'DELIVERY_NOT_FOUND' });

    return {
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      submittedBy: delivery.submittedByUserId,
      submittedAt: delivery.submittedAt,
      items: delivery.items,
      notes: delivery.notes,
      status: milestone.status,
      reviewNotes: delivery.reviewNotes,
    };
  }

  async submitDelivery(userId: string, campaignId: string, milestoneId: string, dto: SubmitDeliveryDto) {
    await this.assertAccess(userId, 'CREATOR', campaignId);
    const milestone = await this.findMilestone(campaignId, milestoneId);
    if (!['PENDING', 'REVISION_REQUESTED'].includes(milestone.status)) {
      throw new ConflictException({ message: 'Milestone is not open for delivery submission', code: 'MILESTONE_NOT_OPEN' });
    }

    const delivery = await this.prisma.$transaction(async (tx) => {
      await tx.milestoneDeliveryItem.deleteMany({ where: { delivery: { milestoneId: milestone.id } } });
      const upserted = await tx.milestoneDelivery.upsert({
        where: { milestoneId: milestone.id },
        create: {
          milestoneId: milestone.id,
          submittedByUserId: userId,
          notes: dto.notes,
          items: { create: dto.items },
        },
        update: {
          submittedByUserId: userId,
          submittedAt: new Date(),
          notes: dto.notes,
          reviewNotes: null,
          items: { create: dto.items },
        },
        include: { items: true },
      });
      await tx.campaignMilestone.update({
        where: { id: milestone.id },
        data: { status: 'SUBMITTED', submittedAt: new Date(), reviewNotes: null },
      });
      return upserted;
    });

    return {
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      submittedBy: delivery.submittedByUserId,
      submittedAt: delivery.submittedAt,
      items: delivery.items,
      notes: delivery.notes,
      status: 'SUBMITTED',
      reviewNotes: delivery.reviewNotes,
    };
  }

  async approveDelivery(userId: string, campaignId: string, milestoneId: string) {
    const campaign = await this.assertAccess(userId, 'BRAND', campaignId);
    const milestone = await this.findMilestone(campaignId, milestoneId);
    if (milestone.status !== 'SUBMITTED') {
      throw new ConflictException({ message: 'Milestone is not awaiting review', code: 'MILESTONE_NOT_SUBMITTED' });
    }
    const delivery = await this.prisma.milestoneDelivery.findUnique({ where: { milestoneId: milestone.id } });
    if (!delivery) throw new NotFoundException({ message: 'No delivery submitted for this milestone', code: 'DELIVERY_NOT_FOUND' });

    const approvedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.campaignMilestone.update({ where: { id: milestone.id }, data: { status: 'APPROVED', approvedAt } });

      const creatorUser = await tx.user.findUniqueOrThrow({ where: { id: delivery.submittedByUserId } });
      const wallet = await tx.wallet.upsert({
        where: { userId: creatorUser.id },
        create: { userId: creatorUser.id },
        update: {},
      });
      const amount = new Prisma.Decimal(milestone.amount);
      const balanceAfter = wallet.balance.add(amount);
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.PAYOUT,
          amount,
          direction: 'CREDIT',
          balanceAfter,
          currency: milestone.currency,
          description: `Milestone approved: ${milestone.title}`,
          referenceId: milestone.id,
          referenceType: 'CampaignMilestone',
        },
      });
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

      const creatorProfile = await tx.creatorProfile.findUnique({ where: { userId: creatorUser.id } });
      if (creatorProfile) {
        await tx.reputationPoint.create({
          data: { creatorProfileId: creatorProfile.id, activity: `Completed milestone: ${milestone.title}`, points: 50, type: 'MILESTONE' },
        });
      }
    });

    return { milestoneId: milestone.id, status: 'APPROVED', approvedAt };
  }

  async rejectDelivery(userId: string, campaignId: string, milestoneId: string, dto: RejectDeliveryDto) {
    await this.assertAccess(userId, 'BRAND', campaignId);
    const milestone = await this.findMilestone(campaignId, milestoneId);
    if (milestone.status !== 'SUBMITTED') {
      throw new ConflictException({ message: 'Milestone is not awaiting review', code: 'MILESTONE_NOT_SUBMITTED' });
    }

    await this.prisma.$transaction([
      this.prisma.campaignMilestone.update({ where: { id: milestone.id }, data: { status: 'REJECTED', reviewNotes: dto.reason } }),
      this.prisma.milestoneDelivery.update({ where: { milestoneId: milestone.id }, data: { reviewNotes: dto.reason } }),
    ]);

    return { milestoneId: milestone.id, status: 'REJECTED', reviewNotes: dto.reason };
  }

  async requestRevision(userId: string, campaignId: string, milestoneId: string, dto: RequestRevisionDto) {
    await this.assertAccess(userId, 'BRAND', campaignId);
    const milestone = await this.findMilestone(campaignId, milestoneId);
    if (milestone.status !== 'SUBMITTED') {
      throw new ConflictException({ message: 'Milestone is not awaiting review', code: 'MILESTONE_NOT_SUBMITTED' });
    }

    await this.prisma.$transaction([
      this.prisma.campaignMilestone.update({ where: { id: milestone.id }, data: { status: 'REVISION_REQUESTED', reviewNotes: dto.notes } }),
      this.prisma.milestoneDelivery.update({ where: { milestoneId: milestone.id }, data: { reviewNotes: dto.notes } }),
    ]);

    return { milestoneId: milestone.id, status: 'REVISION_REQUESTED', reviewNotes: dto.notes };
  }
}
