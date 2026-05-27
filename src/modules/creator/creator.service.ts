import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../shared/storage.service';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';

@Injectable()
export class CreatorService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  getProfile(userId: string) {
    return this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
  }

  updateProfile(userId: string, dto: UpdateCreatorProfileDto) {
    const { pricing, ...rest } = dto;
    return this.prisma.creatorProfile.update({
      where: { userId },
      data: { ...rest, ...(pricing !== undefined ? { pricingJson: pricing } : {}) },
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const avatarUrl = await this.storage.upload(file, `avatars/${userId}`);
    await this.prisma.creatorProfile.update({ where: { userId }, data: { avatar: avatarUrl } });
    return { avatarUrl };
  }

  async uploadCover(userId: string, file: Express.Multer.File) {
    const coverImageUrl = await this.storage.upload(file, `covers/${userId}`);
    await this.prisma.creatorProfile.update({ where: { userId }, data: { coverImage: coverImageUrl } });
    return { coverImageUrl };
  }
}
