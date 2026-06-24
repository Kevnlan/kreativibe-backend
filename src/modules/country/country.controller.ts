import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CountryService } from './country.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createCountrySchema, CreateCountryDto,
  updateCountrySchema, UpdateCountryDto,
  updateCountryConfigSchema, UpdateCountryConfigDto,
} from './dto/country.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

// Public + authenticated reads. POST-only per platform security convention.
@Controller('countries')
export class CountryController {
  constructor(private countries: CountryService) {}

  @Post('list')
  list() {
    return this.countries.list();
  }

  @Post('get')
  get(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.countries.get(dto.id);
  }

  @Post('config')
  @UseGuards(JwtAuthGuard)
  getConfig(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.countries.getConfig(dto.id);
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

  @Post('update')
  update(@Body(new ZodValidationPipe(updateCountrySchema)) dto: UpdateCountryDto) {
    return this.countries.update(dto.id, dto);
  }

  @Post('delete')
  async remove(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    await this.countries.remove(dto.id);
    return { message: 'Country disabled' };
  }

  @Post('config/update')
  updateConfig(@Body(new ZodValidationPipe(updateCountryConfigSchema)) dto: UpdateCountryConfigDto) {
    return this.countries.updateConfig(dto.id, dto);
  }
}
