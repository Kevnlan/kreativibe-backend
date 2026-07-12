import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) {
      settings = await this.prisma.userSettings.create({ data: { userId } });
    }
    return settings;
  }

  async update(userId: string, dto: UpdateSettingsDto) {
    const settings = await this.getOrCreate(userId);

    return this.prisma.userSettings.update({
      where: { userId },
      data: {
        ...(dto.emailFrequency !== undefined ? { emailFrequency: dto.emailFrequency } : {}),
        ...(dto.pushEnabled !== undefined ? { pushEnabled: dto.pushEnabled } : {}),
        ...(dto.smsEnabled !== undefined ? { smsEnabled: dto.smsEnabled } : {}),
        ...(dto.notificationTypes !== undefined ? { notificationTypes: dto.notificationTypes } : {}),
        ...(dto.profileVisible !== undefined ? { profileVisible: dto.profileVisible } : {}),
        ...(dto.showEarnings !== undefined ? { showEarnings: dto.showEarnings } : {}),
        ...(dto.allowDirectMessages !== undefined ? { allowDirectMessages: dto.allowDirectMessages } : {}),
        ...(dto.showInSearch !== undefined ? { showInSearch: dto.showInSearch } : {}),
        ...(dto.preferredLanguage !== undefined ? { preferredLanguage: dto.preferredLanguage } : {}),
        ...(dto.preferredCurrency !== undefined ? { preferredCurrency: dto.preferredCurrency } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
      },
    });
  }

  async reset(userId: string) {
    await this.prisma.userSettings.deleteMany({ where: { userId } });
    return this.getOrCreate(userId);
  }
}
