import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../shared/storage.service';
import { SaveTaxInfoDto, GenerateReportDto } from './dto/tax.dto';

@Injectable()
export class TaxService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  private async creatorProfileId(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException({ message: 'Creator profile not found', code: 'CREATOR_PROFILE_NOT_FOUND' });
    return profile.id;
  }

  // Compliance checklist derived from the creator's KRA PIN + tax profile state.
  async compliance(userId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const [kyc, profile] = await Promise.all([
      this.prisma.creatorKyc.findUnique({ where: { creatorProfileId } }),
      this.prisma.taxProfile.findUnique({ where: { userId } }),
    ]);

    const hasKraPin = Boolean(profile?.kraPin || kyc?.kraPin);
    const items = [
      {
        id: 'kra-pin',
        name: 'KRA PIN Registration',
        description: 'Active KRA PIN on file',
        status: hasKraPin ? 'COMPLIANT' : 'PENDING',
        lastUpdated: profile?.updatedAt ?? kyc?.updatedAt ?? null,
        dueDate: null,
        actionRequired: !hasKraPin,
      },
      {
        id: 'annual-filing',
        name: 'Annual Filing',
        description: `${new Date().getFullYear() - 1} annual tax return`,
        status: 'PENDING',
        lastUpdated: null,
        dueDate: new Date(`${new Date().getFullYear()}-06-30T00:00:00Z`),
        actionRequired: true,
      },
    ];
    return { items };
  }

  async saveInfo(userId: string, dto: SaveTaxInfoDto) {
    await this.prisma.taxProfile.upsert({
      where: { userId },
      create: {
        userId,
        kraPin: dto.kraPin,
        taxResidency: dto.taxResidency,
        withholdingTaxOptIn: dto.withholdingTaxOptIn ?? false,
      },
      update: {
        kraPin: dto.kraPin,
        taxResidency: dto.taxResidency,
        ...(dto.withholdingTaxOptIn !== undefined ? { withholdingTaxOptIn: dto.withholdingTaxOptIn } : {}),
      },
    });
    return { success: true, message: 'Tax information saved.' };
  }

  // Aggregates tax records for the year into a downloadable report.
  async generateReport(userId: string, dto: GenerateReportDto) {
    const records = await this.prisma.taxRecord.findMany({
      where: { userId, period: { startsWith: String(dto.year) } },
      orderBy: { period: 'asc' },
    });

    const total = records.reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0));
    const payload = { year: dto.year, totalTax: total, records };

    const ext = dto.format.toLowerCase();
    const buffer = Buffer.from(JSON.stringify(payload, null, 2));
    const reportUrl = await this.storage.upload(
      { buffer, originalname: `tax-report-${dto.year}.${ext}`, mimetype: 'application/octet-stream' } as Express.Multer.File,
      `tax-reports/${userId}/tax-report-${dto.year}-${Date.now()}`,
    );

    return { reportUrl, generatedAt: new Date() };
  }

  async uploadDocument(userId: string, type: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException({ message: 'No file provided', code: 'FILE_REQUIRED' });
    const url = await this.storage.upload(file, `tax-documents/${userId}/${type}-${Date.now()}`);
    const doc = await this.prisma.taxDocument.create({ data: { userId, type, url } });
    return { id: doc.id, type: doc.type, url: doc.url, uploadedAt: doc.uploadedAt };
  }

  async listDocuments(userId: string) {
    const items = await this.prisma.taxDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });
    return { items };
  }

  async deleteDocument(userId: string, id: string) {
    const doc = await this.prisma.taxDocument.findFirst({ where: { id, userId } });
    if (!doc) throw new NotFoundException({ message: 'Document not found', code: 'TAX_DOC_NOT_FOUND' });
    await this.prisma.taxDocument.delete({ where: { id } });
    return { success: true };
  }
}
