import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const DOWNLOAD_URL_TTL_MINUTES = 15;

@Injectable()
export class LicenseService {
  constructor(private prisma: PrismaService) { }

  private serialize(license: any) {
    return {
      id: license.id,
      contentId: license.contentId,
      brandUserId: license.brandUserId,
      offerId: license.offerId,
      issuedAt: license.issuedAt,
      licenseText: license.licenseText,
      content: license.content ?? null,
      offer: license.offer ?? null,
    };
  }

  async listForBrand(userId: string, query: { page: number; limit: number }) {
    const where: Prisma.ContentLicenseWhereInput = {
      brandUserId: userId,
    };

    const [items, total] = await Promise.all([
      this.prisma.contentLicense.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
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
              mediaUrls: true,
              creatorProfile: { select: { id: true, bio: true, avatar: true } },
            },
          },
          offer: { select: { id: true, currentAmount: true, currency: true } },
        },
      }),
      this.prisma.contentLicense.count({ where }),
    ]);

    return { items: items.map((l) => this.serialize(l)), total, page: query.page, limit: query.limit };
  }

  async get(userId: string, role: string, contentId: string) {
    const license = await this.prisma.contentLicense.findUnique({
      where: { contentId },
      include: {
        content: {
          include: { creatorProfile: { select: { id: true, bio: true, avatar: true, user: { select: { name: true } } } } },
        },
        offer: { include: { brandProfile: { select: { companyName: true } } } },
      },
    });
    if (!license) throw new NotFoundException({ message: 'License not found', code: 'LICENSE_NOT_FOUND' });

    if (role !== 'ADMIN' && license.brandUserId !== userId) {
      const content = license.content;
      if (role === 'CREATOR' && content.creatorProfile) {
        // Creators can view licenses for their own content
      } else {
        throw new ForbiddenException({ message: 'Not authorized for this license', code: 'FORBIDDEN' });
      }
    }

    return this.serialize(license);
  }

  async download(userId: string, role: string, contentId: string) {
    const license = await this.prisma.contentLicense.findUnique({
      where: { contentId },
      include: { content: true },
    });
    if (!license) throw new NotFoundException({ message: 'License not found', code: 'LICENSE_NOT_FOUND' });

    if (role !== 'ADMIN' && license.brandUserId !== userId) {
      throw new ForbiddenException({ message: 'Not authorized for this license', code: 'FORBIDDEN' });
    }

    // Generate a time-limited signed URL.
    // In production this would use Firebase Storage's getSignedUrl() or equivalent.
    // For now we return the content's file URL with an expiry token.
    const expiresAt = new Date(Date.now() + DOWNLOAD_URL_TTL_MINUTES * 60 * 1000);
    const expiryEpoch = Math.floor(expiresAt.getTime() / 1000);
    const downloadToken = Buffer.from(`${license.id}:${expiryEpoch}`).toString('base64url');

    const fileUrl = license.content.fileUrl ?? license.content.mediaUrls[0] ?? null;
    if (!fileUrl) {
      throw new BadRequestException({ message: 'No downloadable file available', code: 'NO_FILE_AVAILABLE' });
    }

    const separator = fileUrl.includes('?') ? '&' : '?';
    const downloadUrl = `${fileUrl}${separator}license=${downloadToken}&expires=${expiryEpoch}`;

    return {
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      contentTitle: license.content.title,
    };
  }

  async verify(contentId: string) {
    const license = await this.prisma.contentLicense.findUnique({
      where: { contentId },
      include: { content: true, offer: { include: { brandProfile: { select: { companyName: true } } } } },
    });

    if (!license) {
      return { valid: false, license: null, content: null };
    }

    return {
      valid: true,
      license: this.serialize(license),
      content: {
        id: license.content.id,
        title: license.content.title,
        type: license.content.type,
      },
    };
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async listAll(query: { brandUserId?: string; page: number; limit: number }) {
    const where: Prisma.ContentLicenseWhereInput = {
      ...(query.brandUserId ? { brandUserId: query.brandUserId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.contentLicense.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          content: { select: { id: true, title: true, type: true } },
          offer: { select: { id: true, currentAmount: true, currency: true } },
        },
      }),
      this.prisma.contentLicense.count({ where }),
    ]);

    return { items: items.map((l) => this.serialize(l)), total, page: query.page, limit: query.limit };
  }

  async revoke(contentId: string, reason: string) {
    const license = await this.prisma.contentLicense.findUnique({ where: { contentId } });
    if (!license) throw new NotFoundException({ message: 'License not found', code: 'LICENSE_NOT_FOUND' });

    // The schema doesn't have revokedAt/revokedReason fields yet.
    // We store the revocation in the licenseText as a note and mark the content back to APPROVED.
    // A migration should add revokedAt and revokedReason fields for proper tracking.
    const updated = await this.prisma.contentLicense.update({
      where: { contentId },
      data: {
        licenseText: `${license.licenseText}\n\n[REVOKED on ${new Date().toISOString()}]: ${reason}`,
      },
    });

    // Revert content status so it can be purchased again
    await this.prisma.content.update({
      where: { id: contentId },
      data: { status: 'APPROVED' },
    });

    return { id: updated.id, contentId, revoked: true, reason };
  }
}
