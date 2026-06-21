import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GenerateContractDto, UpdateContractDto, SignContractDto } from './dto/contract.dto';

const DEFAULT_CLAUSES = (deliverables: string[], totalAmount: number, currency: string) => [
  { id: 'scope', title: 'Scope of Work', content: 'The Creative agrees to create and deliver social media content as outlined in the campaign brief.', required: true, editable: true },
  { id: 'deliverables', title: 'Deliverables', content: deliverables.length ? deliverables.join(', ') : 'As outlined in the campaign brief.', required: true, editable: true },
  { id: 'payment', title: 'Payment Terms', content: `Total contract value of ${totalAmount} ${currency}, payable per approved milestone.`, required: true, editable: true },
  { id: 'timeline', title: 'Timeline', content: 'As outlined in the campaign schedule.', required: true, editable: false },
  { id: 'ip-rights', title: 'IP Rights', content: 'The Brand receives a license to use delivered content for marketing purposes upon payment.', required: true, editable: true },
  { id: 'confidentiality', title: 'Confidentiality', content: 'Both parties agree to keep campaign terms confidential.', required: false, editable: true },
];

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  private async assertBrandOwner(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, include: { brandProfile: true } });
    if (!campaign) throw new NotFoundException({ message: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
    if (campaign.brandProfile.userId !== userId) {
      throw new ForbiddenException({ message: 'Not authorized for this campaign', code: 'FORBIDDEN' });
    }
    return campaign;
  }

  private async assertAccess(userId: string, role: string, campaignId: string, contract: { applicationId: string }) {
    if (role === 'BRAND') {
      await this.assertBrandOwner(userId, campaignId);
      return;
    }
    const application = await this.prisma.campaignApplication.findUnique({
      where: { id: contract.applicationId },
      include: { creatorProfile: true },
    });
    if (!application || application.creatorProfile.userId !== userId) {
      throw new ForbiddenException({ message: 'Not authorized for this contract', code: 'FORBIDDEN' });
    }
  }

  private async seedMilestones(campaignId: string, totalAmount: number, currency: string, startDate: Date | null, endDate: Date | null) {
    const existing = await this.prisma.campaignMilestone.count({ where: { campaignId } });
    if (existing > 0) return;

    const campaign = await this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    const titles = campaign.milestones.length ? campaign.milestones : ['Final delivery'];
    const amountEach = new Prisma.Decimal(totalAmount).div(titles.length);

    const start = startDate ?? new Date();
    const end = endDate ?? new Date(start.getTime() + titles.length * 7 * 24 * 60 * 60 * 1000);
    const spanMs = Math.max(end.getTime() - start.getTime(), 0);

    await this.prisma.campaignMilestone.createMany({
      data: titles.map((title, i) => ({
        campaignId,
        title,
        amount: amountEach,
        currency,
        dueDate: new Date(start.getTime() + (spanMs * (i + 1)) / titles.length),
      })),
    });
  }

  async generate(userId: string, campaignId: string, dto: GenerateContractDto) {
    const campaign = await this.assertBrandOwner(userId, campaignId);
    const existing = await this.prisma.contract.findUnique({ where: { campaignId } });
    if (existing) throw new ConflictException({ message: 'Contract already exists for this campaign', code: 'CONTRACT_EXISTS' });

    const application = await this.prisma.campaignApplication.findUnique({
      where: { id: dto.applicationId },
      include: { creatorProfile: { include: { user: true } } },
    });
    if (!application || application.campaignId !== campaignId) {
      throw new NotFoundException({ message: 'Application not found for this campaign', code: 'APPLICATION_NOT_FOUND' });
    }

    const contract = await this.prisma.contract.create({
      data: {
        campaignId,
        applicationId: dto.applicationId,
        brandName: campaign.brandProfile.companyName,
        creativeName: application.creatorProfile.user.name,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        totalAmount: dto.proposedRate,
        currency: dto.currency,
        clauses: DEFAULT_CLAUSES(campaign.deliverables, dto.proposedRate, dto.currency),
        additionalTerms: '',
        status: 'DRAFT',
      },
    });

    await this.seedMilestones(campaignId, dto.proposedRate, dto.currency, campaign.startDate, campaign.endDate);

    return contract;
  }

  private async findByCampaign(campaignId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { campaignId } });
    if (!contract) throw new NotFoundException({ message: 'Contract not found', code: 'CONTRACT_NOT_FOUND' });
    return contract;
  }

  async get(userId: string, role: string, campaignId: string) {
    const contract = await this.findByCampaign(campaignId);
    await this.assertAccess(userId, role, campaignId, contract);
    return contract;
  }

  async update(userId: string, campaignId: string, dto: UpdateContractDto) {
    await this.assertBrandOwner(userId, campaignId);
    const contract = await this.findByCampaign(campaignId);
    if (contract.status !== 'DRAFT') {
      throw new BadRequestException({ message: 'Contract can only be edited while in DRAFT', code: 'CONTRACT_NOT_EDITABLE' });
    }

    const clauses = (contract.clauses as any[]).map((clause) => {
      const update = dto.clauses.find((c) => c.id === clause.id);
      return update ? { ...clause, content: update.content } : clause;
    });

    return this.prisma.contract.update({
      where: { id: contract.id },
      data: { clauses, ...(dto.additionalTerms !== undefined ? { additionalTerms: dto.additionalTerms } : {}) },
    });
  }

  async sign(userId: string, role: string, campaignId: string, dto: SignContractDto) {
    const contract = await this.findByCampaign(campaignId);
    await this.assertAccess(userId, role, campaignId, contract);

    const signedAt = dto.signedAt ? new Date(dto.signedAt) : new Date();
    const data =
      role === 'BRAND'
        ? { brandSignedAt: signedAt, brandSignature: dto.signature }
        : { creatorSignedAt: signedAt, creatorSignature: dto.signature };

    const brandSignedAt = role === 'BRAND' ? signedAt : contract.brandSignedAt;
    const creatorSignedAt = role === 'CREATOR' ? signedAt : contract.creatorSignedAt;
    const status = brandSignedAt && creatorSignedAt ? 'ACTIVE' : 'PARTIALLY_SIGNED';

    const updated = await this.prisma.contract.update({ where: { id: contract.id }, data: { ...data, status } });
    return { id: updated.id, status: updated.status, brandSignedAt: updated.brandSignedAt, creatorSignedAt: updated.creatorSignedAt };
  }

  // Stubbed: no PDF renderer wired yet — returns a deterministic fake URL.
  async download(userId: string, role: string, campaignId: string) {
    const contract = await this.findByCampaign(campaignId);
    await this.assertAccess(userId, role, campaignId, contract);
    return { url: `https://cdn.kreativibe.example/contracts/${contract.id}-signed.pdf` };
  }
}
