import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentPlatform } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { ConnectDto, OauthCallbackDto, RefreshTokenDto } from './dto/social.dto';

const OAUTH_URLS: Record<string, string> = {
  INSTAGRAM: 'https://api.instagram.com/oauth/authorize',
  TIKTOK: 'https://www.tiktok.com/auth/authorize/',
  FACEBOOK: 'https://www.facebook.com/v18.0/dialog/oauth',
  YOUTUBE: 'https://accounts.google.com/o/oauth2/v2/auth',
  X: 'https://twitter.com/i/oauth2/authorize',
};

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  private sanitize(account: any) {
    const { accessToken: _accessToken, refreshToken: _refreshToken, ...safe } = account;
    return safe;
  }

  private async findOwned(userId: string, id: string) {
    const account = await this.prisma.socialAccount.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundException({ message: 'Social account not found', code: 'SOCIAL_ACCOUNT_NOT_FOUND' });
    return account;
  }

  async list(userId: string) {
    const accounts = await this.prisma.socialAccount.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { accounts: accounts.map((a) => this.sanitize(a)), total: accounts.length };
  }

  async get(userId: string, id: string) {
    const account = await this.findOwned(userId, id);
    return this.sanitize(account);
  }

  // Stubbed: no real provider client ID/secret configured yet. Returns a deterministic
  // pseudo-authUrl + state so the frontend OAuth redirect flow can be wired end-to-end now;
  // swap in real provider URLs/secrets once credentials are available.
  connect(dto: ConnectDto) {
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = `${OAUTH_URLS[dto.platform]}?client_id=stub&redirect_uri=${encodeURIComponent(dto.redirectUrl)}&state=${state}`;
    return { authUrl, state };
  }

  // Stubbed: trades the (fake) authorization code for a (fake) token instead of calling the
  // real platform API. Persists a SocialAccount so the rest of the platform (scheduling, etc.)
  // can be built and tested against real rows.
  async callback(userId: string, platform: string, dto: OauthCallbackDto) {
    const platformUserId = `stub_${crypto.createHash('sha256').update(dto.code).digest('hex').slice(0, 12)}`;
    const account = await this.prisma.socialAccount.upsert({
      where: { userId_platform_platformUserId: { userId, platform: platform as ContentPlatform, platformUserId } },
      create: {
        userId,
        platform: platform as ContentPlatform,
        platformUserId,
        username: `${platform.toLowerCase()}_user`,
        displayName: `Connected ${platform} Account`,
        accessToken: crypto.randomBytes(32).toString('hex'),
        refreshToken: crypto.randomBytes(32).toString('hex'),
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        permissions: ['read', 'write', 'publish'],
      },
      update: {
        accessToken: crypto.randomBytes(32).toString('hex'),
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true,
      },
    });
    return this.sanitize(account);
  }

  async disconnect(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.socialAccount.delete({ where: { id } });
  }

  async refreshToken(userId: string, dto: RefreshTokenDto) {
    const account = await this.findOwned(userId, dto.accountId);
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.socialAccount.update({
      where: { id: account.id },
      data: { accessToken: crypto.randomBytes(32).toString('hex'), tokenExpiresAt },
    });
    return { success: true, expiresAt: tokenExpiresAt, message: 'Token refreshed successfully' };
  }

  async sync(userId: string, id: string) {
    const account = await this.findOwned(userId, id);
    const updated = await this.prisma.socialAccount.update({
      where: { id: account.id },
      data: { lastSyncedAt: new Date() },
    });
    return this.sanitize(updated);
  }
}
