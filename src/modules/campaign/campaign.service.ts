import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ListCampaignsDto, MarketplaceCampaignsDto } from './dto/list-campaigns.dto';

const ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class CampaignService {
  constructor(private prisma: PrismaService) {}

  private async brandProfileId(userId: string) {
    const profile = await this.prisma.brandProfile.findUniqueOrThrow({ where: { userId } });
    return profile.id;
  }

  private toData(dto: CreateCampaignDto | UpdateCampaignDto) {
    return {
      ...dto,
      source: dto.source ? (dto.source.toUpperCase() as 'MANUAL' | 'AI') : undefined,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    };
  }

  async create(userId: string, dto: CreateCampaignDto) {
    const brandProfileId = await this.brandProfileId(userId);
    return this.prisma.campaign.create({
      data: { ...this.toData(dto), brandProfileId } as Prisma.CampaignUncheckedCreateInput,
    });
  }

  async list(userId: string, query: ListCampaignsDto) {
    const brandProfileId = await this.brandProfileId(userId);
    const where: Prisma.CampaignWhereInput = {
      brandProfileId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { _count: { select: { applications: true } } },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  private async findOwned(brandProfileId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, brandProfileId } });
    if (!campaign) throw new NotFoundException({ message: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
    return campaign;
  }

  async get(userId: string, id: string) {
    const brandProfileId = await this.brandProfileId(userId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, brandProfileId },
      include: { _count: { select: { applications: true } } },
    });
    if (!campaign) throw new NotFoundException({ message: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
    return campaign;
  }

  async update(userId: string, id: string, dto: UpdateCampaignDto) {
    const brandProfileId = await this.brandProfileId(userId);
    const campaign = await this.findOwned(brandProfileId, id);
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException({ message: 'Only draft campaigns can be edited', code: 'CAMPAIGN_NOT_EDITABLE' });
    }
    return this.prisma.campaign.update({ where: { id }, data: this.toData(dto) as Prisma.CampaignUncheckedUpdateInput });
  }

  async remove(userId: string, id: string) {
    const brandProfileId = await this.brandProfileId(userId);
    const campaign = await this.findOwned(brandProfileId, id);
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException({ message: 'Only draft campaigns can be deleted', code: 'CAMPAIGN_NOT_DELETABLE' });
    }
    await this.prisma.campaign.delete({ where: { id } });
  }

  private async transition(userId: string, id: string, to: CampaignStatus) {
    const brandProfileId = await this.brandProfileId(userId);
    const campaign = await this.findOwned(brandProfileId, id);
    if (!ALLOWED_TRANSITIONS[campaign.status].includes(to)) {
      throw new BadRequestException({
        message: `Cannot move campaign from ${campaign.status} to ${to}`,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }
    return this.prisma.campaign.update({
      where: { id },
      data: { status: to, ...(to === 'COMPLETED' ? { completedAt: new Date() } : {}) },
    });
  }

  publish(userId: string, id: string) {
    return this.transition(userId, id, 'ACTIVE');
  }

  pause(userId: string, id: string) {
    return this.transition(userId, id, 'PAUSED');
  }

  resume(userId: string, id: string) {
    return this.transition(userId, id, 'ACTIVE');
  }

  complete(userId: string, id: string) {
    return this.transition(userId, id, 'COMPLETED');
  }

  cancel(userId: string, id: string) {
    return this.transition(userId, id, 'CANCELLED');
  }

  async stats(userId: string, id: string) {
    const brandProfileId = await this.brandProfileId(userId);
    await this.findOwned(brandProfileId, id);
    const applications = await this.prisma.campaignApplication.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: { _all: true },
    });

    const byStatus = Object.fromEntries(applications.map((a) => [a.status, a._count._all]));
    const totalApplications = applications.reduce((sum, a) => sum + a._count._all, 0);

    return {
      totalApplications,
      applicationsByStatus: byStatus,
      acceptedCreators: byStatus['ACCEPTED'] ?? 0,
    };
  }

  async marketplace(query: MarketplaceCampaignsDto) {
    const where: Prisma.CampaignWhereInput = {
      status: 'ACTIVE',
      ...(query.platform ? { platforms: { has: query.platform } } : {}),
      ...(query.category ? { categories: { has: query.category } } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { brandProfile: { select: { companyName: true, logo: true, isVerified: true } } },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getPublic(id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, status: 'ACTIVE' },
      include: { brandProfile: { select: { companyName: true, logo: true, isVerified: true } } },
    });
    if (!campaign) throw new NotFoundException({ message: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
    return campaign;
  }
}
