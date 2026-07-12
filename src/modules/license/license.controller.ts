import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LicenseService } from './license.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  listLicensesSchema, ListLicensesDto,
  licenseContentSchema, LicenseContentDto,
  adminListLicensesSchema, AdminListLicensesDto,
  revokeLicenseSchema, RevokeLicenseDto,
} from './dto/license.dto';

@Controller('licenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LicenseController {
  constructor(private licenses: LicenseService) {}

  @Post('list')
  @Roles(Role.BRAND)
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(listLicensesSchema)) query: ListLicensesDto) {
    return this.licenses.listForBrand(user.id, query);
  }

  @Post('get')
  @Roles(Role.BRAND, Role.CREATOR, Role.ADMIN)
  get(@CurrentUser() user: any, @Body(new ZodValidationPipe(licenseContentSchema)) dto: LicenseContentDto) {
    return this.licenses.get(user.id, user.role, dto.contentId);
  }

  @Post('download')
  @Roles(Role.BRAND, Role.ADMIN)
  download(@CurrentUser() user: any, @Body(new ZodValidationPipe(licenseContentSchema)) dto: LicenseContentDto) {
    return this.licenses.download(user.id, user.role, dto.contentId);
  }

  @Post('verify')
  @Roles(Role.BRAND, Role.CREATOR, Role.ADMIN)
  verify(@Body(new ZodValidationPipe(licenseContentSchema)) dto: LicenseContentDto) {
    return this.licenses.verify(dto.contentId);
  }
}

@Controller('admin/licenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminLicenseController {
  constructor(private licenses: LicenseService) {}

  @Post('list')
  list(@Body(new ZodValidationPipe(adminListLicensesSchema)) query: AdminListLicensesDto) {
    return this.licenses.listAll(query);
  }

  @Post('revoke')
  revoke(@Body(new ZodValidationPipe(revokeLicenseSchema)) dto: RevokeLicenseDto) {
    return this.licenses.revoke(dto.contentId, dto.reason);
  }
}
