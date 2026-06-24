import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SaveProposalDto } from './dto/proposal.dto';

@Injectable()
export class ProposalService {
  constructor(private prisma: PrismaService) {}

  private async creatorProfileId(userId: string) {
    const profile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
    return profile.id;
  }

  private async assertCampaignAccess(userId: string, role: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, include: { brandProfile: true } });
    if (!campaign) throw new NotFoundException({ message: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
    if (role === 'BRAND' && campaign.brandProfile.userId !== userId) {
      throw new ForbiddenException({ message: 'Not authorized for this campaign', code: 'FORBIDDEN' });
    }
    return campaign;
  }

  async get(userId: string, role: string, campaignId: string) {
    await this.assertCampaignAccess(userId, role, campaignId);
    const creatorProfileId = role === 'CREATOR' ? await this.creatorProfileId(userId) : undefined;

    const proposal = creatorProfileId
      ? await this.prisma.proposal.findUnique({ where: { campaignId_creatorProfileId: { campaignId, creatorProfileId } } })
      : await this.prisma.proposal.findFirst({ where: { campaignId } });

    if (!proposal) throw new NotFoundException({ message: 'Proposal not found', code: 'PROPOSAL_NOT_FOUND' });
    return proposal;
  }

  async save(userId: string, campaignId: string, dto: SaveProposalDto) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const existing = await this.prisma.proposal.findUnique({
      where: { campaignId_creatorProfileId: { campaignId, creatorProfileId } },
    });
    if (existing && existing.status !== 'DRAFT') {
      throw new ConflictException({ message: 'Proposal can no longer be edited', code: 'PROPOSAL_NOT_EDITABLE' });
    }

    const { campaignId: _campaignId, ...rest } = dto;
    return this.prisma.proposal.upsert({
      where: { campaignId_creatorProfileId: { campaignId, creatorProfileId } },
      create: { campaignId, creatorProfileId, ...rest, status: 'DRAFT' },
      update: rest,
    });
  }

  async submit(userId: string, campaignId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const proposal = await this.prisma.proposal.findUnique({
      where: { campaignId_creatorProfileId: { campaignId, creatorProfileId } },
    });
    if (!proposal) throw new NotFoundException({ message: 'Proposal not found', code: 'PROPOSAL_NOT_FOUND' });
    if (proposal.status !== 'DRAFT') {
      throw new ConflictException({ message: 'Proposal already submitted or campaign no longer accepting proposals', code: 'PROPOSAL_NOT_DRAFT' });
    }

    return this.prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
  }
}
