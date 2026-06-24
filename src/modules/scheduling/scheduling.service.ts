import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ContentPlatform } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduledPostDto, UpdateScheduledPostDto } from './dto/scheduled-post.dto';

@Injectable()
export class SchedulingService {
  constructor(private prisma: PrismaService) {}

  private async assertAccess(userId: string, campaignId: string) {
    const creatorProfile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
    const application = await this.prisma.campaignApplication.findUnique({
      where: { campaignId_creatorProfileId: { campaignId, creatorProfileId: creatorProfile.id } },
    });
    if (!application || application.status !== 'ACCEPTED') {
      throw new NotFoundException({ message: 'Campaign not found or not accessible', code: 'CAMPAIGN_NOT_FOUND' });
    }
    return creatorProfile.id;
  }

  private async findOwnedPost(campaignId: string, creatorProfileId: string, postId: string) {
    const post = await this.prisma.scheduledPost.findFirst({ where: { id: postId, campaignId, creatorProfileId } });
    if (!post) throw new NotFoundException({ message: 'Scheduled post not found', code: 'SCHEDULED_POST_NOT_FOUND' });
    return post;
  }

  async list(userId: string, campaignId: string) {
    const creatorProfileId = await this.assertAccess(userId, campaignId);
    const posts = await this.prisma.scheduledPost.findMany({
      where: { campaignId, creatorProfileId },
      orderBy: { scheduledDate: 'asc' },
    });
    return { posts };
  }

  async create(userId: string, campaignId: string, dto: CreateScheduledPostDto) {
    const creatorProfileId = await this.assertAccess(userId, campaignId);
    const { campaignId: _campaignId, ...rest } = dto;
    return this.prisma.scheduledPost.create({
      data: { campaignId, creatorProfileId, ...rest, platform: rest.platform as ContentPlatform },
    });
  }

  async update(userId: string, campaignId: string, postId: string, dto: UpdateScheduledPostDto) {
    const creatorProfileId = await this.assertAccess(userId, campaignId);
    await this.findOwnedPost(campaignId, creatorProfileId, postId);
    const { campaignId: _campaignId, postId: _postId, ...rest } = dto;
    return this.prisma.scheduledPost.update({
      where: { id: postId },
      data: { ...rest, platform: rest.platform as ContentPlatform | undefined },
    });
  }

  async remove(userId: string, campaignId: string, postId: string) {
    const creatorProfileId = await this.assertAccess(userId, campaignId);
    await this.findOwnedPost(campaignId, creatorProfileId, postId);
    await this.prisma.scheduledPost.delete({ where: { id: postId } });
  }

  // Stubbed: no real platform publish call yet — flips status and fabricates a post URL so the
  // frontend flow can be exercised end-to-end ahead of the real social integration.
  async publishNow(userId: string, campaignId: string, postId: string) {
    const creatorProfileId = await this.assertAccess(userId, campaignId);
    const post = await this.findOwnedPost(campaignId, creatorProfileId, postId);

    if (post.socialAccountId) {
      const account = await this.prisma.socialAccount.findUnique({ where: { id: post.socialAccountId } });
      const expired = account?.tokenExpiresAt && account.tokenExpiresAt < new Date();
      if (!account || !account.isActive || expired) {
        throw new ConflictException({ message: 'Platform account not connected or token expired', code: 'SOCIAL_ACCOUNT_UNAVAILABLE' });
      }
    }

    const publishedAt = new Date();
    const updated = await this.prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        status: 'PUBLISHED',
        publishedAt,
        platformPostUrl: `https://${post.platform.toLowerCase()}.com/p/${postId}`,
      },
    });

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, include: { brandProfile: true } });
    await this.prisma.publishedPost.upsert({
      where: { scheduledPostId: postId },
      create: {
        creatorProfileId,
        scheduledPostId: postId,
        title: post.title,
        platform: post.platform,
        type: 'POST',
        status: 'ACTIVE',
        brand: campaign?.brandProfile.companyName,
        postedAt: publishedAt,
      },
      update: { status: 'ACTIVE', postedAt: publishedAt },
    });

    return updated;
  }
}
