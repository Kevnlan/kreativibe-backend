import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateApplicationDto, UpdateApplicationDto } from './dto/application.dto';

@Injectable()
export class CampaignApplicationService {
  constructor(private prisma: PrismaService) {}

  private async creatorProfileId(userId: string) {
    const profile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
    return profile.id;
  }

  async apply(userId: string, campaignId: string, dto: CreateApplicationDto) {
    const creatorProfileId = await this.creatorProfileId(userId);

    const campaign = await this.prisma.campaign.findFirst({ where: { id: campaignId, status: 'ACTIVE' } });
    if (!campaign) throw new NotFoundException({ message: 'Campaign not found or not open for applications', code: 'CAMPAIGN_NOT_FOUND' });

    const existing = await this.prisma.campaignApplication.findUnique({
      where: { campaignId_creatorProfileId: { campaignId, creatorProfileId } },
    });
    if (existing) throw new ConflictException({ message: 'You have already applied to this campaign', code: 'ALREADY_APPLIED' });

    return this.prisma.campaignApplication.create({
      data: { campaignId, creatorProfileId, ...dto },
    });
  }

  async listForCampaign(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, brandProfile: { userId } },
    });
    if (!campaign) throw new NotFoundException({ message: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });

    return this.prisma.campaignApplication.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      include: { creatorProfile: { select: { userId: true, bio: true, avatar: true, categories: true, averageRating: true } } },
    });
  }

  async listForCreator(userId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    return this.prisma.campaignApplication.findMany({
      where: { creatorProfileId },
      orderBy: { createdAt: 'desc' },
      include: { campaign: { select: { title: true, status: true, brandProfileId: true } } },
    });
  }

  private async findAccessible(userId: string, role: string, id: string) {
    const application = await this.prisma.campaignApplication.findUnique({
      where: { id },
      include: { campaign: { include: { brandProfile: true } }, creatorProfile: true },
    });
    if (!application) throw new NotFoundException({ message: 'Application not found', code: 'APPLICATION_NOT_FOUND' });

    const isOwningCreator = role === 'CREATOR' && application.creatorProfile.userId === userId;
    const isOwningBrand = role === 'BRAND' && application.campaign.brandProfile.userId === userId;
    if (!isOwningCreator && !isOwningBrand) {
      throw new ForbiddenException({ message: 'Not authorized to view this application', code: 'FORBIDDEN' });
    }
    return application;
  }

  async get(userId: string, role: string, id: string) {
    return this.findAccessible(userId, role, id);
  }

  async updateStatus(userId: string, id: string, dto: UpdateApplicationDto) {
    const application = await this.prisma.campaignApplication.findUnique({
      where: { id },
      include: { campaign: { include: { brandProfile: true } } },
    });
    if (!application) throw new NotFoundException({ message: 'Application not found', code: 'APPLICATION_NOT_FOUND' });
    if (application.campaign.brandProfile.userId !== userId) {
      throw new ForbiddenException({ message: 'Not authorized to update this application', code: 'FORBIDDEN' });
    }
    return this.prisma.campaignApplication.update({ where: { id }, data: { status: dto.status } });
  }

  async withdraw(userId: string, id: string) {
    const application = await this.prisma.campaignApplication.findUnique({
      where: { id },
      include: { creatorProfile: true },
    });
    if (!application) throw new NotFoundException({ message: 'Application not found', code: 'APPLICATION_NOT_FOUND' });
    if (application.creatorProfile.userId !== userId) {
      throw new ForbiddenException({ message: 'Not authorized to withdraw this application', code: 'FORBIDDEN' });
    }
    if (application.status === 'ACCEPTED') {
      throw new BadRequestException({ message: 'Cannot withdraw an accepted application', code: 'APPLICATION_NOT_WITHDRAWABLE' });
    }
    await this.prisma.campaignApplication.update({ where: { id }, data: { status: 'WITHDRAWN' } });
  }
}
