import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CountryService } from './country.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createCountrySchema, CreateCountryDto,
  updateCountrySchema, UpdateCountryDto,
  countryConfigSchema, UpdateCountryConfigDto,
} from './dto/country.dto';

// Public + authenticated reads. POST-only per platform security convention.
@Controller('countries')
export class CountryController {
  constructor(private countries: CountryService) {}

  @Post('list')
  list() {
    return this.countries.list();
  }

  @Post(':id/get')
  get(@Param('id') id: string) {
    return this.countries.get(id);
  }

  @Post(':id/config')
  @UseGuards(JwtAuthGuard)
  getConfig(@Param('id') id: string) {
    return this.countries.getConfig(id);
  }
}

// Admin management surface.
@Controller('admin/countries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminCountryController {
  constructor(private countries: CountryService) {}

  @Post('create')
  create(@Body(new ZodValidationPipe(createCountrySchema)) dto: CreateCountryDto) {
    return this.countries.create(dto);
  }

  @Post(':id/update')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCountrySchema)) dto: UpdateCountryDto,
  ) {
    return this.countries.update(id, dto);
  }

  @Post(':id/delete')
  async remove(@Param('id') id: string) {
    await this.countries.remove(id);
    return { message: 'Country disabled' };
  }

  @Post(':id/config/update')
  updateConfig(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(countryConfigSchema)) dto: UpdateCountryConfigDto,
  ) {
    return this.countries.updateConfig(id, dto);
  }
}
