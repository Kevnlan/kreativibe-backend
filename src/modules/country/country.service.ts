import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCountryDto, UpdateCountryDto, UpdateCountryConfigDto } from './dto/country.dto';

@Injectable()
export class CountryService {
  constructor(private prisma: PrismaService) {}

  // Public-facing shape — `id` doubles as the ISO code per the schema comment.
  private serialize(c: any) {
    return { ...c, code: c.id };
  }

  async list() {
    const items = await this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return { countries: items.map((c) => this.serialize(c)), total: items.length };
  }

  async get(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id } });
    if (!country) throw new NotFoundException({ message: 'Country not found', code: 'COUNTRY_NOT_FOUND' });
    return this.serialize(country);
  }

  async getConfig(id: string) {
    const country = await this.get(id);
    return country.config ?? {};
  }

  async create(dto: CreateCountryDto) {
    const existing = await this.prisma.country.findUnique({ where: { id: dto.code } });
    if (existing) throw new ConflictException({ message: 'Country already exists', code: 'COUNTRY_EXISTS' });

    const country = await this.prisma.country.create({
      data: {
        id: dto.code,
        name: dto.name,
        currency: dto.currency,
        currencySymbol: dto.currencySymbol ?? dto.currency,
        taxRate: dto.taxRate,
        isActive: dto.isActive ?? true,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
      },
    });
    return this.serialize(country);
  }

  async update(id: string, dto: UpdateCountryDto) {
    await this.get(id);
    const country = await this.prisma.country.update({
      where: { id },
      data: {
        name: dto.name,
        currency: dto.currency,
        currencySymbol: dto.currencySymbol,
        taxRate: dto.taxRate,
        isActive: dto.isActive,
        ...(dto.config !== undefined ? { config: dto.config as Prisma.InputJsonValue } : {}),
      },
    });
    return this.serialize(country);
  }

  // Soft delete — disable rather than drop so historical references stay valid.
  async remove(id: string) {
    await this.get(id);
    await this.prisma.country.update({ where: { id }, data: { isActive: false } });
  }

  async updateConfig(id: string, config: UpdateCountryConfigDto) {
    await this.get(id);
    const country = await this.prisma.country.update({
      where: { id },
      data: { config: config as Prisma.InputJsonValue },
    });
    return this.serialize(country);
  }
}
