import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../shared/storage.service';
import { UpdateBrandProfileDto } from './dto/update-brand-profile.dto';

@Injectable()
export class BrandService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  getProfile(userId: string) {
    return this.prisma.brandProfile.findUniqueOrThrow({ where: { userId } });
  }

  updateProfile(userId: string, dto: UpdateBrandProfileDto) {
    return this.prisma.brandProfile.update({ where: { userId }, data: dto });
  }

  async uploadLogo(userId: string, file: Express.Multer.File) {
    const logoUrl = await this.storage.upload(file, `logos/${userId}`);
    await this.prisma.brandProfile.update({ where: { userId }, data: { logo: logoUrl } });
    return { logoUrl };
  }

  async uploadCover(userId: string, file: Express.Multer.File) {
    const coverImageUrl = await this.storage.upload(file, `covers/brand/${userId}`);
    await this.prisma.brandProfile.update({ where: { userId }, data: { coverImage: coverImageUrl } });
    return { coverImageUrl };
  }

  async uploadDocument(userId: string, type: 'registration_cert' | 'tax_compliance', file: Express.Multer.File) {
    const documentUrl = await this.storage.upload(file, `docs/${userId}/${type}`);
    const field = type === 'registration_cert' ? 'registrationCertUrl' : 'taxComplianceUrl';
    await this.prisma.brandProfile.update({ where: { userId }, data: { [field]: documentUrl } });
    return { documentUrl, type };
  }
}
