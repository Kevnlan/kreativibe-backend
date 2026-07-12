import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../shared/storage.service';
import { SubmitKycDto, ResubmitKycDto } from './dto/kyc.dto';

// Social handles live on CreatorProfile; everything else on CreatorKyc.
const SOCIAL_KEYS = [
  'instagram', 'instagramFollowers', 'tiktok', 'tiktokFollowers',
  'youtube', 'youtubeFollowers', 'facebook', 'twitter',
] as const;

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  private async creatorProfileId(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException({ message: 'Creator profile not found', code: 'CREATOR_PROFILE_NOT_FOUND' });
    return profile.id;
  }

  private splitFields(dto: SubmitKycDto | ResubmitKycDto) {
    const social: Record<string, any> = {};
    const kyc: Record<string, any> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      if ((SOCIAL_KEYS as readonly string[]).includes(key)) social[key] = value;
      else kyc[key] = value;
    }
    if (kyc.dateOfBirth) kyc.dateOfBirth = new Date(kyc.dateOfBirth);
    return { social, kyc };
  }

  async submit(userId: string, dto: SubmitKycDto) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const existing = await this.prisma.creatorKyc.findUnique({ where: { creatorProfileId } });
    if (existing && ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'].includes(existing.status)) {
      throw new ConflictException({ message: 'KYC already submitted', code: 'KYC_ALREADY_SUBMITTED' });
    }

    const { social, kyc } = this.splitFields(dto);
    const data = { ...kyc, status: 'SUBMITTED' as const, submittedAt: new Date() };

    await this.prisma.$transaction([
      this.prisma.creatorKyc.upsert({
        where: { creatorProfileId },
        create: { creatorProfileId, ...data } as Prisma.CreatorKycUncheckedCreateInput,
        update: data,
      }),
      this.prisma.creatorProfile.update({
        where: { id: creatorProfileId },
        data: { ...social, verificationStatus: 'PENDING' },
      }),
    ]);

    return { success: true, message: 'KYC submitted for review.', status: 'PENDING' };
  }

  async resubmit(userId: string, dto: ResubmitKycDto) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const existing = await this.prisma.creatorKyc.findUnique({ where: { creatorProfileId } });
    if (!existing || existing.status !== 'REJECTED') {
      throw new BadRequestException({ message: 'KYC can only be resubmitted after rejection', code: 'KYC_NOT_REJECTED' });
    }

    const { social, kyc } = this.splitFields(dto);
    await this.prisma.$transaction([
      this.prisma.creatorKyc.update({
        where: { creatorProfileId },
        data: { ...kyc, status: 'SUBMITTED', submittedAt: new Date(), adminComments: null },
      }),
      ...(Object.keys(social).length
        ? [this.prisma.creatorProfile.update({ where: { id: creatorProfileId }, data: social })]
        : []),
    ]);

    return { success: true, message: 'KYC resubmitted for review.', status: 'PENDING' };
  }

  async status(userId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const kyc = await this.prisma.creatorKyc.findUnique({ where: { creatorProfileId } });
    if (!kyc) {
      return { status: 'NOT_SUBMITTED', iprsStatus: 'PENDING', kraStatus: 'PENDING', adminComments: null, submittedAt: null, reviewedAt: null };
    }
    // SUBMITTED is surfaced to clients as PENDING per the contract.
    const status = kyc.status === 'SUBMITTED' ? 'PENDING' : kyc.status;
    return {
      status,
      iprsStatus: kyc.iprsStatus,
      kraStatus: kyc.kraStatus,
      adminComments: kyc.adminComments,
      submittedAt: kyc.submittedAt,
      reviewedAt: kyc.reviewedAt,
    };
  }

  async upload(userId: string, file: Express.Multer.File, purpose?: string) {
    if (!file) throw new BadRequestException({ message: 'No file provided', code: 'FILE_REQUIRED' });
    const slug = (purpose ?? 'document').toLowerCase();
    const url = await this.storage.upload(file, `uploads/${userId}/${slug}-${Date.now()}`);
    return { url };
  }
}
